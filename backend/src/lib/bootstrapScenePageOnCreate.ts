import type { NarrativeLifecycleState } from '../../../shared/narrativeLifecycle.js';
import { NarrativeLifecycleStates } from '../../../shared/narrativeLifecycle.js';
import {
  coerceSceneStatusForLifecycle,
  defaultSceneStatusForLifecycle,
} from '../../../shared/sceneLifecycleMatrix.js';
import {
  parseSceneMetadata,
  parseSceneNarrativeWeightStrict,
  type SceneMetadataFields,
  type SceneStatus,
} from '../../../shared/sceneMetadata.js';
import { buildSceneDefaultBlocks } from './pageTemplates.js';
import { mergeSceneMetadata } from './sceneMetadata.js';

const WIZARD_LIFECYCLE_VALUES = new Set<NarrativeLifecycleState>([
  NarrativeLifecycleStates.LOCKED,
  NarrativeLifecycleStates.DISCOVERED,
  NarrativeLifecycleStates.ACTIVE,
]);

export type SceneCreateBootstrapInput = {
  metadata: Record<string, unknown>;
  initialSceneLifecycle?: unknown;
  blocks?: Array<Record<string, unknown>> | null;
};

export type SceneCreateBootstrapResult =
  | {
      ok: true;
      metadata: Record<string, unknown>;
      blocks: Array<Record<string, unknown>>;
      initialLifecycle: NarrativeLifecycleState;
    }
  | { ok: false; status: number; error: string };

function resolveInitialLifecycle(raw: unknown): NarrativeLifecycleState {
  if (
    typeof raw === 'string' &&
    (Object.values(NarrativeLifecycleStates) as string[]).includes(raw) &&
    WIZARD_LIFECYCLE_VALUES.has(raw as NarrativeLifecycleState)
  ) {
    return raw as NarrativeLifecycleState;
  }
  return NarrativeLifecycleStates.LOCKED;
}

export function bootstrapScenePageOnCreate(
  input: SceneCreateBootstrapInput,
): SceneCreateBootstrapResult {
  const rawMeta = input.metadata;

  if (rawMeta.narrativeWeight !== undefined) {
    const weight = parseSceneNarrativeWeightStrict(rawMeta.narrativeWeight);
    if (!weight) {
      return {
        ok: false,
        status: 400,
        error: 'Invalid narrativeWeight. Allowed: minor, major, critical',
      };
    }
  }

  const initialLifecycle = resolveInitialLifecycle(input.initialSceneLifecycle);

  let requestedStatus: SceneStatus | undefined;
  if (rawMeta.sceneStatus !== undefined) {
    const parsed = parseSceneMetadata({ sceneStatus: rawMeta.sceneStatus });
    requestedStatus = parsed.sceneStatus;
  }

  const status =
    requestedStatus !== undefined
      ? coerceSceneStatusForLifecycle(requestedStatus, initialLifecycle)
      : defaultSceneStatusForLifecycle(initialLifecycle);

  const patch: Partial<SceneMetadataFields> = {
    sceneStatus: status,
    ...(rawMeta.narrativeWeight !== undefined
      ? { narrativeWeight: parseSceneNarrativeWeightStrict(rawMeta.narrativeWeight)! }
      : {}),
    ...(rawMeta.summary !== undefined
      ? { summary: parseSceneMetadata({ summary: rawMeta.summary }).summary }
      : {}),
    ...(rawMeta.beatType !== undefined
      ? { beatType: parseSceneMetadata({ beatType: rawMeta.beatType }).beatType }
      : {}),
    ...(rawMeta.sceneKind !== undefined
      ? { sceneKind: parseSceneMetadata({ sceneKind: rawMeta.sceneKind }).sceneKind }
      : {}),
    ...(rawMeta.linkedQuestPageIds !== undefined
      ? {
          linkedQuestPageIds: parseSceneMetadata({
            linkedQuestPageIds: rawMeta.linkedQuestPageIds,
          }).linkedQuestPageIds,
        }
      : {}),
    ...(rawMeta.participantPageIds !== undefined
      ? {
          participantPageIds: parseSceneMetadata({
            participantPageIds: rawMeta.participantPageIds,
          }).participantPageIds,
        }
      : {}),
    ...(rawMeta.locationPageId !== undefined
      ? {
          locationPageId: parseSceneMetadata({ locationPageId: rawMeta.locationPageId })
            .locationPageId,
        }
      : {}),
  };

  const mergedFields = parseSceneMetadata(mergeSceneMetadata(rawMeta, patch));
  const metadata = mergeSceneMetadata(rawMeta, mergedFields);

  const summary =
    typeof mergedFields.summary === 'string' && mergedFields.summary.trim()
      ? mergedFields.summary.trim()
      : 'Describe what happens in this scene — intent, beats, and player-facing outcomes.';

  const blocks =
    Array.isArray(input.blocks) && input.blocks.length > 0
      ? input.blocks
      : (buildSceneDefaultBlocks({ markdown: summary }) as Array<Record<string, unknown>>);

  return {
    ok: true,
    metadata,
    blocks,
    initialLifecycle,
  };
}

export function isExplicitSceneCreate(metadata: Record<string, unknown>): boolean {
  return metadata.sceneStatus !== undefined || metadata.beatType !== undefined || metadata.summary !== undefined;
}
