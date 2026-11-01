/** Return null when all tabs fit, otherwise the prefix that fits beside More. */
export function fitEntitySubviewTabs(
  tabWidths: number[],
  availableWidth: number,
  moreWidth: number,
  gap: number,
): number | null {
  const total = tabWidths.reduce((sum, width) => sum + width, 0)
    + Math.max(0, tabWidths.length - 1) * gap;
  if (total <= availableWidth) return null;

  let used = moreWidth;
  let count = 0;
  for (const width of tabWidths) {
    if (used + gap + width > availableWidth) break;
    used += gap + width;
    count += 1;
  }
  return count;
}
