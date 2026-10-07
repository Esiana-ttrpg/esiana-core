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

/**
 * Draft tabs to open on Workshop bootstrap.
 * Bare visits with no primary draft and no session tabs yield an empty workspace —
 * never invent a "most recent" campaign draft as a destination hub.
 */
export function resolveWorkshopBootstrapOpenIds(input: {
  primaryDraftId: string | null;
  sessionOpenDraftIds: readonly string[];
}): string[] {
  const sessionIds = [...input.sessionOpenDraftIds];
  if (!input.primaryDraftId) return sessionIds;
  return [
    input.primaryDraftId,
    ...sessionIds.filter((id) => id !== input.primaryDraftId),
  ];
}
