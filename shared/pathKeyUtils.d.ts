/**
 * Workspace-scoped public path keys (derived from titles, not global slugs).
 */
export declare function normalizePathKey(raw: string): string;
/** Lenient path key from a wiki page title. */
export declare function pathKeyFromTitle(title: string): string;
export declare function isPathKeyReserved(pathKey: string, reserved: ReadonlySet<string>): boolean;
/**
 * Generate a unique pathKey within a workspace from a title.
 * Appends -2, -3, … on collision.
 */
export declare function generatePathKeyFromTitle(title: string, taken: ReadonlySet<string>, reserved?: ReadonlySet<string>): string;
/** Recompute pathKey when title changes; keeps current key if still unique. */
export declare function syncPathKeyOnRename(currentPathKey: string | null | undefined, newTitle: string, taken: ReadonlySet<string>, reserved?: ReadonlySet<string>): string;
//# sourceMappingURL=pathKeyUtils.d.ts.map