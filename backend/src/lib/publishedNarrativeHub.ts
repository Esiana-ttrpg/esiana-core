import {
  projectPublishedNarrative,
  type PublishedNarrativeSubjectKind,
} from '../../../shared/narrativeProjection.js';
import type { NarrativeViewerContext } from '../../../shared/narrativeProjection.js';
import type { NarrativeLifecycleState } from '../../../shared/narrativeLifecycle.js';

/** Layer 2 — hub surfaces use unified published projection for block payloads. */
export function projectHubPageBlocks(input: {
  subjectKind: PublishedNarrativeSubjectKind;
  blocks: unknown;
  metadata: unknown;
  visibility: string;
  lifecycleState: NarrativeLifecycleState;
  viewerContext: NarrativeViewerContext;
}): unknown[] {
  const artifact = projectPublishedNarrative({
    subjectKind: input.subjectKind,
    blocks: input.blocks,
    metadata: input.metadata,
    visibility: input.visibility,
    viewerContext: input.viewerContext,
    lifecycleState: input.lifecycleState,
  });
  return artifact.included ? artifact.blocks : [];
}
