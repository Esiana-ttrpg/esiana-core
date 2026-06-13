import type { DiscoveryStateProjection } from '@shared/discoveryProjection';
import { parseBestiaryMetadata } from '@/lib/bestiaryMetadata';
import type { CategoryIndexChild } from '@/lib/wiki';
import {
  buildBestiaryIntelProjection,
  maskIntelValue,
  type BestiaryIntelVisibility,
} from '@/lib/bestiaryIdentityProjection';

export type ThreatTier = 'apex' | 'elevated' | 'moderate' | 'unknown';

export interface BestiarySectionThreatPresence {
  knownSpeciesCount: number;
  totalSpeciesCount: number;
  apexThreatCount: number;
  apexActivityDetected: boolean;
}

export interface CreatureCodexTileViewModel {
  childId: string;
  displayName: string;
  biomeLine: string | null;
  threatPresentation: string | null;
  weaknessLine: string | null;
  resistLine: string | null;
  discoveryLabel: string | null;
  portraitUrl: string | null;
  showSilhouette: boolean;
  showPartialBlur: boolean;
  envTint: 'frost' | 'swamp' | 'volcanic' | 'default';
}

export function classifyThreatTier(
  threatLevel: string | null | undefined,
): ThreatTier {
  if (!threatLevel?.trim()) return 'unknown';
  const t = threatLevel.trim().toLowerCase();
  if (
    /apex|extreme|deadly|lethal|★★★★|4\/5|5\/5|5\s*of\s*5/.test(t) ||
    t.includes('★★★★')
  ) {
    return 'apex';
  }
  if (/high|dangerous|severe|★★★|3\/5|4\s*of\s*5/.test(t) || t.includes('★★★')) {
    return 'elevated';
  }
  if (t === '???') return 'unknown';
  return 'moderate';
}

export function formatThreatPresentation(threatLevel: string | null): string | null {
  if (!threatLevel?.trim()) return null;
  const tier = classifyThreatTier(threatLevel);
  if (tier === 'apex') return `★★★★ ${threatLevel.trim()}`;
  if (tier === 'elevated') return `★★★ ${threatLevel.trim()}`;
  if (tier === 'moderate') return threatLevel.trim();
  return threatLevel.trim();
}

export function formatDiscoveryStatusLabel(
  discovery: DiscoveryStateProjection | null | undefined,
): string | null {
  if (!discovery) return null;
  switch (discovery.state) {
    case 'known':
      return 'Catalogued';
    case 'partial':
      return 'Observed';
    case 'rumor':
      return 'Tracked';
    case 'contested':
      return 'Unverified';
    case 'hidden':
      return 'Unknown';
    default:
      return null;
  }
}

export function isCreatureKnownToViewer(
  child: CategoryIndexChild,
  isDMUser: boolean,
): boolean {
  if (isDMUser) return true;
  return child.discovery?.state !== 'hidden';
}

function isThreatVisibleForViewer(
  threatMask: BestiaryIntelVisibility,
  threatLevel: string | null,
): boolean {
  if (!threatLevel?.trim()) return false;
  return maskIntelValue(threatMask, threatLevel) !== '???';
}

export function buildBestiarySectionPresence(
  entries: CategoryIndexChild[],
  isDMUser: boolean,
): BestiarySectionThreatPresence {
  let knownSpeciesCount = 0;
  let apexThreatCount = 0;

  for (const entry of entries) {
    const known = isCreatureKnownToViewer(entry, isDMUser);
    if (known) knownSpeciesCount += 1;

    const intel = buildBestiaryIntelProjection(entry.metadata, entry.discovery, isDMUser);
    const threatVisible = isThreatVisibleForViewer(
      intel.discoveryMask.threat,
      intel.threatLevel,
    );
    if (known && threatVisible && classifyThreatTier(intel.threatLevel) === 'apex') {
      apexThreatCount += 1;
    }
  }

  return {
    knownSpeciesCount,
    totalSpeciesCount: entries.length,
    apexThreatCount,
    apexActivityDetected: apexThreatCount >= 1,
  };
}

export function buildCreatureCodexTileViewModel(
  child: CategoryIndexChild,
  isDMUser: boolean,
): CreatureCodexTileViewModel {
  const intel = buildBestiaryIntelProjection(child.metadata, child.discovery, isDMUser);
  const meta = parseBestiaryMetadata(child.metadata);

  const displayName =
    intel.showSilhouette && intel.unidentifiedLabel
      ? intel.unidentifiedLabel
      : child.title;

  const biomeLine = maskIntelValue(
    intel.discoveryMask.region,
    intel.habitat ?? intel.region,
  );

  const threatPresentation = maskIntelValue(
    intel.discoveryMask.threat,
    formatThreatPresentation(intel.threatLevel),
  );

  const weaknessLine = maskIntelValue(intel.discoveryMask.weaknesses, intel.weaknesses);
  const resistLine = maskIntelValue(intel.discoveryMask.resistances, intel.resistances);

  const showPartialBlur =
    !isDMUser &&
    !intel.showSilhouette &&
    (child.discovery?.state === 'partial' || child.discovery?.state === 'contested');

  const portraitUrl =
    intel.showSilhouette || showPartialBlur ? null : meta.appearance.portraitUrl;

  return {
    childId: child.id,
    displayName,
    biomeLine,
    threatPresentation,
    weaknessLine,
    resistLine,
    discoveryLabel: formatDiscoveryStatusLabel(child.discovery),
    portraitUrl,
    showSilhouette: intel.showSilhouette,
    showPartialBlur,
    envTint: resolveCreatureEnvironmentTintFromMeta(meta.habitat, meta.region),
  };
}

function resolveCreatureEnvironmentTintFromMeta(
  habitat: string | null,
  region: string | null,
): 'frost' | 'swamp' | 'volcanic' | 'default' {
  const haystack = `${habitat ?? ''} ${region ?? ''}`.toLowerCase();
  if (/frost|snow|ice|winter|tundra|cold/.test(haystack)) return 'frost';
  if (/swamp|marsh|bog|mire|fen|wetland/.test(haystack)) return 'swamp';
  if (/volcan|lava|ash|fire|magma|ember/.test(haystack)) return 'volcanic';
  return 'default';
}

export function pickRecentSightings(
  children: CategoryIndexChild[],
  isDMUser: boolean,
  limit = 6,
): CategoryIndexChild[] {
  const eligible = children.filter((child) => {
    if (isDMUser) return true;
    const state = child.discovery?.state;
    return state === 'partial' || state === 'known' || state === 'contested';
  });

  return [...eligible]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

export function filterOnlyCatalogued(
  children: CategoryIndexChild[],
  enabled: boolean,
  isDMUser: boolean,
): CategoryIndexChild[] {
  if (!enabled || isDMUser) return children;
  return children.filter((child) => isCreatureKnownToViewer(child, isDMUser));
}
