/** Build a partial patch of keys that differ between source and draft (JSON compare). */
export function diffRecordPatch<T extends object>(
  source: T,
  draft: T,
  keys: readonly (keyof T)[],
): Partial<T> {
  const patch: Partial<T> = {};
  for (const key of keys) {
    if (JSON.stringify(source[key]) !== JSON.stringify(draft[key])) {
      patch[key] = draft[key];
    }
  }
  return patch;
}
