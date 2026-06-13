/**
 * Layer 5 — arc hierarchy overlay metadata (soft membership).
 */
export const ARC_METADATA_VERSION = 'arc-metadata-v1';

export const ARC_KINDS = ['campaign_arc', 'questline'] as const;

export type ArcKind = (typeof ARC_KINDS)[number];

export interface ArcMetadataFields {
  arcMetadataVersion: string;
  arcKind: ArcKind;
  containedPageIds: string[];
  actIndex: number | null;
  pacingTarget: string | null;
}

export function normalizeArcKind(raw: unknown): ArcKind {
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    if ((ARC_KINDS as readonly string[]).includes(lower)) {
      return lower as ArcKind;
    }
  }
  return 'campaign_arc';
}

export function normalizeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const ids: string[] = [];
  for (const entry of raw) {
    if (typeof entry === 'string' && entry.trim()) ids.push(entry.trim());
  }
  return [...new Set(ids)];
}

export function parseArcMetadata(metadata: unknown): ArcMetadataFields {
  if (!metadata || typeof metadata !== 'object') {
    return emptyArcMetadata();
  }
  const raw = metadata as Record<string, unknown>;
  return {
    arcMetadataVersion:
      typeof raw.arcMetadataVersion === 'string' && raw.arcMetadataVersion.trim()
        ? raw.arcMetadataVersion.trim()
        : ARC_METADATA_VERSION,
    arcKind: normalizeArcKind(raw.arcKind),
    containedPageIds: normalizeStringArray(raw.containedPageIds),
    actIndex:
      typeof raw.actIndex === 'number' && Number.isFinite(raw.actIndex) ? raw.actIndex : null,
    pacingTarget:
      typeof raw.pacingTarget === 'string' && raw.pacingTarget.trim()
        ? raw.pacingTarget.trim()
        : null,
  };
}

export function emptyArcMetadata(): ArcMetadataFields {
  return {
    arcMetadataVersion: ARC_METADATA_VERSION,
    arcKind: 'campaign_arc',
    containedPageIds: [],
    actIndex: null,
    pacingTarget: null,
  };
}

export function isArcMetadataPresent(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const raw = metadata as Record<string, unknown>;
  return raw.arcKind !== undefined || raw.containedPageIds !== undefined;
}

export function mergeArcMetadata(
  existing: unknown,
  patch: Partial<ArcMetadataFields>,
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object' ? { ...(existing as Record<string, unknown>) } : {};
  const parsed = parseArcMetadata(base);
  const merged: ArcMetadataFields = { ...parsed, ...patch };
  return {
    ...base,
    arcMetadataVersion: merged.arcMetadataVersion,
    arcKind: merged.arcKind,
    containedPageIds: merged.containedPageIds,
    actIndex: merged.actIndex,
    pacingTarget: merged.pacingTarget,
  };
}

export type ArcContainmentChildKind = 'questline' | 'quest' | 'unknown';

export function classifyArcContainmentChild(
  metadata: unknown,
  isQuestPage: boolean,
): ArcContainmentChildKind {
  if (!metadata || typeof metadata !== 'object') {
    return isQuestPage ? 'quest' : 'unknown';
  }
  const arc = parseArcMetadata(metadata);
  if (isArcMetadataPresent(metadata) && arc.arcKind === 'questline') {
    return 'questline';
  }
  if (isQuestPage) return 'quest';
  return 'unknown';
}

export function validateArcContainment(
  parentKind: ArcKind,
  childKind: ArcContainmentChildKind,
): boolean {
  if (parentKind === 'campaign_arc') return childKind === 'questline';
  if (parentKind === 'questline') return childKind === 'quest';
  return false;
}
