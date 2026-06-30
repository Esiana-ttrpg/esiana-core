const HYPHEN = 45;

function isWhitespaceChar(ch: string): boolean {
  return ch.length === 1 && /\s/.test(ch);
}

function trimTrailingHyphens(value: string): string {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === HYPHEN) {
    end -= 1;
  }
  return end === value.length ? value : value.slice(0, end);
}

/** Normalize a campaign display name into a URL handle seed (before uniqueness suffixes). */
export function normalizeCampaignHandleSeed(name: string): string {
  const trimmed = name.trim().toLowerCase();
  let out = '';
  let lastWasHyphen = false;

  for (const ch of trimmed) {
    const code = ch.charCodeAt(0);
    if (isWhitespaceChar(ch)) {
      if (out.length > 0 && !lastWasHyphen) {
        out += '-';
        lastWasHyphen = true;
      }
      continue;
    }

    const isLowerAlpha = code >= 97 && code <= 122;
    const isDigit = code >= 48 && code <= 57;
    if (isLowerAlpha || isDigit) {
      out += ch;
      lastWasHyphen = false;
      continue;
    }

    if (ch === '-') {
      if (out.length > 0 && !lastWasHyphen) {
        out += '-';
        lastWasHyphen = true;
      }
    }
  }

  return trimTrailingHyphens(out);
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
    handle = trimTrailingHyphens(handle.slice(0, 50));
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
    handle = trimTrailingHyphens(handle.slice(0, 50));
  }
  return handle;
}
