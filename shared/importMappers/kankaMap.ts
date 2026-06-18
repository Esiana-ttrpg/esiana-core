import type { KankaMapPlan } from '../virtualNarrativeEntry.js';

type KankaMapMarker = {
  label: string;
  x: number;
  y: number;
  targetKankaEntityId?: string;
  kankaMarkerId: string;
  groupName?: string;
  visibility: string;
};

type KankaMapGroup = {
  kankaGroupId: string;
  name: string;
  sortOrder: number;
};

export type KankaMapMapResult = {
  kankaMapId: string;
  kankaMapPlan: KankaMapPlan;
};

function readNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function markerVisibility(marker: Record<string, unknown>): string {
  const visibility = marker.visibility;
  if (typeof visibility === 'string' && visibility.toLowerCase() === 'private') {
    return 'DM_Only';
  }
  return 'Party';
}

function markerLabel(marker: Record<string, unknown>): string {
  const name = typeof marker.name === 'string' ? marker.name.trim() : '';
  if (name) return name;
  const entity =
    marker.entity && typeof marker.entity === 'object'
      ? (marker.entity as Record<string, unknown>)
      : null;
  const entityName = typeof entity?.name === 'string' ? entity.name.trim() : '';
  return entityName || 'Pin';
}

function markerTargetId(marker: Record<string, unknown>): string | undefined {
  const entity =
    marker.entity && typeof marker.entity === 'object'
      ? (marker.entity as Record<string, unknown>)
      : null;
  if (!entity) return undefined;
  const entityId = entity.entity_id ?? entity.id;
  if (typeof entityId === 'number') return String(entityId);
  if (typeof entityId === 'string' && entityId.trim()) return entityId.trim();
  return undefined;
}

export function extractKankaMapId(raw: Record<string, unknown>): string | null {
  const entity =
    raw.entity && typeof raw.entity === 'object'
      ? (raw.entity as Record<string, unknown>)
      : null;
  const fromEntity = entity?.id;
  if (typeof fromEntity === 'number') return String(fromEntity);
  if (typeof fromEntity === 'string' && fromEntity.trim()) return fromEntity.trim();
  if (typeof raw.id === 'number') return String(raw.id);
  if (typeof raw.id === 'string' && raw.id.trim()) return raw.id.trim();
  return null;
}

export function mapKankaMapFields(raw: Record<string, unknown>): KankaMapMapResult | null {
  const kankaMapId = extractKankaMapId(raw);
  if (!kankaMapId) return null;

  const entity =
    raw.entity && typeof raw.entity === 'object'
      ? (raw.entity as Record<string, unknown>)
      : {};
  const imagePath =
    (typeof entity.image_path === 'string' ? entity.image_path : null) ??
    (typeof raw.image_path === 'string' ? raw.image_path : null);

  const width = readNumber(raw.width, readNumber(entity.width, 2048));
  const height = readNumber(raw.height, readNumber(entity.height, 1536));

  const groupNameById = new Map<number, string>();
  const groups: KankaMapGroup[] = [];
  if (Array.isArray(raw.groups)) {
    for (const group of raw.groups) {
      if (!group || typeof group !== 'object') continue;
      const row = group as Record<string, unknown>;
      const id = typeof row.id === 'number' ? row.id : null;
      const name = typeof row.name === 'string' ? row.name.trim() : '';
      if (id == null || !name) continue;
      groupNameById.set(id, name);
      groups.push({
        kankaGroupId: String(id),
        name,
        sortOrder: readNumber(row.position, groups.length),
      });
    }
  }

  const markers: KankaMapMarker[] = [];
  if (Array.isArray(raw.markers)) {
    for (const marker of raw.markers) {
      if (!marker || typeof marker !== 'object') continue;
      const row = marker as Record<string, unknown>;
      const markerId = row.id;
      if (typeof markerId !== 'number') continue;
      const groupId = typeof row.group_id === 'number' ? row.group_id : null;
      markers.push({
        kankaMarkerId: String(markerId),
        label: markerLabel(row),
        x: readNumber(row.longitude, 0),
        y: readNumber(row.latitude, 0),
        targetKankaEntityId: markerTargetId(row),
        groupName: groupId != null ? groupNameById.get(groupId) : undefined,
        visibility: markerVisibility(row),
      });
    }
  }

  return {
    kankaMapId,
    kankaMapPlan: {
      imagePath: imagePath?.trim() || null,
      width,
      height,
      groups,
      markers,
    },
  };
}
