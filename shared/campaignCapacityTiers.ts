/**
 * Campaign capacity tiers for operator guidance and profiling.
 * v1 classification uses entity counts only; asset fields are reserved for v2.
 */

export type CampaignCapacityTier = 'small' | 'medium' | 'large';

export type CampaignCapacityHeadroom = 'comfortable' | 'approaching' | 'exceeds';

export interface CampaignSizeSnapshot {
  pageCount: number;
  characterCount: number;
  locationCount: number;
  organizationCount: number;
  sessionCount: number;
  mapCount: number;
  /** Total campaign assets (maps, portraits, audio, etc.) */
  assetCount: number;
  /** Sum of asset bytes when known; 0 when storage backend cannot aggregate */
  assetStorageBytes: number;
}

export interface CampaignTierThresholds {
  pageCount: number;
  characterCount: number;
  locationCount: number;
  organizationCount: number;
  sessionCount: number;
  mapCount: number;
}

export interface CampaignTierClassification {
  tier: CampaignCapacityTier;
  headroom: CampaignCapacityHeadroom;
  /** Next tier when approaching limits; null when already at large/exceeds */
  nextTier: CampaignCapacityTier | null;
}

export interface RecommendedDeployment {
  cpu: string;
  ram: string;
  database: string;
  storage?: string;
  summary: string;
}

export const CAMPAIGN_TIER_THRESHOLDS: Record<CampaignCapacityTier, CampaignTierThresholds> = {
  small: {
    pageCount: 100,
    characterCount: 50,
    locationCount: 25,
    organizationCount: 10,
    sessionCount: 25,
    mapCount: 2,
  },
  medium: {
    pageCount: 1000,
    characterCount: 300,
    locationCount: 150,
    organizationCount: 50,
    sessionCount: 100,
    mapCount: 10,
  },
  large: {
    pageCount: 5000,
    characterCount: 1000,
    locationCount: 500,
    organizationCount: 200,
    sessionCount: 500,
    mapCount: 50,
  },
};

const TIER_ORDER: CampaignCapacityTier[] = ['small', 'medium', 'large'];

function ratioOf(snapshot: CampaignSizeSnapshot, thresholds: CampaignTierThresholds): number {
  const ratios = [
    snapshot.pageCount / thresholds.pageCount,
    snapshot.characterCount / thresholds.characterCount,
    snapshot.locationCount / thresholds.locationCount,
    snapshot.organizationCount / thresholds.organizationCount,
    snapshot.sessionCount / thresholds.sessionCount,
    snapshot.mapCount / thresholds.mapCount,
  ];
  return Math.max(...ratios, 0);
}

function tierForSnapshot(snapshot: CampaignSizeSnapshot): CampaignCapacityTier {
  if (ratioOf(snapshot, CAMPAIGN_TIER_THRESHOLDS.large) > 1) {
    return 'large';
  }
  if (ratioOf(snapshot, CAMPAIGN_TIER_THRESHOLDS.medium) > 1) {
    return 'large';
  }
  if (ratioOf(snapshot, CAMPAIGN_TIER_THRESHOLDS.small) > 1) {
    return 'medium';
  }
  return 'small';
}

function headroomForTier(
  snapshot: CampaignSizeSnapshot,
  tier: CampaignCapacityTier,
): CampaignCapacityHeadroom {
  const thresholds = CAMPAIGN_TIER_THRESHOLDS[tier];
  const ratio = ratioOf(snapshot, thresholds);
  if (ratio > 1) return 'exceeds';
  if (ratio >= 0.85) return 'approaching';
  return 'comfortable';
}

function nextTier(tier: CampaignCapacityTier): CampaignCapacityTier | null {
  const idx = TIER_ORDER.indexOf(tier);
  if (idx < 0 || idx >= TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1] ?? null;
}

/** Classify campaign size by entity counts (v1 — ignores asset metrics). */
export function classifyCampaignTier(snapshot: CampaignSizeSnapshot): CampaignTierClassification {
  const tier = tierForSnapshot(snapshot);
  return {
    tier,
    headroom: headroomForTier(snapshot, tier),
    nextTier: nextTier(tier),
  };
}

export function recommendedDeploymentForTier(tier: CampaignCapacityTier): RecommendedDeployment {
  switch (tier) {
    case 'small':
      return {
        cpu: '2 CPU',
        ram: '2 GB RAM',
        database: 'SQLite or PostgreSQL',
        summary: 'Suitable for a solo GM or small group on a modest VPS.',
      };
    case 'medium':
      return {
        cpu: '2–4 CPU',
        ram: '4 GB RAM',
        database: 'PostgreSQL recommended',
        summary: 'Comfortable for an active multi-year campaign with several collaborators.',
      };
    case 'large':
      return {
        cpu: '4 CPU',
        ram: '8 GB RAM',
        database: 'PostgreSQL',
        storage: 'Object storage recommended for media-heavy archives',
        summary: 'Plan for a long-running archive with substantial lore and map assets.',
      };
    default:
      return recommendedDeploymentForTier('small');
  }
}

export function tierLabel(tier: CampaignCapacityTier): string {
  switch (tier) {
    case 'small':
      return 'Small Campaign';
    case 'medium':
      return 'Medium Campaign';
    case 'large':
      return 'Large Campaign';
    default:
      return 'Small Campaign';
  }
}
