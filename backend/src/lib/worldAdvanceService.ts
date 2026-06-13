import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import {
  WORLD_ADVANCE_CATEGORY,
  WORLD_ADVANCE_VERSION,
  parseWorldAdvanceBatchPayload,
  parseWorldAdvanceBatchRequest,
  type WorldAdvanceBatchRequest,
  type WorldAdvanceBatchSummary,
  type WorldAdvancePreview,
  type WorldAdvanceApplyResult,
  type WorldAdvanceEffect,
} from '../../../shared/worldAdvance.js';
import { deriveWorldConditionsAt } from '../../../shared/worldConditionSurfaces.js';
import { synthesizeWorldAdvanceNarrative } from '../../../shared/worldAdvanceSynthesis.js';
import { prisma } from './prisma.js';
import { buildCalendarStates, serializeEpochMinute } from './timeTracking.js';
import { resolveCampaignChronologyNow } from './chronologyDefaults.js';
import { collectPageIdsFromEffect, effectToConditionDeriveRow } from '../../../shared/worldAdvancePreview.js';
import {
  applyWorldAdvanceEffect,
  resolveRegionPageIdForLocation,
} from './worldAdvanceEffects.js';
import {
  dispatchDomainEvent,
  CoreDomainEvents,
  toCalendarAdvancedDto,
} from './domainEvents/index.js';
import { computeNextEpochMinute } from './computeTimeAdvance.js';
import {
  buildGlobalTimeAdvanceContext,
  runGlobalTimeHooks,
} from './globalTimeHooks/index.js';

async function ensureEventCategory(
  campaignId: string,
  name: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<string> {
  const existing = await db.calendarEventCategory.findFirst({
    where: { campaignId, name },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await db.calendarEventCategory.create({
    data: { campaignId, name, color: '#4b5563' },
  });
  return created.id;
}

async function resolveMasterCalendarId(campaignId: string): Promise<string | null> {
  const cal = await prisma.fantasyCalendar.findFirst({
    where: { campaignId },
    orderBy: [{ isMasterTime: 'desc' }, { name: 'asc' }],
    select: { id: true },
  });
  return cal?.id ?? null;
}

async function computeEpochAfterAdvance(
  campaignId: string,
  current: bigint,
  advanceTime?: WorldAdvanceBatchRequest['advanceTime'],
): Promise<{ nextEpochMinute: bigint; actualMinuteDelta: bigint }> {
  if (!advanceTime) {
    return { nextEpochMinute: current, actualMinuteDelta: 0n };
  }
  const result = await computeNextEpochMinute({
    campaignId,
    currentEpochMinute: current,
    amount: advanceTime.amount,
    unit: advanceTime.unit,
  });
  return {
    nextEpochMinute: result.nextEpochMinute,
    actualMinuteDelta: result.actualMinuteDelta,
  };
}

async function loadPageTitles(
  campaignId: string,
  pageIds: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(pageIds.filter(Boolean))];
  if (!unique.length) return new Map();
  const pages = await prisma.wikiPage.findMany({
    where: { campaignId, id: { in: unique } },
    select: { id: true, title: true },
  });
  return new Map(pages.map((p) => [p.id, p.title]));
}

async function buildAsOfLabel(
  campaignId: string,
  epochMinute: bigint,
): Promise<string | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      fantasyCalendars: {
        orderBy: [{ isMasterTime: 'desc' }, { name: 'asc' }],
      },
    },
  });
  if (!campaign) return null;
  const states = buildCalendarStates(epochMinute, campaign.fantasyCalendars);
  const master = states.find((c) => c.isMasterTime) ?? states[0];
  if (!master) return null;
  const season = master.state.seasonName;
  const month = master.state.monthName ?? `Month ${master.state.monthIndex + 1}`;
  return `${season ? `${season}, ` : ''}${month} ${master.state.year}`;
}

