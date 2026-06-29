/** Normalize a campaign display name into a URL handle seed (before uniqueness suffixes). */
export function normalizeCampaignHandleSeed(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Returns a user-facing validation error, or null when a handle can be generated. */
export function getCampaignNameHandleError(name: string): string | null {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return 'Campaign name is required';
  }

  let handle = normalizeCampaignHandleSeed(name);
  if (handle.length < 3) {
    return 'Campaign name must contain at least 3 alphanumeric characters';
  }

  if (handle.length > 50) {
    handle = handle.substring(0, 50).replace(/-+$/, '');
    if (handle.length < 3) {
      return 'Campaign name too short after handle generation';
    }
  }

  return null;
}

/** Build the base campaign handle from a display name. */
export function buildCampaignHandleFromName(name: string): string {
  const validationError = getCampaignNameHandleError(name);
  if (validationError) {
    throw new Error(validationError);
  }

  let handle = normalizeCampaignHandleSeed(name);
  if (handle.length > 50) {
    handle = handle.substring(0, 50).replace(/-+$/, '');
  }
  return handle;
}
