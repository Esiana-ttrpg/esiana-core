/** Narrow viewports prefer CSS editorial flow over layout drag grid. */
export const MOBILE_EDITORIAL_BREAKPOINT_PX = 768;

export function shouldPreferEditorialLayoutOnViewport(widthPx: number): boolean {
  return widthPx > 0 && widthPx < MOBILE_EDITORIAL_BREAKPOINT_PX;
}

export function layoutGridDefaultOnEditForViewport(
  profileDefault: boolean,
  widthPx: number,
): boolean {
  if (shouldPreferEditorialLayoutOnViewport(widthPx)) return false;
  return profileDefault;
}
