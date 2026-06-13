"use strict";
/**
 * Workspace-scoped public path keys (derived from titles, not global slugs).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePathKey = normalizePathKey;
exports.pathKeyFromTitle = pathKeyFromTitle;
exports.isPathKeyReserved = isPathKeyReserved;
exports.generatePathKeyFromTitle = generatePathKeyFromTitle;
exports.syncPathKeyOnRename = syncPathKeyOnRename;
function normalizePathKey(raw) {
    const trimmed = raw.trim().toLowerCase();
    if (!trimmed)
        return '';
    let key = trimmed
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
    key = key.replace(/[^a-z0-9]+$/g, '').replace(/-+$/g, '');
    return key;
}
/** Lenient path key from a wiki page title. */
function pathKeyFromTitle(title) {
    const trimmed = title.trim();
    if (!trimmed)
        return '';
    const strict = trimmed
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
    if (strict.length >= 1 && strict.length <= 80) {
        return strict;
    }
    return normalizePathKey(trimmed);
}
function isPathKeyReserved(pathKey, reserved) {
    if (!pathKey)
        return true;
    return reserved.has(pathKey);
}
/**
 * Generate a unique pathKey within a workspace from a title.
 * Appends -2, -3, … on collision.
 */
function generatePathKeyFromTitle(title, taken, reserved = new Set()) {
    const base = pathKeyFromTitle(title) || 'untitled';
    if (!taken.has(base) && !isPathKeyReserved(base, reserved)) {
        return base;
    }
    for (let n = 2; n < 10_000; n += 1) {
        const candidate = `${base}-${n}`;
        if (!taken.has(candidate) && !isPathKeyReserved(candidate, reserved)) {
            return candidate;
        }
    }
    return `${base}-${Date.now()}`;
}
/** Recompute pathKey when title changes; keeps current key if still unique. */
function syncPathKeyOnRename(currentPathKey, newTitle, taken, reserved = new Set()) {
    const nextBase = pathKeyFromTitle(newTitle) || 'untitled';
    if (currentPathKey === nextBase)
        return nextBase;
    const others = new Set(taken);
    if (currentPathKey)
        others.delete(currentPathKey);
    if (!others.has(nextBase) && !isPathKeyReserved(nextBase, reserved)) {
        return nextBase;
    }
    return generatePathKeyFromTitle(newTitle, others, reserved);
}
//# sourceMappingURL=pathKeyUtils.js.map