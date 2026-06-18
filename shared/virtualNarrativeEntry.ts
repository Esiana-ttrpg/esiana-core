export type ImportSourceFormat = 'obsidian' | 'kanka-json';

export type VirtualNarrativeDeferredRef = {
  kankaEntityId: string;
  field: string;
};

export type KankaMapMarkerPlan = {
  label: string;
  x: number;
  y: number;
  targetKankaEntityId?: string;
  kankaMarkerId: string;
  groupName?: string;
  visibility: string;
};

export type KankaMapGroupPlan = {
  kankaGroupId: string;
  name: string;
  sortOrder: number;
};

export type KankaMapPlan = {
  imagePath: string | null;
  width: number;
  height: number;
  groups: KankaMapGroupPlan[];
  markers: KankaMapMarkerPlan[];
};

export type VirtualNarrativeEntry = {
  id: string;
  title: string;
  type: string;
  body: string;
  frontmatter: Record<string, unknown>;
  source: ImportSourceFormat;
  sourcePath: string;
  externalId?: string;
  parentExternalId?: string;
  characterMetadata?: Record<string, unknown>;
  deferredRefs?: VirtualNarrativeDeferredRef[];
  kankaMapId?: string;
  kankaMapPlan?: KankaMapPlan;
};
