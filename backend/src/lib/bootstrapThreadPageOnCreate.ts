import type { NarrativeLifecycleState } from '../../../shared/narrativeLifecycle.js';
import { NarrativeLifecycleStates } from '../../../shared/narrativeLifecycle.js';
import { buildThreadBodyMarkdown } from '../../../shared/threadCreate.js';
import {
  coerceThreadStatusForLifecycle,
  defaultThreadStatusForLifecycle,
} from '../../../shared/threadLifecycleMatrix.js';
import {
  parseThreadKindStrict,
  parseThreadNarrativeWeightStrict,
  parseThreadMetadata,
  type ThreadMetadataFields,
  type ThreadStatus,
} from '../../../shared/threadMetadata.js';
import { buildThreadDefaultBlocks } from './pageTemplates.js';
import {
  mergeThreadMetadata,
  stampThreadSessionAnchors,
} from './threadMetadata.js';

const WIZARD_LIFECYCLE_VALUES = new Set<NarrativeLifecycleState>([
  NarrativeLifecycleStates.LOCKED,
  NarrativeLifecycleStates.DISCOVERED,
  NarrativeLifecycleStates.ACTIVE,
]);

export type ThreadCreateBootstrapInput = {
  metadata: Record<string, unknown>;
  initialThreadLifecycle?: unknown;
  blocks?: Array<Record<string, unknown>> | null;
};

export type ThreadCreateBootstrapResult =
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

export function bootstrapThreadPageOnCreate(
  input: ThreadCreateBootstrapInput,
): ThreadCreateBootstrapResult {
  const rawMeta = input.metadata;
  const kindRaw = rawMeta.threadKind;
  if (kindRaw === undefined) {
    return { ok: false, status: 400, error: 'threadKind is required when creating a narrative thread' };
  }
  const kind = parseThreadKindStrict(kindRaw);
  if (!kind) {
    return {
      ok: false,
      status: 400,
      error: 'Invalid threadKind. Allowed: mystery, promise, foreshadowing, clue, theory',
    };
  }

  if (rawMeta.narrativeWeight !== undefined) {
    const weight = parseThreadNarrativeWeightStrict(rawMeta.narrativeWeight);
    if (!weight) {
      return {
        ok: false,
        status: 400,
        error: 'Invalid narrativeWeight. Allowed: minor, major, critical',
      };
    }
  }

  const initialLifecycle = resolveInitialLifecycle(input.initialThreadLifecycle);

  let requestedStatus: ThreadStatus | undefined;
  if (rawMeta.threadStatus !== undefined) {
    const parsed = parseThreadMetadata({ threadStatus: rawMeta.threadStatus });
    requestedStatus = parsed.threadStatus;
  }

  const status =
    requestedStatus !== undefined
      ? coerceThreadStatusForLifecycle(requestedStatus, initialLifecycle)
      : defaultThreadStatusForLifecycle(initialLifecycle);

  const patch: Partial<ThreadMetadataFields> = {
    threadKind: kind,
    threadStatus: status,
    ...(rawMeta.narrativeWeight !== undefined
      ? { narrativeWeight: parseThreadNarrativeWeightStrict(rawMeta.narrativeWeight)! }
      : {}),
    ...(rawMeta.relatedPageIds !== undefined
      ? { relatedPageIds: parseThreadMetadata({ relatedPageIds: rawMeta.relatedPageIds }).relatedPageIds }
      : {}),
    ...(rawMeta.payoffPageId !== undefined
      ? { payoffPageId: parseThreadMetadata({ payoffPageId: rawMeta.payoffPageId }).payoffPageId }
      : {}),
    ...(rawMeta.introducedSessionId !== undefined
      ? {
          introducedSessionId: parseThreadMetadata({
            introducedSessionId: rawMeta.introducedSessionId,
          }).introducedSessionId,
        }
      : {}),
    ...(rawMeta.playerSubmitted !== undefined
      ? {
          playerSubmitted: parseThreadMetadata({
            playerSubmitted: rawMeta.playerSubmitted,
          }).playerSubmitted,
        }
      : {}),
  };

  let mergedFields = parseThreadMetadata(mergeThreadMetadata(rawMeta, patch));
  mergedFields = stampThreadSessionAnchors(mergedFields, { threadStatus: mergedFields.threadStatus }, {
    advancedSessionId: mergedFields.introducedSessionId,
  });
  const metadata = mergeThreadMetadata(rawMeta, mergedFields);

  const markdown = buildThreadBodyMarkdown(kind);
  const blocks =
    Array.isArray(input.blocks) && input.blocks.length > 0
      ? input.blocks
      : (buildThreadDefaultBlocks({ markdown }) as Array<Record<string, unknown>>);

  return {
    ok: true,
    metadata,
    blocks,
    initialLifecycle,
  };
}

export function isExplicitThreadCreate(metadata: Record<string, unknown>): boolean {
  return metadata.threadKind !== undefined;
}
