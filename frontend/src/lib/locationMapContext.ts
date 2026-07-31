import { campaignPath } from '@/lib/campaignPaths';
import { parseLocationMetadata } from '@/lib/locationMetadata';
import type { WikiTreeNode } from '@/types/wiki';

export type LocationMapContextKind = 'world' | 'local' | 'interior' | 'generic';

export interface LocationMapContextEntry {
  mapAssetId: string;
  label: string;
  kind: LocationMapContextKind;
  pinId?: string | null;
  href: string;
  isPrimary: boolean;
}

function inferMapContextKind(title: string): LocationMapContextKind {
  const lower = title.toLowerCase();
  if (/floor|interior|dungeon|sewer|cellar|level/.test(lower)) return 'interior';
  if (/world|region|kingdom|continent|realm|map of/.test(lower)) return 'world';
  if (/city|town|district|local|village|harbor/.test(lower)) return 'local';
  return 'generic';
}

export interface BuildLocationMapContextInput {
  campaignHandle: string;
  locationPageId: string;
  pageMetadata: unknown;
  mapAssetId?: string | null;
  /** Optional preloaded campaign maps (id + title). */
  campaignMaps?: Array<{ id: string; title: string }>;
  /** Pins targeting this location: assetId, pinId, optional label. */
  pinTargets?: Array<{ mapAssetId: string; pinId: string; label?: string | null }>;
}

export function buildLocationMapContexts(
  input: BuildLocationMapContextInput,
): LocationMapContextEntry[] {
  const { campaignHandle, pageMetadata, mapAssetId, campaignMaps = [], pinTargets = [] } =
    input;
  const locationMeta = parseLocationMetadata(pageMetadata);
  const byAsset = new Map<string, LocationMapContextEntry>();

  function upsert(
    assetId: string,
    label: string,
    opts?: { pinId?: string | null; forcePrimary?: boolean },
  ): void {
    const mapTitle =
      campaignMaps.find((m) => m.id === assetId)?.title ?? label;
    const kind = inferMapContextKind(mapTitle);
    const href = campaignPath(campaignHandle, 'maps', assetId);
    const existing = byAsset.get(assetId);
    if (!existing) {
      byAsset.set(assetId, {
        mapAssetId: assetId,
        label: mapTitle,
        kind,
        pinId: opts?.pinId ?? null,
        href,
        isPrimary: Boolean(opts?.forcePrimary),
      });
      return;
    }
    if (opts?.pinId && !existing.pinId) {
      existing.pinId = opts.pinId;
    }
    if (opts?.forcePrimary) {
      existing.isPrimary = true;
    }
  }

  if (mapAssetId) {
    upsert(mapAssetId, 'Map', { forcePrimary: true });
  }

  if (locationMeta.mapPageId) {
    const mapPage = campaignMaps.find((m) => m.id === locationMeta.mapPageId);
    if (mapPage) {
      upsert(mapPage.id, mapPage.title, { forcePrimary: !mapAssetId });
    }
  }

  for (const pin of pinTargets) {
    upsert(pin.mapAssetId, pin.label ?? 'Map', { pinId: pin.pinId });
  }

  const entries = [...byAsset.values()];
  if (entries.length === 0) return [];

  if (!entries.some((e) => e.isPrimary)) {
    entries[0]!.isPrimary = true;
  }

  entries.sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
  });

  return entries;
}

export function formatMapContextKindLabel(kind: LocationMapContextKind): string {
  switch (kind) {
    case 'world':
      return 'World / region map';
    case 'local':
      return 'Local map';
    case 'interior':
      return 'Interior / floor plan';
    default:
      return 'Map';
  }
}