async function buildPreviewProjection(
  campaignId: string,
  request: WorldAdvanceBatchRequest,
  projectedEpoch: bigint,
  dryRun: boolean,
): Promise<WorldAdvancePreview> {
  const asOfEpochMinute = (
    await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { currentEpochMinute: true },
    })
  )?.currentEpochMinute ?? 0n;

  const effectiveDate = await resolveCampaignChronologyNow(campaignId);
  const effectPreviews = [];
  const deriveRows = [];
  const pageIds: string[] = [];
  const warnings: string[] = [];

  for (const effect of request.effects) {
    pageIds.push(
      ...collectPageIdsFromEffect(effect),
    );
    if (dryRun) {
      const result = await previewSingleEffect(campaignId, effect, {
        atEpochMinute: projectedEpoch.toString(),
        effectiveDate,
      });
      effectPreviews.push({
        effectId: effect.id,
        domain: effect.domain,
        type: effect.type,
        summary: result.summary,
        warnings: result.warnings,
        pendingConfirmations: result.pendingConfirmations,
      });
      warnings.push(...result.warnings);
    } else {
      effectPreviews.push({
        effectId: effect.id,
        domain: effect.domain,
        type: effect.type,
        summary: `${effect.type} (pending apply)`,
        warnings: [],
        pendingConfirmations:
          effect.type === 'suggest_border_keyframe'
            ? ['Border keyframe requires GM confirmation in map editor']
            : [],
      });
    }
    const regionId = await regionIdForEffect(campaignId, effect);
    deriveRows.push(effectToConditionDeriveRow(effect, regionId));
  }

  const pageTitles = await loadPageTitles(campaignId, pageIds);
  const regionLabels = new Map<string, string>();
  for (const [id, title] of pageTitles) {
    regionLabels.set(id, title);
  }

  const conditionSurfaces = deriveWorldConditionsAt({
    asOfEpochMinute: projectedEpoch.toString(),
    effects: deriveRows,
    regionLabels,
  });

  const asOfLabel = await buildAsOfLabel(campaignId, projectedEpoch);
  const seasonLabel = asOfLabel;

  const narrativeSynthesis = synthesizeWorldAdvanceNarrative({
    asOfLabel,
    effects: request.effects,
    conditionSurfaces,
    pageTitles,
    seasonLabel,
  });

  return {
    version: WORLD_ADVANCE_VERSION,
    asOfEpochMinute: serializeEpochMinute(asOfEpochMinute),
    asOfLabel: await buildAsOfLabel(campaignId, asOfEpochMinute),
    projectedEpochMinute: serializeEpochMinute(projectedEpoch),
    effectPreviews,
    conditionSurfaces,
    narrativeSynthesis,
    warnings,
  };
}


async function regionIdForEffect(
  campaignId: string,
  effect: WorldAdvanceEffect,
): Promise<string | null> {
  switch (effect.type) {
    case 'territory_pressure':
      return effect.regionPageId ?? null;
    case 'economic_signal':
      if (effect.targetKind === 'location') {
        return resolveRegionPageIdForLocation(campaignId, effect.pageId, prisma);
      }
      return null;
    case 'conflict_front':
      return effect.regionPageIds?.[0] ?? null;
    case 'record_season_context':
      return effect.regionPageId ?? null;
    case 'append_location_event':
      return resolveRegionPageIdForLocation(
        campaignId,
        effect.locationPageId,
        prisma,
      );
    case 'displacement':
      if (effect.toLocationPageId) {
        return resolveRegionPageIdForLocation(
          campaignId,
          effect.toLocationPageId,
          prisma,
        );
      }
      return null;
    default:
      return null;
  }
}

async function previewSingleEffect(
  campaignId: string,
  effect: WorldAdvanceEffect,
  ctx: { atEpochMinute: string; effectiveDate: Awaited<ReturnType<typeof resolveCampaignChronologyNow>> },
): Promise<{ summary: string; warnings: string[]; pendingConfirmations: string[] }> {
  const warnings: string[] = [];
  const pendingConfirmations: string[] = [];

  switch (effect.type) {
    case 'suggest_border_keyframe': {
      const obj = await prisma.mapSceneObject.findFirst({
        where: { id: effect.sceneObjectId, campaignId },
        select: { id: true },
      });
      if (!obj) warnings.push(`Map object ${effect.sceneObjectId} not found`);
      else {
        pendingConfirmations.push('Border keyframe suggestion — confirm in map editor');
      }
      return {
        summary: 'Will suggest border keyframe',
        warnings,
        pendingConfirmations,
      };
    }
    case 'append_org_relation_event': {
      const org = await prisma.wikiPage.findFirst({
        where: { id: effect.orgPageId, campaignId },
        select: { id: true },
      });
      if (!org) warnings.push('Source org not found');
      return {
        summary: `Append ${effect.stance} relation event`,
        warnings,
        pendingConfirmations,
      };
    }
    default:
      return {
        summary: `Apply ${effect.type}`,
        warnings,
        pendingConfirmations,
      };
  }
}

