/**
 * User-facing copy for chronology convergence feed entries.
 * Leaf module — no imports from narrativeProjection, rumorEngine, or chronologyTypes
 * (avoids circular init with loreKnowledge ↔ chronologyTypes).
 */
const SPREAD_PAYLOAD_VERSION = 'spreadAction-v1';

import {
  formatProjectionVisibilityTier,
  shouldShowProjectionVisibilityBadge,
} from './visibilityTier.js';

const LINK_LABELS: Record<string, string> = {
  event_lore: 'View event',
  chronology_events: 'Events ledger',
  session_note: 'Session note',
  map_scene: 'Map scene',
  wiki_page: 'Wiki page',
  world_advance_batch: 'World advance',
  downtime_hub: 'Downtime hub',
};

const RUMOR_STANCE_LABELS: Record<string, string> = {
  asserts: 'Asserted as true',
  denies: 'Denied',
  distorts: 'Distorted retelling',
  mythologizes: 'Mythologized',
  satirizes: 'Satirical spin',
};

type SpreadPayload = {
  version?: string;
  stance?: string;
  visibility?: string;
  targets?: Array<{ kind?: string }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function parseSpreadPayload(description: string): SpreadPayload | null {
  const trimmed = description.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!isRecord(parsed) || parsed.version !== SPREAD_PAYLOAD_VERSION) return null;
    return parsed as SpreadPayload;
  } catch {
    return null;
  }
}

function formatRumorStance(raw: string | undefined): string | null {
  if (!raw) return null;
  return RUMOR_STANCE_LABELS[raw.toLowerCase()] ?? null;
}

function formatCirculationVisibility(raw: string | undefined): string | null {
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (upper === 'PARTY') return 'Party-visible circulation';
  if (upper === 'GM_ONLY') return 'GM-only circulation';
  return null;
}

function formatSpreadTargetCount(targets: SpreadPayload['targets']): string | null {
  if (!targets?.length) return null;
  const regionCount = targets.filter((t) => t.kind === 'region').length;
  const factionCount = targets.filter((t) => t.kind === 'faction').length;
  const parts: string[] = [];
  if (regionCount > 0) {
    parts.push(`${regionCount} region${regionCount === 1 ? '' : 's'}`);
  }
  if (factionCount > 0) {
    parts.push(`${factionCount} faction${factionCount === 1 ? '' : 's'}`);
  }
  if (parts.length === 0) {
    return `${targets.length} target${targets.length === 1 ? '' : 's'}`;
  }
  return parts.join(', ');
}

export function formatConvergenceVisibilityTier(tier: string): string {
  return formatProjectionVisibilityTier(tier);
}

export function shouldShowConvergenceVisibilityBadge(tier: string): boolean {
  return shouldShowProjectionVisibilityBadge(tier);
}

export function formatConvergenceLinkLabel(hrefKind: string): string {
  return LINK_LABELS[hrefKind] ?? hrefKind.replace(/_/g, ' ');
}

export function formatConvergenceFeedTitle(title: string): string {
  if (title.startsWith('Rumor spread: ')) {
    return `Rumor circulated: ${title.slice('Rumor spread: '.length)}`;
  }
  return title;
}

export function formatWorldEventFeedSummary(
  description: string | null | undefined,
): string | null {
  if (!description?.trim()) return null;

  const spread = parseSpreadPayload(description);
  if (spread) {
    const parts = [
      formatRumorStance(spread.stance),
      formatCirculationVisibility(spread.visibility),
      formatSpreadTargetCount(spread.targets),
    ].filter((part): part is string => Boolean(part));
    return parts.length > 0 ? parts.join(' · ') : 'Rumor circulation recorded';
  }

  const trimmed = description.trim();
  if (trimmed.startsWith('{')) return null;
  return trimmed.length > 240 ? `${trimmed.slice(0, 237)}…` : trimmed;
}

export function formatConvergenceEntrySummary(input: {
  title: string;
  summary: string | null | undefined;
}): string | null {
  return formatWorldEventFeedSummary(input.summary) ?? null;
}
