import type { Prisma } from '@prisma/client';
import {
  normalizeDevelopmentAcceptTarget,
  normalizeDevelopmentPayload,
  serializeDevelopmentPayload,
  type DevelopmentAcceptTarget,
} from '../../../shared/worldDevelopmentMetadata.js';
import {
  buildWorldPressureEventMetadata,
  normalizeWorldEventNarrative,
  type TrendDirection,
} from '../../../shared/worldEventSuggestionMetadata.js';
import type { CampaignMemberRole } from '../types/domain.js';
import { CampaignMemberRoles } from '../types/domain.js';
import { prisma } from './prisma.js';
import { ensureEventLoreStubPage } from './eventLoreStub.js';
import { WORLD_EVENT_PROMPTS_HANDLER_VERSION } from './worldEventSuggestionService.js';
import { findDefinitionById, getDevelopmentResolveProvider } from './developmentRegistry.js';
import { DEVELOPMENT_TYPE_LABELS } from '../../../shared/worldDevelopmentPresentation.js';

export function canResolveWorldDevelopment(role: CampaignMemberRole | null): boolean {
  return (
    role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER
  );
}

async function resolveMasterCalendarId(
  db: Prisma.TransactionClient | typeof prisma,
  campaignId: string,
): Promise<string | null> {
  const cal = await db.fantasyCalendar.findFirst({
    where: { campaignId },
    orderBy: [{ isMasterTime: 'desc' }, { name: 'asc' }],
    select: { id: true },
  });
  return cal?.id ?? null;
}

function defaultResultSummary(
  acceptTarget: DevelopmentAcceptTarget,
  title: string,
): string {
  switch (acceptTarget) {
    case 'calendar_event':
      return `Calendar event created: ${title}.`;
    case 'rumor':
      return `Rumor recorded: ${title}.`;
    case 'quest_hook':
      return `Quest hook applied: ${title}.`;
    case 'faction_change':
      return `Faction note updated: ${title}.`;
    case 'narrative_consequence':
      return `Narrative consequence recorded: ${title}.`;
    default:
      return `Development accepted: ${title}.`;
  }
}

export type ResolveWorldDevelopmentInput = {
  suggestionId: string;
  campaignId: string;
  campaignHandle: string;
  role: CampaignMemberRole | null;
  userId: string;
  action: 'accept' | 'dismiss';
  acceptTarget?: DevelopmentAcceptTarget | null;
  title?: string | null;
  narrative?: string | null;
  autoApply?: boolean;
};

