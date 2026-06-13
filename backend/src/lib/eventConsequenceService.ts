import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import {
  collectConsequencePageIds,
  formatConsequenceDetailLine,
  formatPendingConfirmation,
} from '../../../shared/eventConsequencePresentation.js';
import {
  mapRouteChangeToEconomicSignal,
  type EventConsequence,
  type EventConsequenceApplyResult,
  type EventConsequencePreviewRow,
  type HavenThreatPayload,
  type QuestHookPayload,
  type RouteChangePayload,
} from '../../../shared/eventConsequence.js';
import { applyCanonicalWorldEffect } from './canonicalWorldEffect.js';
import { appendLocationDowntimeAlteration } from './appendLocationDowntimeAlteration.js';
import { applyHavenThreatPatch, resolveWikiPageTitles } from './downtimeHavenService.js';
import { projectTradeRouteFromEconomicSignal } from './mapOverlayProjectionService.js';
import { resolveCampaignChronologyNow } from './chronologyDefaults.js';
import {
  loadEventConsequencesForCalendarEvent,
  newApplicationRunId,
  saveEventConsequences,
} from './eventConsequenceStore.js';
import { prisma } from './prisma.js';

export type ApplyEventConsequencesInput = {
  campaignId: string;
  calendarEventId: string;
  actorUserId: string;
  atEpochMinute: string;
  previewOnly?: boolean;
  applicationRunId?: string;
};

type RowDispatchResult = {
  projectedState: 'complete' | 'partial' | 'blocked';
  summary: string;
  warnings: string[];
  pendingConfirmations: string[];
  applied: boolean;
};

function narrativeSummary(
  row: EventConsequence,
  titles: Map<string, string>,
  projectedState: RowDispatchResult['projectedState'],
): string {
  return formatConsequenceDetailLine(row, titles, { projectedState });
}

