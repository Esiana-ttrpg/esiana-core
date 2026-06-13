/**
 * Thread creation wizard copy, body seeds, and contextual kind suggestions.
 */
import type { ThreadKind } from './threadMetadata.js';
export interface ThreadKindCreateCopy {
    label: string;
    example: string;
    description: string;
}
export declare const THREAD_KIND_CREATE_COPY: Record<ThreadKind, ThreadKindCreateCopy>;
export declare function buildThreadBodyMarkdown(kind: ThreadKind): string;
/** Suggest a default kind when creating from an entity wiki page context. */
export declare function suggestThreadKindFromContext(entityCategoryKey: string | null | undefined): ThreadKind;
//# sourceMappingURL=threadCreate.d.ts.map