/**
 * Thread kind display order and labels for hub grouping (extensible without render rewrites).
 */
import { type ThreadKind } from './threadMetadata.js';
/** Authored kinds only — theories render in a separate hub zone. */
export declare const THREAD_KIND_DISPLAY_ORDER: readonly ThreadKind[];
export declare const THREAD_KIND_GROUP_LABELS: Record<ThreadKind, string>;
export declare function isAuthoredThreadKind(kind: ThreadKind): boolean;
export declare function isPlayerTheoryThread(kind: ThreadKind, playerSubmitted: boolean): boolean;
export declare function allThreadKinds(): readonly ThreadKind[];
//# sourceMappingURL=threadDisplay.d.ts.map