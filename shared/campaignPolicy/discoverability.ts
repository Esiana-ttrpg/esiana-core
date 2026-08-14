/**
 * Layer 1 — campaign container discoverability (not a membership role).
 */

export const CampaignDiscoverability = {
  PRIVATE: 'private',
  PUBLIC: 'public',
} as const;

/** Legacy DB/API value; normalized to private on read. */
export const LEGACY_DISCOVERABILITY_UNLISTED = 'unlisted';

export type CampaignDiscoverabilityValue =
  (typeof CampaignDiscoverability)[keyof typeof CampaignDiscoverability];

const DISCOVERABILITY_VALUES = new Set<string>(Object.values(CampaignDiscoverability));

export function isValidDiscoverability(
  value: string | null | undefined,
): value is CampaignDiscoverabilityValue {
  return typeof value === 'string' && DISCOVERABILITY_VALUES.has(value);
}

/** Accepts private, public, or legacy unlisted (maps to private). Returns null if unrecognized. */
export function parseDiscoverabilityInput(
  value: string | null | undefined,
): CampaignDiscoverabilityValue | null {
  if (value === LEGACY_DISCOVERABILITY_UNLISTED) {
    return CampaignDiscoverability.PRIVATE;
  }
  if (isValidDiscoverability(value)) return value;
  return null;
}

export function normalizeDiscoverability(
  value: string | null | undefined,
): CampaignDiscoverabilityValue {
  if (value === LEGACY_DISCOVERABILITY_UNLISTED) {
    return CampaignDiscoverability.PRIVATE;
  }
  if (isValidDiscoverability(value)) return value;
  return CampaignDiscoverability.PRIVATE;
}

export function resolveDiscoverability(
  discoverability: CampaignDiscoverabilityValue | string | null | undefined,
): CampaignDiscoverabilityValue {
  return normalizeDiscoverability(discoverability);
}

export function allowsAnonymousCampaignView(
  discoverability: CampaignDiscoverabilityValue | string,
): boolean {
  return normalizeDiscoverability(discoverability) === CampaignDiscoverability.PUBLIC;
}

/** Listed on Global Hub / recruitment marketplace index. */
export function isListedOnGlobalHub(
  discoverability: CampaignDiscoverabilityValue,
): boolean {
  return discoverability === CampaignDiscoverability.PUBLIC;
}

/** When LFG is enabled, discoverability must be at least public. */
export function discoverabilityWithLfg(
  discoverability: CampaignDiscoverabilityValue,
  isLookingForGroup: boolean,
): CampaignDiscoverabilityValue {
  if (isLookingForGroup && discoverability !== CampaignDiscoverability.PUBLIC) {
    return CampaignDiscoverability.PUBLIC;
  }
  return discoverability;
}