export async function previewWorldAdvance(
  campaignId: string,
  body: unknown,
): Promise<WorldAdvancePreview | null> {
  const request = parseWorldAdvanceBatchRequest(body);
  if (!request) return null;
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { currentEpochMinute: true },
  });
  if (!campaign) return null;
  const projected = await computeEpochAfterAdvance(
    campaignId,
    campaign.currentEpochMinute,
    request.advanceTime,
  );
  return buildPreviewProjection(campaignId, request, projected.nextEpochMinute, true);
}

async function hasWorldAdvanceReceipt(
  campaignId: string,
  idempotencyKey: string,
  db: Prisma.TransactionClient,
): Promise<boolean> {
  const row = await db.worldAdvanceReceipt.findUnique({
    where: { campaignId_idempotencyKey: { campaignId, idempotencyKey } },
    select: { id: true },
  });
  return Boolean(row);
}

export async function applyWorldAdvance(
  campaignId: string,
  actorUserId: string,
  body: unknown,
): Promise<WorldAdvanceApplyResult | null> {
  const request = parseWorldAdvanceBatchRequest(body);
  if (!request) return null;

  const batchId = request.batchIdempotencyKey ?? randomUUID();
  const calendarId = await resolveMasterCalendarId(campaignId);
  if (!calendarId) {
    throw new Error('NO_MASTER_CALENDAR');
  }

  const txResult = await prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.findUnique({
      where: { id: campaignId },
      select: { currentEpochMinute: true },
    });
    if (!campaign) return null;

    const previousEpochMinute = campaign.currentEpochMinute;
    const advanceProjection = await computeEpochAfterAdvance(
      campaignId,
      previousEpochMinute,
      request.advanceTime,
    );
    const nextEpochMinute = advanceProjection.nextEpochMinute;

    if (nextEpochMinute !== previousEpochMinute) {
      await tx.campaign.update({
        where: { id: campaignId },
        data: { currentEpochMinute: nextEpochMinute },
      });

      const advancedBy = request.advanceTime
        ? {
            amount: request.advanceTime.amount,
            unit: request.advanceTime.unit,
          }
        : {
            amount: Number(advanceProjection.actualMinuteDelta),
            unit: 'minutes' as const,
          };

      const hookContext = buildGlobalTimeAdvanceContext({
        campaignId,
        previousEpochMinute,
        nextEpochMinute,
        advancedBy,
        source: 'world_advance',
        actorUserId,
        batchId,
      });
      await runGlobalTimeHooks(tx, hookContext);
    }

    const effectiveDate = await resolveCampaignChronologyNow(campaignId);
    let appliedCount = 0;
    let skippedCount = 0;
    const receiptKeys: string[] = [];

    const categoryId = await ensureEventCategory(campaignId, WORLD_ADVANCE_CATEGORY, tx);

    const chronologyEvent = await tx.calendarEvent.create({
      data: {
        calendarId,
        categoryId,
        visibility: 'DM_ONLY',
        title: 'World advance',
        description: JSON.stringify({
          version: WORLD_ADVANCE_VERSION,
          batchId,
          actorUserId,
          effects: request.effects,
          note: request.note,
          advanceTime: request.advanceTime,
          previousEpochMinute: serializeEpochMinute(previousEpochMinute),
          nextEpochMinute: serializeEpochMinute(nextEpochMinute),
          appliedCount: 0,
          skippedCount: 0,
        }),
        targetEpochMinute: nextEpochMinute,
      },
    });

    const ctx = {
      campaignId,
      actorUserId,
      canManage: true,
      atEpochMinute: serializeEpochMinute(nextEpochMinute),
      effectiveDate,
      sourceEventIds: [chronologyEvent.id],
    };

    for (const effect of request.effects) {
      const idempotencyKey = `${batchId}:${effect.id}`;
      if (await hasWorldAdvanceReceipt(campaignId, idempotencyKey, tx)) {
        skippedCount += 1;
        continue;
      }
      await applyWorldAdvanceEffect(effect, ctx, tx);
      await tx.worldAdvanceReceipt.create({
        data: {
          campaignId,
          batchId,
          effectId: effect.id,
          idempotencyKey,
          chronologyEventId: chronologyEvent.id,
        },
      });
      receiptKeys.push(idempotencyKey);
      appliedCount += 1;
    }

    const preview = await buildPreviewProjection(
      campaignId,
      request,
      nextEpochMinute,
      false,
    );

    const payload = {
      version: WORLD_ADVANCE_VERSION,
      batchId,
      actorUserId,
      effects: request.effects,
      note: request.note,
      advanceTime: request.advanceTime,
      previousEpochMinute: serializeEpochMinute(previousEpochMinute),
      nextEpochMinute: serializeEpochMinute(nextEpochMinute),
      appliedCount,
      skippedCount,
      synthesisProjection: preview.narrativeSynthesis,
    };

    await tx.calendarEvent.update({
      where: { id: chronologyEvent.id },
      data: { description: JSON.stringify(payload) },
    });

    return {
      result: {
        ...preview,
        batchId,
        chronologyEventId: chronologyEvent.id,
        appliedCount,
        skippedCount,
        receiptKeys,
      },
      previousEpochMinute,
      nextEpochMinute,
      actualMinuteDelta: advanceProjection.actualMinuteDelta,
    };
  }, { timeout: 120_000 });

  if (!txResult) return null;

  dispatchDomainEvent({
    type: CoreDomainEvents.WORLD_ADVANCED,
    campaignId,
    payload: {
      batchId,
      chronologyEventId: txResult.result.chronologyEventId,
      appliedCount: txResult.result.appliedCount,
      skippedCount: txResult.result.skippedCount,
      nextEpochMinute: serializeEpochMinute(txResult.nextEpochMinute),
    },
  });

  if (
    request.advanceTime &&
    txResult.nextEpochMinute !== txResult.previousEpochMinute
  ) {
    dispatchDomainEvent({
      type: CoreDomainEvents.CALENDAR_ADVANCED,
      campaignId,
      payload: toCalendarAdvancedDto({
        campaignId,
        previousEpochMinute: txResult.previousEpochMinute,
        nextEpochMinute: txResult.nextEpochMinute,
        amount: txResult.actualMinuteDelta,
        unit: request.advanceTime.unit,
      }) as unknown as Record<string, unknown>,
    });
  }

  return txResult.result;
}

