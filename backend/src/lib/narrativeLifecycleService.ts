import type { Prisma } from '@prisma/client';
import {
  DEFAULT_QUEST_LIFECYCLE_STATE,
  NarrativeLifecycleStates,
  NarrativeLifecycleSubjectKinds,
  NARRATIVE_LIFECYCLE_SEMANTICS_VERSION,
  assertLifecycleTransition,
  isLifecyclePartyVisible,
  lifecycleToPublishedQuestStatus,
  normalizeNarrativeLifecycleState,
  projectNarrativeLifecycle,
  publishedQuestStatusToLifecycleHint,
  publishedQuestStatusToLifecycleTarget,
  type NarrativeLifecycleState,
  type NarrativeLifecycleSubjectKind,
  type PublishedQuestStatus,
  NarrativeLifecycleTransitionError,
} from '../../../shared/narrativeLifecycle.js';
import type { NarrativeViewerContext } from '../../../shared/narrativeProjection.js';
import { logCampaignActivity } from './campaignActivity.js';
import { emitQuestRewardLedgerSuggestion } from './ledgerSuggestionEmitters.js';
import { ensureNarrativeThreadsSystemCategoryKey } from './ensureNarrativeThreadsSystemCategoryKey.js';
import { ensureNarrativeScenesSystemCategoryKey } from './ensureNarrativeScenesSystemCategoryKey.js';
import { ensureQuestsSystemCategoryKey } from './ensureQuestsSystemCategoryKey.js';
import {
  mergeQuestMetadata,
  parseQuestMetadata,
  type QuestMetadataFields,
} from './questMetadata.js';
import {
  lifecycleToThreadStatus,
  lifecycleTargetForThreadStatusPatch,
  mergeThreadMetadata,
  parseThreadMetadata,
  publishedThreadStatusToLifecycleHint,
  type ThreadMetadataFields,
  type ThreadStatus,
} from './threadMetadata.js';
import {
  parseSceneMetadata,
  mergeSceneMetadata,
  lifecycleToSceneStatus,
  lifecycleTargetForSceneStatusPatch,
  publishedSceneStatusToLifecycleHint,
  type SceneMetadataFields,
  type SceneStatus,
} from './sceneMetadata.js';
import { isDescendantOfScenesRoot } from './sceneHubTree.js';
import {
  allowedSceneStatusesForLifecycle,
} from '../../../shared/sceneLifecycleMatrix.js';
import {
  coerceThreadStatusForLifecycle,
  isThreadStatusAllowedForLifecycle,
} from '../../../shared/threadLifecycleMatrix.js';
import { prisma } from './prisma.js';
import { executeConsequencesForLifecycleTransition } from './narrativeConsequenceService.js';
import { touchQuestTimeline } from './touchQuestTimeline.js';
import { randomUUID } from 'node:crypto';
import {
  isDescendantOfQuestsRoot,
  type QuestHubPageRow,
} from './questHubTree.js';
import {
  isDescendantOfThreadsRoot,
  type ThreadHubPageRow,
} from './threadHubTree.js';

export type LifecycleStateRow = {
  subjectId: string;
  lifecycleState: NarrativeLifecycleState;
  updatedAt: Date;
};

export function lifecycleMapFromRows(
  rows: LifecycleStateRow[],
): Map<string, NarrativeLifecycleState> {
  return new Map(rows.map((row) => [row.subjectId, row.lifecycleState]));
}