async function dispatchConsequence(
  tx: Prisma.TransactionClient,
  input: ApplyEventConsequencesInput,
  row: EventConsequence,
  previewOnly: boolean,
  titles: Map<string, string>,
): Promise<RowDispatchResult> {
  const warnings: string[] = [];
  const pendingConfirmations: string[] = [];
  const effectiveDate = await resolveCampaignChronologyNow(input.campaignId);
  const ctx = {
    campaignId: input.campaignId,
    actorUserId: input.actorUserId,
    canManage: true,
    atEpochMinute: input.atEpochMinute,
    effectiveDate,
    sourceEventIds: [input.calendarEventId, row.id],
  };

  switch (row.kind) {
    case 'quest_hook': {
      const pageId = row.targets?.pageIds?.[0];
      if (!pageId) {
        return {
          projectedState: 'blocked',
          summary: narrativeSummary(row, titles, 'blocked'),
          warnings: ['quest_hook requires targets.pageIds[0]'],
          pendingConfirmations: [],
          applied: false,
        };
      }
      const payload = row.payload as QuestHookPayload;
      const effect =
        payload.mode === 'discover_quest'
          ? ({ type: 'discover_quest' as const, questPageId: pageId })
          : ({ type: 'discover_wiki_page' as const, pageId });
      if (!previewOnly) {
        await applyCanonicalWorldEffect(effect, ctx, tx);
      }
      return {
        projectedState: 'complete',
        summary: narrativeSummary(row, titles, 'complete'),
        warnings,
        pendingConfirmations,
        applied: true,
      };
    }
    case 'alter_location': {
      const locationPageId =
        row.targets?.locationIds?.[0] ?? row.targets?.pageIds?.[0];
      if (!locationPageId) {
        return {
          projectedState: 'blocked',
          summary: narrativeSummary(row, titles, 'blocked'),
          warnings: ['alter_location requires a location page target'],
          pendingConfirmations: [],
          applied: false,
        };
      }
      if (!previewOnly) {
        const ok = await appendLocationDowntimeAlteration(tx, {
          campaignId: input.campaignId,
          locationPageId,
          entry: {
            id: randomUUID(),
            sourceKind: 'event',
            sourceEventId: input.calendarEventId,
            outcomeId: row.id,
            description: row.description ?? null,
            atEpochMinute: input.atEpochMinute,
            appliedAt: new Date().toISOString(),
          },
        });
        if (!ok) {
          return {
            projectedState: 'blocked',
            summary: narrativeSummary(row, titles, 'blocked'),
            warnings: ['Target location page not found in campaign'],
            pendingConfirmations: [],
            applied: false,
          };
        }
      }
      return {
        projectedState: 'complete',
        summary: narrativeSummary(row, titles, 'complete'),
        warnings,
        pendingConfirmations,
        applied: true,
      };
    }
    case 'route_change': {
      const locationIds = row.targets?.locationIds ?? [];
      const fromId = locationIds[0];
      const toId = locationIds[1];
      if (!fromId || !toId) {
        return {
          projectedState: 'blocked',
          summary: narrativeSummary(row, titles, 'blocked'),
          warnings: ['route_change requires two targets.locationIds entries'],
          pendingConfirmations: [],
          applied: false,
        };
      }
      const payload = row.payload as RouteChangePayload;
      const mapped = mapRouteChangeToEconomicSignal(payload);
      if (previewOnly) {
        return {
          projectedState: 'complete',
          summary: narrativeSummary(row, titles, 'complete'),
          warnings,
          pendingConfirmations: [
            formatPendingConfirmation(
              'Trade route overlay (DRAFT) between locations — confirm in map editor after apply',
              titles,
            ),
          ],
          applied: true,
        };
      }
      const overlayId = await projectTradeRouteFromEconomicSignal(
        input.campaignId,
        {
          id: row.id,
          pageId: fromId,
          signal: mapped.signal,
          trafficWeight: mapped.trafficWeight,
        },
        input.atEpochMinute,
        tx,
        toId,
      );
      if (!overlayId) {
        return {
          projectedState: 'blocked',
          summary: narrativeSummary(row, titles, 'blocked'),
          warnings: [
            'Could not project route overlay — locations may not share a map',
          ],
          pendingConfirmations: [],
          applied: false,
        };
      }
      pendingConfirmations.push(
        formatPendingConfirmation(
          `Trade route overlay ${overlayId} projected (DRAFT) — confirm in map editor`,
          titles,
        ),
      );
      return {
        projectedState: 'complete',
        summary: narrativeSummary(row, titles, 'complete'),
        warnings,
        pendingConfirmations,
        applied: true,
      };
    }
    case 'haven_threat': {
      const havenWikiPageId = row.targets?.havenIds?.[0];
      if (!havenWikiPageId) {
        return {
          projectedState: 'blocked',
          summary: narrativeSummary(row, titles, 'blocked'),
          warnings: ['haven_threat requires targets.havenIds[0]'],
          pendingConfirmations: [],
          applied: false,
        };
      }
      const payload = row.payload as HavenThreatPayload;
      if (!payload.label?.trim()) {
        return {
          projectedState: 'blocked',
          summary: narrativeSummary(row, titles, 'blocked'),
          warnings: ['haven_threat requires payload.label'],
          pendingConfirmations: [],
          applied: false,
        };
      }
      if (!previewOnly) {
        const ok = await applyHavenThreatPatch(tx, {
          campaignId: input.campaignId,
          havenWikiPageId,
          actorUserId: input.actorUserId,
          atEpochMinute: input.atEpochMinute,
          activitySummary:
            row.description?.trim() || `Threat from world event: ${payload.label}`,
          origin: 'event_consequence',
          sourceEventId: input.calendarEventId,
          threat: {
            label: payload.label,
            severity: payload.severity ?? null,
            description: payload.description ?? null,
          },
        });
        if (!ok) {
          return {
            projectedState: 'blocked',
            summary: narrativeSummary(row, titles, 'blocked'),
            warnings: ['Linked haven row not found'],
            pendingConfirmations: [],
            applied: false,
          };
        }
      }
      return {
        projectedState: 'complete',
        summary: narrativeSummary(row, titles, 'complete'),
        warnings,
        pendingConfirmations,
        applied: true,
      };
    }
    default:
      return {
        projectedState: 'blocked',
        summary: 'Unknown consequence kind',
        warnings: [`Unsupported kind: ${row.kind}`],
        pendingConfirmations: [],
        applied: false,
      };
  }
}