export async function listWorldAdvanceBatches(
  campaignId: string,
  limit = 40,
): Promise<WorldAdvanceBatchSummary[]> {
  const category = await prisma.calendarEventCategory.findFirst({
    where: { campaignId, name: WORLD_ADVANCE_CATEGORY },
    select: { id: true },
  });
  if (!category) return [];

  const events = await prisma.calendarEvent.findMany({
    where: { categoryId: category.id },
    orderBy: { targetEpochMinute: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      targetEpochMinute: true,
      description: true,
      createdAt: true,
    },
  });

  const summaries: WorldAdvanceBatchSummary[] = [];
  for (const ev of events) {
    let payload = null;
    try {
      payload = parseWorldAdvanceBatchPayload(JSON.parse(ev.description ?? '{}'));
    } catch {
      payload = null;
    }
    summaries.push({
      chronologyEventId: ev.id,
      batchId: payload?.batchId ?? ev.id,
      title: ev.title,
      targetEpochMinute: serializeEpochMinute(ev.targetEpochMinute ?? 0n),
      appliedCount: payload?.appliedCount ?? 0,
      effectCount: payload?.effects.length ?? 0,
      headline: payload?.synthesisProjection?.headline ?? null,
      createdAt: ev.createdAt.toISOString(),
    });
  }
  return summaries;
}

export async function getWorldAdvanceBatchDetail(
  campaignId: string,
  chronologyEventId: string,
): Promise<{
  event: { id: string; title: string; targetEpochMinute: string };
  payload: ReturnType<typeof parseWorldAdvanceBatchPayload>;
  preview: WorldAdvancePreview | null;
} | null> {
  const ev = await prisma.calendarEvent.findFirst({
    where: {
      id: chronologyEventId,
      calendar: { campaignId },
    },
    select: {
      id: true,
      title: true,
      targetEpochMinute: true,
      description: true,
    },
  });
  if (!ev) return null;
  let payload = null;
  try {
    payload = parseWorldAdvanceBatchPayload(JSON.parse(ev.description ?? '{}'));
  } catch {
    payload = null;
  }
  const preview =
    payload && payload.effects.length > 0
      ? await buildPreviewProjection(
          campaignId,
          {
            version: WORLD_ADVANCE_VERSION,
            effects: payload.effects,
            advanceTime: payload.advanceTime,
            note: payload.note,
          },
          BigInt(payload.nextEpochMinute),
          false,
        )
      : null;
  return {
    event: {
      id: ev.id,
      title: ev.title,
      targetEpochMinute: serializeEpochMinute(ev.targetEpochMinute ?? 0n),
    },
    payload,
    preview,
  };
}