export async function resolveWorldDevelopmentSuggestion(
  input: ResolveWorldDevelopmentInput,
): Promise<{
  suggestionId: string;
  status: string;
  acceptTarget?: DevelopmentAcceptTarget | null;
  calendarEventId?: string;
  lorePageId?: string;
}> {
  if (!input.autoApply && !canResolveWorldDevelopment(input.role)) {
    throw new Error('Forbidden');
  }

  const suggestion = await prisma.campaignWorldEventSuggestion.findFirst({
    where: { id: input.suggestionId, campaignId: input.campaignId },
  });
  if (!suggestion) {
    throw new Error('Suggestion not found.');
  }
  if (suggestion.status !== 'pending') {
    throw new Error('Suggestion is no longer pending.');
  }

  if (input.action === 'dismiss') {
    const updated = await prisma.campaignWorldEventSuggestion.update({
      where: { id: suggestion.id },
      data: {
        status: 'dismissed',
        resolvedByUserId: input.userId,
        resolvedAt: new Date(),
      },
    });
    return { suggestionId: updated.id, status: 'dismissed' };
  }

  const payload = normalizeDevelopmentPayload(suggestion.developmentPayload);
  const definitionId = payload?.definitionId ?? payload?.developmentType ?? null;
  const definition = definitionId ? findDefinitionById(definitionId) : undefined;

  const acceptTarget =
    normalizeDevelopmentAcceptTarget(input.acceptTarget) ??
    definition?.acceptTarget ??
    payload?.proposedAcceptTarget ??
    'calendar_event';

  const title =
    typeof input.title === 'string' && input.title.trim()
      ? input.title.trim()
      : suggestion.title;
  const narrative =
    input.narrative !== undefined
      ? normalizeWorldEventNarrative(input.narrative)
      : suggestion.narrative;

  const pluginResolver =
    definitionId != null ? getDevelopmentResolveProvider(definitionId) : undefined;

  if (pluginResolver && definitionId) {
    const result = await pluginResolver.resolveDevelopment({
      campaignId: input.campaignId,
      campaignHandle: input.campaignHandle,
      suggestionId: suggestion.id,
      definitionId,
      developmentType: payload?.developmentType ?? 'faction_pressure',
      title,
      narrative,
      acceptTarget,
      userId: input.userId,
    });

    const nextPayload = payload
      ? {
          ...payload,
          acceptTarget,
          resolvedBy: input.autoApply ? ('auto' as const) : ('gm' as const),
          acceptedArtifactId: result.acceptedArtifactId ?? result.calendarEventId ?? null,
          resultSummary: result.resultSummary,
        }
      : null;

    await prisma.campaignWorldEventSuggestion.update({
      where: { id: suggestion.id },
      data: {
        status: 'accepted',
        acceptedCalendarEventId: result.calendarEventId ?? undefined,
        resolvedByUserId: input.userId,
        resolvedAt: new Date(),
        developmentPayload: nextPayload
          ? (serializeDevelopmentPayload(nextPayload) as Prisma.InputJsonValue)
          : undefined,
      },
    });

    return {
      suggestionId: suggestion.id,
      status: 'accepted',
      acceptTarget,
      calendarEventId: result.calendarEventId ?? undefined,
      lorePageId: result.lorePageId ?? undefined,
    };
  }

  const nextPayload = payload
    ? {
        ...payload,
        acceptTarget,
        resolvedBy: input.autoApply ? ('auto' as const) : ('gm' as const),
      }
    : null;

  if (acceptTarget === 'calendar_event') {
    const calendarId = await resolveMasterCalendarId(prisma, input.campaignId);
    if (!calendarId) {
      throw new Error('No calendar found for campaign.');
    }

    const result = await prisma.$transaction(async (tx) => {
      const metadata = buildWorldPressureEventMetadata({
        suggestionId: suggestion.id,
        hookVersion: WORLD_EVENT_PROMPTS_HANDLER_VERSION,
        projectionEpoch: suggestion.occurredAtEpochMinute.toString(),
        primaryOrgPageId: suggestion.primaryOrgPageId,
        eraId: suggestion.eraId,
        momentumState: suggestion.momentumState,
        trendDirection: suggestion.trendDirection as TrendDirection | null,
      });

      const event = await tx.calendarEvent.create({
        data: {
          calendarId,
          visibility: 'DM_ONLY',
          title,
          description: narrative,
          targetEpochMinute: suggestion.occurredAtEpochMinute,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });

      const { syncEntityRelationsForCalendarEvent } = await import(
        './entityRelationSyncService.js'
      );
      await syncEntityRelationsForCalendarEvent(tx, input.campaignId, event.id);

      const descriptionMarkdown = narrative
        ? `# ${title}\n\n${narrative}`
        : `# ${title}`;

      const { lorePageId } = await ensureEventLoreStubPage(tx, {
        campaignId: input.campaignId,
        calendarEventId: event.id,
        title,
        descriptionMarkdown,
      });

      if (nextPayload) {
        nextPayload.acceptedArtifactId = event.id;
        nextPayload.resultSummary = defaultResultSummary(acceptTarget, title);
      }

      await tx.campaignWorldEventSuggestion.update({
        where: { id: suggestion.id },
        data: {
          status: 'accepted',
          acceptedCalendarEventId: event.id,
          resolvedByUserId: input.userId,
          resolvedAt: new Date(),
          developmentPayload: nextPayload
            ? (serializeDevelopmentPayload(nextPayload) as Prisma.InputJsonValue)
            : undefined,
        },
      });

      return { calendarEventId: event.id, lorePageId };
    });

    return {
      suggestionId: suggestion.id,
      status: 'accepted',
      acceptTarget,
      calendarEventId: result.calendarEventId,
      lorePageId: result.lorePageId,
    };
  }

  if (acceptTarget === 'rumor') {
    if (nextPayload) {
      nextPayload.resultSummary = defaultResultSummary(acceptTarget, title);
    }
    await prisma.campaignWorldEventSuggestion.update({
      where: { id: suggestion.id },
      data: {
        status: 'accepted',
        resolvedByUserId: input.userId,
        resolvedAt: new Date(),
        developmentPayload: nextPayload
          ? (serializeDevelopmentPayload(nextPayload) as Prisma.InputJsonValue)
          : undefined,
      },
    });
    return {
      suggestionId: suggestion.id,
      status: 'accepted',
      acceptTarget,
    };
  }

  if (acceptTarget === 'quest_hook' && payload?.dependencyRefs.find((r) => r.kind === 'quest')) {
    const questRef = payload.dependencyRefs.find((r) => r.kind === 'quest')!;
    const { transitionLifecycle } = await import('./narrativeLifecycleService.js');
    const { NarrativeLifecycleSubjectKinds, NarrativeLifecycleStates } = await import(
      '../../../shared/narrativeLifecycle.js'
    );
    await prisma.$transaction(async (tx) => {
      await transitionLifecycle(
        {
          campaignId: input.campaignId,
          subjectKind: NarrativeLifecycleSubjectKinds.QUEST,
          subjectId: questRef.id,
          toState: NarrativeLifecycleStates.DISCOVERED,
          actorUserId: input.userId,
          canManage: true,
        },
        tx,
      );
    });
    if (nextPayload) {
      nextPayload.resultSummary = defaultResultSummary(acceptTarget, title);
    }
  }

  if (acceptTarget === 'faction_change' && suggestion.primaryOrgPageId) {
    const page = await prisma.wikiPage.findFirst({
      where: { id: suggestion.primaryOrgPageId, campaignId: input.campaignId },
      select: { metadata: true },
    });
    if (page) {
      const meta = (page.metadata as Record<string, unknown>) ?? {};
      await prisma.wikiPage.update({
        where: { id: suggestion.primaryOrgPageId },
        data: {
          metadata: {
            ...meta,
            worldDevelopmentNote: narrative ?? title,
            lastDevelopmentAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
        },
      });
    }
    if (nextPayload) {
      nextPayload.resultSummary = defaultResultSummary(acceptTarget, title);
    }
  }

  if (nextPayload && !nextPayload.resultSummary) {
    const typeLabel =
      payload?.developmentType != null
        ? DEVELOPMENT_TYPE_LABELS[payload.developmentType]
        : title;
    nextPayload.resultSummary = defaultResultSummary(acceptTarget, typeLabel);
  }

  await prisma.campaignWorldEventSuggestion.update({
    where: { id: suggestion.id },
    data: {
      status: 'accepted',
      resolvedByUserId: input.userId,
      resolvedAt: new Date(),
      developmentPayload: nextPayload
        ? (serializeDevelopmentPayload(nextPayload) as Prisma.InputJsonValue)
        : undefined,
    },
  });

  return {
    suggestionId: suggestion.id,
    status: 'accepted',
    acceptTarget,
  };
}

export async function requeueArchivedSuggestion(
  campaignId: string,
  role: CampaignMemberRole | null,
  userId: string,
  suggestionId: string,
): Promise<void> {
  if (!canResolveWorldDevelopment(role)) {
    throw new Error('Forbidden');
  }

  const row = await prisma.campaignWorldEventSuggestion.findFirst({
    where: { id: suggestionId, campaignId, status: 'archived' },
  });
  if (!row) {
    throw new Error('Suggestion not found.');
  }

  const settings = await (
    await import('./worldDevelopmentSettingsService.js')
  ).resolveWorldDevelopmentSettings(campaignId);

  await prisma.campaignWorldEventSuggestion.update({
    where: { id: row.id },
    data: {
      status: 'pending',
      resolvedByUserId: null,
      resolvedAt: null,
      advanceCycleCount: 0,
      expiresAt: (
        await import('./developmentExpirationService.js')
      ).computeSuggestionExpiresAt(settings.expiration.wallClockDays),
    },
  });
}
