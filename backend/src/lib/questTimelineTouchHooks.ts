import type { Prisma } from '@prisma/client';
import { parseObjectiveMetadata } from '../../../shared/objectiveMetadata.js';
import { parseSceneMetadata } from '../../../shared/sceneMetadata.js';
import { touchQuestTimelinesForIds } from './touchQuestTimeline.js';

export async function touchQuestsLinkedFromSceneMetadata(
  db: Prisma.TransactionClient | typeof import('./prisma.js').prisma,
  input: {
    campaignId: string;
    metadata: unknown;
    epochMinute: bigint;
    actorUserId?: string | null;
  },
): Promise<number> {
  const scene = parseSceneMetadata(input.metadata);
  if (scene.linkedQuestPageIds.length === 0) return 0;
  return touchQuestTimelinesForIds(db, {
    campaignId: input.campaignId,
    questPageIds: scene.linkedQuestPageIds,
    epochMinute: input.epochMinute,
    reason: 'SCENE_LINK',
    actorUserId: input.actorUserId,
  });
}

export async function touchParentQuestFromObjectiveMetadata(
  db: Prisma.TransactionClient | typeof import('./prisma.js').prisma,
  input: {
    campaignId: string;
    objectivePageId: string;
    parentId: string | null;
    metadata: unknown;
    epochMinute: bigint;
    actorUserId?: string | null;
  },
): Promise<number> {
  const objective = parseObjectiveMetadata(input.metadata);
  if (objective.objectiveStatus !== 'COMPLETED') return 0;
  if (!input.parentId) return 0;
  return touchQuestTimelinesForIds(db, {
    campaignId: input.campaignId,
    questPageIds: [input.parentId],
    epochMinute: input.epochMinute,
    reason: 'OBJECTIVE_PROGRESS',
    actorUserId: input.actorUserId,
  });
}

export async function touchQuestFromStatusChange(
  db: Prisma.TransactionClient | typeof import('./prisma.js').prisma,
  input: {
    campaignId: string;
    questPageId: string;
    targetQuestStatus: string;
    epochMinute: bigint;
    actorUserId?: string | null;
  },
): Promise<number> {
  if (input.targetQuestStatus !== 'ACTIVE') return 0;
  return touchQuestTimelinesForIds(db, {
    campaignId: input.campaignId,
    questPageIds: [input.questPageId],
    epochMinute: input.epochMinute,
    reason: 'QUEST_STATUS_CHANGE',
    actorUserId: input.actorUserId,
  });
}