function buildNextApplication(
  row: EventConsequence,
  dispatch: RowDispatchResult,
  input: ApplyEventConsequencesInput,
  previewOnly: boolean,
): EventConsequence['application'] {
  if (previewOnly) {
    return row.application ?? { state: 'pending' };
  }
  return {
    state: dispatch.projectedState === 'complete' ? 'complete' : dispatch.projectedState,
    appliedAtEpochMinute: input.atEpochMinute,
    applicationRunId: input.applicationRunId,
    source: 'manual_apply',
    warnings: dispatch.warnings.length ? dispatch.warnings : undefined,
    pendingConfirmations: dispatch.pendingConfirmations.length
      ? dispatch.pendingConfirmations
      : undefined,
  };
}

export async function applyEventConsequences(
  tx: Prisma.TransactionClient,
  input: ApplyEventConsequencesInput,
): Promise<EventConsequenceApplyResult> {
  const previewOnly = input.previewOnly === true;
  const applicationRunId = input.applicationRunId ?? newApplicationRunId();

  const loaded = await loadEventConsequencesForCalendarEvent(
    tx,
    input.campaignId,
    input.calendarEventId,
  );

  const pageIds = [
    ...new Set(loaded.consequences.flatMap((row) => collectConsequencePageIds(row))),
  ];
  const titles = await resolveWikiPageTitles(input.campaignId, pageIds);

  let appliedCount = 0;
  let partialCount = 0;
  let blockedCount = 0;
  let skippedCount = 0;
  const previewRows: EventConsequencePreviewRow[] = [];
  const aggregateWarnings: string[] = [];
  const allPendingConfirmations: string[] = [];

  const nextConsequences: EventConsequence[] = [];

  for (const row of loaded.consequences) {
    const currentState = row.application?.state ?? 'pending';
    if (currentState === 'complete') {
      nextConsequences.push(row);
      skippedCount += 1;
      continue;
    }

    const dispatch = await dispatchConsequence(tx, input, row, previewOnly, titles);
    previewRows.push({
      consequenceId: row.id,
      kind: row.kind,
      projectedState: dispatch.projectedState,
      summary: dispatch.summary,
      warnings: dispatch.warnings,
      pendingConfirmations: dispatch.pendingConfirmations,
    });
    aggregateWarnings.push(...dispatch.warnings);
    allPendingConfirmations.push(...dispatch.pendingConfirmations);

    if (previewOnly) {
      nextConsequences.push(row);
      if (dispatch.projectedState === 'complete') appliedCount += 1;
      else if (dispatch.projectedState === 'partial') partialCount += 1;
      else blockedCount += 1;
      continue;
    }

    const nextRow: EventConsequence = {
      ...row,
      application: buildNextApplication(row, dispatch, { ...input, applicationRunId }, false),
    };
    nextConsequences.push(nextRow);

    if (dispatch.projectedState === 'complete') appliedCount += 1;
    else if (dispatch.projectedState === 'partial') partialCount += 1;
    else blockedCount += 1;
  }

  if (!previewOnly) {
    const event = await tx.calendarEvent.findFirst({
      where: { id: input.calendarEventId, calendar: { campaignId: input.campaignId } },
      select: { title: true },
    });
    await saveEventConsequences(tx, {
      campaignId: input.campaignId,
      calendarEventId: input.calendarEventId,
      consequences: nextConsequences,
      actorUserId: input.actorUserId,
      calendarEventTitle: event?.title,
    });
  }

  return {
    previewOnly,
    applicationRunId,
    appliedCount,
    partialCount,
    blockedCount,
    skippedCount,
    consequences: previewOnly ? loaded.consequences : nextConsequences,
    pendingConfirmations: [
      ...new Set(allPendingConfirmations.map((line) => formatPendingConfirmation(line, titles))),
    ],
    previewRows,
    aggregateWarnings: [...new Set(aggregateWarnings)],
  };
}

export async function applyEventConsequencesStandalone(
  input: ApplyEventConsequencesInput,
): Promise<EventConsequenceApplyResult> {
  return prisma.$transaction((tx) => applyEventConsequences(tx, input));
}
