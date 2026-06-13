export type InspectorMode = 'properties' | 'lore' | 'relationships' | 'discovery';

export const INSPECTOR_MODES: { id: InspectorMode; label: string }[] = [
  { id: 'properties', label: 'Properties' },
  { id: 'lore', label: 'Lore' },
  { id: 'relationships', label: 'Relationships' },
  { id: 'discovery', label: 'Discovery' },
];

export const LORE_SECTION_IDS = new Set([
  'identity-history',
  'interpretations',
  'sources',
]);
const RELATIONSHIP_SECTION_IDS = new Set([
  'relationships',
  'lineage',
  'diplomacy',
]);

export function resolveInspectorSectionMode(sectionId: string): InspectorMode {
  if (LORE_SECTION_IDS.has(sectionId)) return 'lore';
  if (RELATIONSHIP_SECTION_IDS.has(sectionId)) return 'relationships';
  return 'properties';
}

export const INSPECTOR_MODE_STORAGE_PREFIX = 'entity-inspector-mode:';

export function loadInspectorMode(pageId: string): InspectorMode {
  if (typeof window === 'undefined') return 'properties';
  const raw = window.sessionStorage.getItem(`${INSPECTOR_MODE_STORAGE_PREFIX}${pageId}`);
  if (raw === 'lore' || raw === 'relationships' || raw === 'discovery' || raw === 'properties') {
    return raw;
  }
  return 'properties';
}

export function saveInspectorMode(pageId: string, mode: InspectorMode): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(`${INSPECTOR_MODE_STORAGE_PREFIX}${pageId}`, mode);
}
