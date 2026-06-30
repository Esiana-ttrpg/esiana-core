/** Fraction of page content changed that qualifies as a substantial revision. */
export const SUBSTANTIAL_REVISION_THRESHOLD = 0.4;

export function isSubstantialRevision(
  wordDelta: number,
  previousWordCount: number,
  newWordCount: number,
): boolean {
  const changeMagnitude = Math.abs(wordDelta);
  if (changeMagnitude === 0) return false;
  const baseline = Math.max(previousWordCount, 1);
  const newBaseline = Math.max(newWordCount, 1);
  return (
    changeMagnitude / baseline >= SUBSTANTIAL_REVISION_THRESHOLD ||
    changeMagnitude / newBaseline >= SUBSTANTIAL_REVISION_THRESHOLD
  );
}

export type SaveWordDeltaMetadata = {
  wordDelta: number;
  previousWordCount: number;
  wordCount: number;
  substantialRevision?: boolean;
};

export function buildSaveWordDeltaMetadata(
  previousWordCount: number,
  newWordCount: number,
  isEdit: boolean,
): SaveWordDeltaMetadata {
  const wordDelta = newWordCount - previousWordCount;
  return {
    wordDelta,
    previousWordCount,
    wordCount: newWordCount,
    ...(isEdit && {
      substantialRevision: isSubstantialRevision(wordDelta, previousWordCount, newWordCount),
    }),
  };
}
