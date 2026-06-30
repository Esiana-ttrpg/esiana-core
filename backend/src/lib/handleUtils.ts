import {
  buildCampaignHandleFromName,
  getCampaignNameHandleError,
} from '../../../shared/campaignHandle.js';

export { getCampaignNameHandleError };

/**
 * Handle utilities: validation, generation, and normalization.
 * Handles are URL-safe identifiers: lowercase, alphanumeric + hyphens, 3-50 chars.
 */

/**
 * Validates if a string is a valid handle format.
 * Rules: lowercase letters/digits/hyphens, 3-50 chars, no leading/trailing hyphens.
 */
export function isValidHandle(handle: string): boolean {
  if (!handle || typeof handle !== 'string') return false;
  const trimmed = handle.trim();
  if (trimmed.length < 3 || trimmed.length > 50) return false;
  if (trimmed.startsWith('-') || trimmed.endsWith('-')) return false;
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(trimmed);
}

/**
 * Generates a URL-safe handle from a campaign name.
 */
export function generateHandle(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new Error('Campaign name is required to generate handle');
  }

  return buildCampaignHandleFromName(name);
}

/**
 * Generates a unique handle by appending a numeric suffix if needed.
 */
export function makeUniqueHandle(
  baseHandle: string,
  existingHandles: Set<string>,
): string {
  let candidateHandle = baseHandle;
  let counter = 1;

  while (existingHandles.has(candidateHandle)) {
    const suffix = `-${counter}`;
    const maxBaseLen = 50 - suffix.length;
    candidateHandle = baseHandle.substring(0, maxBaseLen) + suffix;
    counter++;
  }

  return candidateHandle;
}