export async function getLifecycleStates(
  campaignId: string,
  subjectKind: NarrativeLifecycleSubjectKind,
  subjectIds: string[],
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<Map<string, NarrativeLifecycleState>> {
  if (subjectIds.length === 0) return new Map();

  const rows = await db.narrativeLifecycleState.findMany({
    where: {
      campaignId,
      subjectKind,
      subjectId: { in: subjectIds },
    },
    select: { subjectId: true, lifecycleState: true },
  });

  const map = new Map<string, NarrativeLifecycleState>();
  for (const row of rows) {
    const state = normalizeNarrativeLifecycleState(row.lifecycleState);
    if (state) map.set(row.subjectId, state);
  }
  return map;
}

export async function getOrCreateQuestLifecycle(
  campaignId: string,
  questPageId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<NarrativeLifecycleState> {
  const existing = await db.narrativeLifecycleState.findUnique({
    where: {
      campaignId_subjectKind_subjectId: {
        campaignId,
        subjectKind: NarrativeLifecycleSubjectKinds.QUEST,
        subjectId: questPageId,
      },
    },
    select: { lifecycleState: true },
  });

  if (existing) {
    const state = normalizeNarrativeLifecycleState(existing.lifecycleState);
    if (state) return state;
  }

  const page = await db.wikiPage.findFirst({
    where: { id: questPageId, campaignId },
    select: { metadata: true },
  });
  const hint = publishedQuestStatusToLifecycleHint(
    page ? parseQuestMetadata(page.metadata).questStatus : null,
  );

  await db.narrativeLifecycleState.create({
    data: {
      campaignId,
      subjectKind: NarrativeLifecycleSubjectKinds.QUEST,
      subjectId: questPageId,
      lifecycleState: hint,
      semanticsVersion: NARRATIVE_LIFECYCLE_SEMANTICS_VERSION,
    },
  });

  return hint;
}

function publishedStatusForTransition(
  toState: NarrativeLifecycleState,
  previousPublished: PublishedQuestStatus | null,
): PublishedQuestStatus {
  if (
    toState === NarrativeLifecycleStates.FAILED &&
    previousPublished === 'ABANDONED'
  ) {
    return lifecycleToPublishedQuestStatus(toState, { preserveAbandoned: true });
  }
  return lifecycleToPublishedQuestStatus(toState);
}

export type TransitionLifecycleInput = {
  campaignId: string;
  subjectKind: NarrativeLifecycleSubjectKind;
  subjectId: string;
  toState: NarrativeLifecycleState;
  actorUserId: string;
  canManage: boolean;
  entityName?: string;
  preserveAbandonedPublished?: boolean;
};

export type TransitionLifecycleResult = {
  lifecycleState: NarrativeLifecycleState;
  questStatus: PublishedQuestStatus | null;
  threadStatus: ThreadStatus | null;
  sceneStatus: SceneStatus | null;
};

export async function transitionLifecycle(
  input: TransitionLifecycleInput,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<TransitionLifecycleResult> {
  if (!input.canManage) {
    throw new Error('FORBIDDEN');
  }

  const existing = await db.narrativeLifecycleState.findUnique({
    where: {
      campaignId_subjectKind_subjectId: {
        campaignId: input.campaignId,
        subjectKind: input.subjectKind,
        subjectId: input.subjectId,
      },
    },
    select: { lifecycleState: true },
  });

  const fromState = existing
    ? normalizeNarrativeLifecycleState(existing.lifecycleState) ??
      DEFAULT_QUEST_LIFECYCLE_STATE
    : DEFAULT_QUEST_LIFECYCLE_STATE;

  assertLifecycleTransition(fromState, input.toState);

  await db.narrativeLifecycleState.upsert({
    where: {
      campaignId_subjectKind_subjectId: {
        campaignId: input.campaignId,
        subjectKind: input.subjectKind,
        subjectId: input.subjectId,
      },
    },
    create: {
      campaignId: input.campaignId,
      subjectKind: input.subjectKind,
      subjectId: input.subjectId,
      lifecycleState: input.toState,
      semanticsVersion: NARRATIVE_LIFECYCLE_SEMANTICS_VERSION,
      updatedByUserId: input.actorUserId,
    },
    update: {
      lifecycleState: input.toState,
      semanticsVersion: NARRATIVE_LIFECYCLE_SEMANTICS_VERSION,
      updatedByUserId: input.actorUserId,
    },
  });

  let questStatus: PublishedQuestStatus | null = null;
  let threadStatus: ThreadStatus | null = null;
  let sceneStatus: SceneStatus | null = null;

  if (input.subjectKind === NarrativeLifecycleSubjectKinds.QUEST) {
    const page = await db.wikiPage.findFirst({
      where: { id: input.subjectId, campaignId: input.campaignId },
      select: { metadata: true, title: true },
    });
    if (page) {
      const parsed = parseQuestMetadata(page.metadata);
      questStatus = publishedStatusForTransition(
        input.toState,
        parsed.questStatus as PublishedQuestStatus,
      );
      const merged = mergeQuestMetadata(page.metadata, {
        questStatus: questStatus as QuestMetadataFields['questStatus'],
      });
      await db.wikiPage.update({
        where: { id: input.subjectId },
        data: { metadata: merged as never },
      });

      const parsedMerged = parseQuestMetadata(merged);
      if (
        input.toState === NarrativeLifecycleStates.COMPLETED &&
        parsedMerged.ledgerReward
      ) {
        const campaign = await db.campaign.findUnique({
          where: { id: input.campaignId },
          select: { currentEpochMinute: true },
        });
        await emitQuestRewardLedgerSuggestion(db, {
          campaignId: input.campaignId,
          questPageId: input.subjectId,
          questTitle: input.entityName ?? page.title,
          ledgerReward: parsedMerged.ledgerReward,
          transitionId: `${fromState}:${input.toState}:${input.subjectId}`,
          atEpochMinute: (campaign?.currentEpochMinute ?? 0n).toString(),
        });
      }

      logCampaignActivity({
        campaignId: input.campaignId,
        userId: input.actorUserId,
        actionType: 'UPDATE',
        entityType: 'QUEST_LIFECYCLE',
        entityId: input.subjectId,
        entityName: input.entityName ?? page.title,
        parentContext: `Lifecycle: ${fromState} → ${input.toState}`,
      });

      if (input.toState === NarrativeLifecycleStates.ACTIVE) {
        const campaign = await db.campaign.findUnique({
          where: { id: input.campaignId },
          select: { currentEpochMinute: true },
        });
        await touchQuestTimeline(db, {
          campaignId: input.campaignId,
          questPageId: input.subjectId,
          epochMinute: campaign?.currentEpochMinute ?? 0n,
          reason: 'LIFECYCLE_TRANSITION',
          actorUserId: input.actorUserId,
        });
      }
    }
  }

  if (input.subjectKind === NarrativeLifecycleSubjectKinds.OPEN_THREAD) {
    const page = await db.wikiPage.findFirst({
      where: { id: input.subjectId, campaignId: input.campaignId },
      select: { metadata: true, title: true },
    });
    if (page) {
      const parsed = parseThreadMetadata(page.metadata);
      threadStatus = coerceThreadStatusForLifecycle(
        lifecycleToThreadStatus(input.toState, parsed.threadStatus),
        input.toState,
      );
      const patch: Partial<ThreadMetadataFields> = {
        threadStatus: threadStatus as ThreadMetadataFields['threadStatus'],
        lastAdvancedSessionId: parsed.lastAdvancedSessionId,
      };
      if (threadStatus === 'RESOLVED' && !parsed.resolvedSessionId) {
        patch.resolvedSessionId = parsed.resolvedSessionId;
      }
      const merged = mergeThreadMetadata(page.metadata, patch);
      await db.wikiPage.update({
        where: { id: input.subjectId },
        data: { metadata: merged as never },
      });

      logCampaignActivity({
        campaignId: input.campaignId,
        userId: input.actorUserId,
        actionType: 'UPDATE',
        entityType: 'THREAD_LIFECYCLE',
        entityId: input.subjectId,
        entityName: input.entityName ?? page.title,
        parentContext: `Lifecycle: ${fromState} → ${input.toState}`,
      });
    }
  }

  if (input.subjectKind === NarrativeLifecycleSubjectKinds.SCENE) {
    const page = await db.wikiPage.findFirst({
      where: { id: input.subjectId, campaignId: input.campaignId },
      select: { metadata: true, title: true },
    });
    if (page) {
      const parsed = parseSceneMetadata(page.metadata);
      sceneStatus = lifecycleToSceneStatus(input.toState, parsed.sceneStatus);
      const merged = mergeSceneMetadata(page.metadata, { sceneStatus });
      await db.wikiPage.update({
        where: { id: input.subjectId },
        data: { metadata: merged as never },
      });

      logCampaignActivity({
        campaignId: input.campaignId,
        userId: input.actorUserId,
        actionType: 'UPDATE',
        entityType: 'SCENE_LIFECYCLE',
        entityId: input.subjectId,
        entityName: input.entityName ?? page.title,
        parentContext: `Lifecycle: ${fromState} → ${input.toState}`,
      });
    }
  }

  const transitionId = randomUUID();
  await executeConsequencesForLifecycleTransition(
    {
      campaignId: input.campaignId,
      subjectId: input.subjectId,
      toState: input.toState,
      transitionId,
      actorUserId: input.actorUserId,
      canManage: input.canManage,
    },
    db,
  );

  return { lifecycleState: input.toState, questStatus, threadStatus, sceneStatus };
}

export async function transitionQuestByPublishedStatus(input: {
  campaignId: string;
  questPageId: string;
  targetQuestStatus: PublishedQuestStatus;
  actorUserId: string;
  canManage: boolean;
  entityName?: string;
}): Promise<TransitionLifecycleResult | null> {
  const current = await getOrCreateQuestLifecycle(
    input.campaignId,
    input.questPageId,
  );
  const target = publishedQuestStatusToLifecycleTarget(
    input.targetQuestStatus,
    current,
  );
  if (!target || target === current) {
    return {
      lifecycleState: current,
      questStatus: input.targetQuestStatus,
      threadStatus: null,
      sceneStatus: null,
    };
  }

  try {
    return await transitionLifecycle({
      campaignId: input.campaignId,
      subjectKind: NarrativeLifecycleSubjectKinds.QUEST,
      subjectId: input.questPageId,
      toState: target,
      actorUserId: input.actorUserId,
      canManage: input.canManage,
      entityName: input.entityName,
    });
  } catch (err) {
    if (err instanceof NarrativeLifecycleTransitionError) {
      throw err;
    }
    throw err;
  }
}

export async function getOrCreateThreadLifecycle(
  campaignId: string,
  threadPageId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<NarrativeLifecycleState> {
  const existing = await db.narrativeLifecycleState.findUnique({
    where: {
      campaignId_subjectKind_subjectId: {
        campaignId,
        subjectKind: NarrativeLifecycleSubjectKinds.OPEN_THREAD,
        subjectId: threadPageId,
      },
    },
    select: { lifecycleState: true },
  });

  if (existing) {
    const state = normalizeNarrativeLifecycleState(existing.lifecycleState);
    if (state) return state;
  }

  const page = await db.wikiPage.findFirst({
    where: { id: threadPageId, campaignId },
    select: { metadata: true },
  });
  const hint = publishedThreadStatusToLifecycleHint(
    page ? parseThreadMetadata(page.metadata).threadStatus : null,
  );

  await db.narrativeLifecycleState.create({
    data: {
      campaignId,
      subjectKind: NarrativeLifecycleSubjectKinds.OPEN_THREAD,
      subjectId: threadPageId,
      lifecycleState: hint,
      semanticsVersion: NARRATIVE_LIFECYCLE_SEMANTICS_VERSION,
    },
  });

  return hint;
}

export async function transitionThreadByPublishedStatus(input: {
  campaignId: string;
  threadPageId: string;
  targetThreadStatus: ThreadStatus;
  actorUserId: string;
  canManage: boolean;
  entityName?: string;
}): Promise<TransitionLifecycleResult | null> {
  const current = await getOrCreateThreadLifecycle(
    input.campaignId,
    input.threadPageId,
  );

  if (isThreadStatusAllowedForLifecycle(input.targetThreadStatus, current)) {
    const page = await prisma.wikiPage.findFirst({
      where: { id: input.threadPageId, campaignId: input.campaignId },
      select: { metadata: true, title: true },
    });
    if (!page) {
      return {
        lifecycleState: current,
        questStatus: null,
        threadStatus: input.targetThreadStatus,
        sceneStatus: null,
      };
    }
    const parsed = parseThreadMetadata(page.metadata);
    const patch: Partial<ThreadMetadataFields> = {
      threadStatus: input.targetThreadStatus,
    };
    if (input.targetThreadStatus === 'RESOLVED' && !parsed.resolvedSessionId) {
      patch.resolvedSessionId = parsed.lastAdvancedSessionId ?? parsed.introducedSessionId;
    }
    const merged = mergeThreadMetadata(page.metadata, patch);
    await prisma.wikiPage.update({
      where: { id: input.threadPageId },
      data: { metadata: merged as never },
    });
    return {
      lifecycleState: current,
      questStatus: null,
      threadStatus: input.targetThreadStatus,
      sceneStatus: null,
    };
  }

  const target = lifecycleTargetForThreadStatusPatch(
    input.targetThreadStatus,
    current,
  );
  if (!target) {
    throw new Error(
      `THREAD_STATUS_NOT_ALLOWED: status ${input.targetThreadStatus} is not valid while lifecycle is ${current}`,
    );
  }
  if (target === current) {
    return {
      lifecycleState: current,
      questStatus: null,
      threadStatus: input.targetThreadStatus,
      sceneStatus: null,
    };
  }

  return transitionLifecycle({
    campaignId: input.campaignId,
    subjectKind: NarrativeLifecycleSubjectKinds.OPEN_THREAD,
    subjectId: input.threadPageId,
    toState: target,
    actorUserId: input.actorUserId,
    canManage: input.canManage,
    entityName: input.entityName,
  });
}

function isSceneStatusAllowedForLifecycle(
  status: SceneStatus,
  lifecycle: NarrativeLifecycleState,
): boolean {
  return allowedSceneStatusesForLifecycle(lifecycle).includes(status);
}

export async function getOrCreateSceneLifecycle(
  campaignId: string,
  scenePageId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<NarrativeLifecycleState> {
  const existing = await db.narrativeLifecycleState.findUnique({
    where: {
      campaignId_subjectKind_subjectId: {
        campaignId,
        subjectKind: NarrativeLifecycleSubjectKinds.SCENE,
        subjectId: scenePageId,
      },
    },
    select: { lifecycleState: true },
  });

  if (existing) {
    const state = normalizeNarrativeLifecycleState(existing.lifecycleState);
    if (state) return state;
  }

  const page = await db.wikiPage.findFirst({
    where: { id: scenePageId, campaignId },
    select: { metadata: true },
  });
  const hint = publishedSceneStatusToLifecycleHint(
    page ? parseSceneMetadata(page.metadata).sceneStatus : null,
  );

  await db.narrativeLifecycleState.upsert({
    where: {
      campaignId_subjectKind_subjectId: {
        campaignId,
        subjectKind: NarrativeLifecycleSubjectKinds.SCENE,
        subjectId: scenePageId,
      },
    },
    create: {
      campaignId,
      subjectKind: NarrativeLifecycleSubjectKinds.SCENE,
      subjectId: scenePageId,
      lifecycleState: hint,
      semanticsVersion: NARRATIVE_LIFECYCLE_SEMANTICS_VERSION,
    },
    update: {},
  });

  return hint;
}

export async function transitionSceneByPublishedStatus(input: {
  campaignId: string;
  scenePageId: string;
  targetSceneStatus: SceneStatus;
  actorUserId: string;
  canManage: boolean;
  entityName?: string;
}): Promise<TransitionLifecycleResult | null> {
  const current = await getOrCreateSceneLifecycle(input.campaignId, input.scenePageId);

  if (isSceneStatusAllowedForLifecycle(input.targetSceneStatus, current)) {
    const page = await prisma.wikiPage.findFirst({
      where: { id: input.scenePageId, campaignId: input.campaignId },
      select: { metadata: true, title: true },
    });
    if (!page) {
      return {
        lifecycleState: current,
        questStatus: null,
        threadStatus: null,
        sceneStatus: input.targetSceneStatus,
      };
    }
    const merged = mergeSceneMetadata(page.metadata, {
      sceneStatus: input.targetSceneStatus,
    });
    await prisma.wikiPage.update({
      where: { id: input.scenePageId },
      data: { metadata: merged as never },
    });
    return {
      lifecycleState: current,
      questStatus: null,
      threadStatus: null,
      sceneStatus: input.targetSceneStatus,
    };
  }

  const target = lifecycleTargetForSceneStatusPatch(input.targetSceneStatus, current);
  if (!target) {
    throw new Error(
      `SCENE_STATUS_NOT_ALLOWED: status ${input.targetSceneStatus} is not valid while lifecycle is ${current}`,
    );
  }
  if (target === current) {
    return {
      lifecycleState: current,
      questStatus: null,
      threadStatus: null,
      sceneStatus: input.targetSceneStatus,
    };
  }

  return transitionLifecycle({
    campaignId: input.campaignId,
    subjectKind: NarrativeLifecycleSubjectKinds.SCENE,
    subjectId: input.scenePageId,
    toState: target,
    actorUserId: input.actorUserId,
    canManage: input.canManage,
    entityName: input.entityName,
  });
}

export async function createDefaultQuestLifecycle(
  campaignId: string,
  questPageId: string,
  options?: {
    initialState?: NarrativeLifecycleState;
    actorUserId?: string;
  },
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  const state = options?.initialState ?? DEFAULT_QUEST_LIFECYCLE_STATE;
  await db.narrativeLifecycleState.upsert({
    where: {
      campaignId_subjectKind_subjectId: {
        campaignId,
        subjectKind: NarrativeLifecycleSubjectKinds.QUEST,
        subjectId: questPageId,
      },
    },
    create: {
      campaignId,
      subjectKind: NarrativeLifecycleSubjectKinds.QUEST,
      subjectId: questPageId,
      lifecycleState: state,
      semanticsVersion: NARRATIVE_LIFECYCLE_SEMANTICS_VERSION,
      updatedByUserId: options?.actorUserId ?? null,
    },
    update: {},
  });
}

export async function createDefaultSceneLifecycle(
  campaignId: string,
  scenePageId: string,
  options?: {
    initialState?: NarrativeLifecycleState;
    actorUserId?: string;
  },
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  const state = options?.initialState ?? DEFAULT_QUEST_LIFECYCLE_STATE;
  await db.narrativeLifecycleState.upsert({
    where: {
      campaignId_subjectKind_subjectId: {
        campaignId,
        subjectKind: NarrativeLifecycleSubjectKinds.SCENE,
        subjectId: scenePageId,
      },
    },
    create: {
      campaignId,
      subjectKind: NarrativeLifecycleSubjectKinds.SCENE,
      subjectId: scenePageId,
      lifecycleState: state,
      semanticsVersion: NARRATIVE_LIFECYCLE_SEMANTICS_VERSION,
      updatedByUserId: options?.actorUserId ?? null,
    },
    update: {},
  });
}

export async function createDefaultThreadLifecycle(
  campaignId: string,
  threadPageId: string,
  options?: {
    initialState?: NarrativeLifecycleState;
    actorUserId?: string;
  },
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  const state = options?.initialState ?? DEFAULT_QUEST_LIFECYCLE_STATE;
  await db.narrativeLifecycleState.upsert({
    where: {
      campaignId_subjectKind_subjectId: {
        campaignId,
        subjectKind: NarrativeLifecycleSubjectKinds.OPEN_THREAD,
        subjectId: threadPageId,
      },
    },
    create: {
      campaignId,
      subjectKind: NarrativeLifecycleSubjectKinds.OPEN_THREAD,
      subjectId: threadPageId,
      lifecycleState: state,
      semanticsVersion: NARRATIVE_LIFECYCLE_SEMANTICS_VERSION,
      updatedByUserId: options?.actorUserId ?? null,
    },
    update: {},
  });
}

export async function clearQuestLifecycle(
  campaignId: string,
  questPageId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  await db.narrativeLifecycleState.deleteMany({
    where: {
      campaignId,
      subjectKind: NarrativeLifecycleSubjectKinds.QUEST,
      subjectId: questPageId,
    },
  });
}

export function filterThreadRowsForViewer(
  rows: ThreadHubPageRow[],
  lifecycleByThreadId: Map<string, NarrativeLifecycleState>,
  viewerCtx: NarrativeViewerContext,
): ThreadHubPageRow[] {
  if (viewerCtx.perspective === 'elevated') {
    return rows;
  }
  return rows.filter((row) => {
    const state =
      lifecycleByThreadId.get(row.id) ?? NarrativeLifecycleStates.DISCOVERED;
    return isLifecyclePartyVisible(state);
  });
}

export function filterSceneRowsForViewer(
  rows: import('./sceneHubTree.js').SceneHubPageRow[],
  lifecycleBySceneId: Map<string, NarrativeLifecycleState>,
  viewerCtx: NarrativeViewerContext,
): import('./sceneHubTree.js').SceneHubPageRow[] {
  if (viewerCtx.perspective === 'elevated') {
    return rows;
  }
  return rows.filter((row) => {
    const state =
      lifecycleBySceneId.get(row.id) ?? NarrativeLifecycleStates.LOCKED;
    return isLifecyclePartyVisible(state);
  });
}

export function isThreadVisibleToViewer(
  threadPageId: string,
  lifecycleByThreadId: Map<string, NarrativeLifecycleState>,
  viewerCtx: NarrativeViewerContext,
): boolean {
  const state =
    lifecycleByThreadId.get(threadPageId) ?? NarrativeLifecycleStates.DISCOVERED;
  const projection = projectNarrativeLifecycle(state, viewerCtx);
  return projection.partyVisible;
}

export function filterQuestRowsForViewer(
  rows: QuestHubPageRow[],
  lifecycleByQuestId: Map<string, NarrativeLifecycleState>,
  viewerCtx: NarrativeViewerContext,
): QuestHubPageRow[] {
  if (viewerCtx.perspective === 'elevated') {
    return rows;
  }
  return rows.filter((row) => {
    const state =
      lifecycleByQuestId.get(row.id) ?? NarrativeLifecycleStates.DISCOVERED;
    return isLifecyclePartyVisible(state);
  });
}

export function isQuestVisibleToViewer(
  questPageId: string,
  lifecycleByQuestId: Map<string, NarrativeLifecycleState>,
  viewerCtx: NarrativeViewerContext,
): boolean {
  const state =
    lifecycleByQuestId.get(questPageId) ?? NarrativeLifecycleStates.DISCOVERED;
  const projection = projectNarrativeLifecycle(state, viewerCtx);
  return projection.partyVisible;
}

async function upsertLifecycleForPages(
  campaignId: string,
  subjectKind: NarrativeLifecycleSubjectKind,
  pageIds: string[],
  pages: Array<{ id: string; metadata: unknown }>,
  hintFn: (metadata: unknown) => NarrativeLifecycleState,
  db: Prisma.TransactionClient | typeof prisma,
): Promise<number> {
  let upserted = 0;
  for (const pageId of pageIds) {
    const page = pages.find((p) => p.id === pageId);
    if (!page) continue;
    const lifecycleState = hintFn(page.metadata);
    await db.narrativeLifecycleState.upsert({
      where: {
        campaignId_subjectKind_subjectId: {
          campaignId,
          subjectKind,
          subjectId: pageId,
        },
      },
      create: {
        campaignId,
        subjectKind,
        subjectId: pageId,
        lifecycleState,
        semanticsVersion: NARRATIVE_LIFECYCLE_SEMANTICS_VERSION,
      },
      update: {
        lifecycleState,
        semanticsVersion: NARRATIVE_LIFECYCLE_SEMANTICS_VERSION,
      },
    });
    upserted += 1;
  }
  return upserted;
}

export async function rebuildNarrativeLifecycleForCampaign(
  campaignId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<{ upserted: number }> {
  const pages = await db.wikiPage.findMany({
    where: { campaignId, deletedAt: null },
    select: {
      id: true,
      parentId: true,
      metadata: true,
      templateType: true,
    },
  });

  const parentById = new Map(
    pages.map((page) => [page.id, { parentId: page.parentId }]),
  );

  let upserted = 0;

  const questsRootId = await ensureQuestsSystemCategoryKey(campaignId, db);
  if (questsRootId) {
    const questPageIds = pages
      .filter(
        (page) =>
          page.templateType === 'QUEST' ||
          isDescendantOfQuestsRoot(page.id, questsRootId, parentById),
      )
      .filter((page) => page.id !== questsRootId)
      .map((page) => page.id);
    upserted += await upsertLifecycleForPages(
      campaignId,
      NarrativeLifecycleSubjectKinds.QUEST,
      questPageIds,
      pages,
      (metadata) =>
        publishedQuestStatusToLifecycleHint(parseQuestMetadata(metadata).questStatus),
      db,
    );
  }

  const threadsRootId = await ensureNarrativeThreadsSystemCategoryKey(campaignId, db);
  if (threadsRootId) {
    const threadPageIds = pages
      .filter((page) => isDescendantOfThreadsRoot(page.id, threadsRootId, parentById))
      .filter((page) => page.id !== threadsRootId)
      .map((page) => page.id);
    upserted += await upsertLifecycleForPages(
      campaignId,
      NarrativeLifecycleSubjectKinds.OPEN_THREAD,
      threadPageIds,
      pages,
      (metadata) =>
        publishedThreadStatusToLifecycleHint(parseThreadMetadata(metadata).threadStatus),
      db,
    );
  }

  const scenesRootId = await ensureNarrativeScenesSystemCategoryKey(campaignId, db);
  if (scenesRootId) {
    const scenePageIds = pages
      .filter((page) => isDescendantOfScenesRoot(page.id, scenesRootId, parentById))
      .filter((page) => page.id !== scenesRootId)
      .map((page) => page.id);
    upserted += await upsertLifecycleForPages(
      campaignId,
      NarrativeLifecycleSubjectKinds.SCENE,
      scenePageIds,
      pages,
      (metadata) =>
        publishedSceneStatusToLifecycleHint(parseSceneMetadata(metadata).sceneStatus),
      db,
    );
  }

  return { upserted };
}

export type CampaignQuestStatusFacet = {
  id: string;
  status: string;
  lifecycleState: NarrativeLifecycleState;
};

export async function buildCampaignQuestStatusFacets(
  campaignId: string,
): Promise<{ dm: CampaignQuestStatusFacet[]; party: CampaignQuestStatusFacet[] }> {
  const questsRootId = await ensureQuestsSystemCategoryKey(campaignId);
  if (!questsRootId) {
    return { dm: [], party: [] };
  }

  const pages = await prisma.wikiPage.findMany({
    where: { campaignId, deletedAt: null },
    select: { id: true, parentId: true, metadata: true, templateType: true },
  });
  const parentById = new Map(
    pages.map((page) => [page.id, { parentId: page.parentId }]),
  );
  const questPages = pages.filter(
    (page) =>
      page.id !== questsRootId &&
      (page.templateType === 'QUEST' ||
        isDescendantOfQuestsRoot(page.id, questsRootId, parentById)),
  );

  const lifecycleMap = await getLifecycleStates(
    campaignId,
    NarrativeLifecycleSubjectKinds.QUEST,
    questPages.map((page) => page.id),
  );

  const dm: CampaignQuestStatusFacet[] = questPages.map((page) => {
    const lifecycleState =
      lifecycleMap.get(page.id) ?? NarrativeLifecycleStates.DISCOVERED;
    return {
      id: page.id,
      status: parseQuestMetadata(page.metadata).questStatus,
      lifecycleState,
    };
  });

  const party = dm.filter((entry) => isLifecyclePartyVisible(entry.lifecycleState));
  return { dm, party };
}

export { NarrativeLifecycleTransitionError };
