export function campaignWorkshopPath(
  handle: string,
  options?: { draftId?: string; fromPageId?: string },
): string {
  const base = `/campaigns/${handle}/workshop`;
  const params = new URLSearchParams();
  if (options?.draftId) params.set('draft', options.draftId);
  if (options?.fromPageId) params.set('from', options.fromPageId);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function readWorkshopDraftIdFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  const draft = params.get('draft')?.trim();
  return draft || null;
}

export function readWorkshopFromPageId(search: string): string | null {
  const params = new URLSearchParams(search);
  const from = params.get('from')?.trim();
  return from || null;
}

export function buildWorkshopSearch(draftId: string | null, fromPageId?: string | null): string {
  const params = new URLSearchParams();
  if (draftId) params.set('draft', draftId);
  if (fromPageId) params.set('from', fromPageId);
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** Legacy progression workshop URLs → dedicated workshop route. */
export function resolveLegacyWorkshopRedirect(
  campaignHandle: string,
  search: string,
): string | null {
  const params = new URLSearchParams(search);
  const section = params.get('section');
  if (section !== 'workshop' && section !== 'authoringWorkshop') return null;

  const draft = params.get('draft');
  const anchors = params.get('anchors');
  const fromPageId = anchors?.split(',')[0]?.trim() || null;

  return campaignWorkshopPath(campaignHandle, {
    draftId: draft ?? undefined,
    fromPageId: fromPageId ?? undefined,
  });
}
