export type ImportSourceFormat = 'obsidian' | 'kanka-json';

export type VirtualNarrativeDeferredRef = {
  kankaEntityId: string;
  field: string;
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
};
