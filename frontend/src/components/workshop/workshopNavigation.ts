/** Whether WorkshopSection may sync draft params into the URL. */
export function shouldSyncWorkshopUrl(search: string, isActive: boolean): boolean {
  if (!isActive) return false;
  const params = new URLSearchParams(search);
  return params.get('section') === 'workshop';
}

/** Builds the workshop section search string for a draft (or picker when draftId is null). */
export function buildWorkshopSyncSearch(search: string, draftId: string | null): string {
  const params = new URLSearchParams(search);
  params.set('section', 'workshop');
  if (draftId) {
    params.set('draft', draftId);
  } else {
    params.delete('draft');
  }
  params.delete('anchors');
  return `?${params.toString()}`;
}
