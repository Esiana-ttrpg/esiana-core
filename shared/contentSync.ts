export type ContentSyncFieldType = 'text' | 'markdown' | 'image' | 'enum' | 'number' | 'boolean';

export interface ContentSyncFieldDescriptor {
  key: string;
  label: string;
  type: ContentSyncFieldType;
  writable: boolean;
  defaultSelected?: boolean;
  options?: string[];
}

export interface ContentSyncCollectionDescriptor {
  key: string;
  label: string;
  resourceKind: 'wiki-page' | 'journal-publication' | 'calendar-event';
  available: boolean;
  preferredRepresentation: 'journal' | 'actor-optional';
  fields: ContentSyncFieldDescriptor[];
  operations: { create: boolean; update: boolean; delete: false };
  warning?: string;
}

export interface ContentSyncResource {
  collection: string;
  id: string;
  displayName: string;
  fields: Record<string, unknown>;
  visibility: string;
  revision: string;
  modifiedAt: string;
  deleted: boolean;
  operations: { create: boolean; update: boolean; delete: false };
}

export interface ContentSyncMutation {
  baseRevision?: string | null;
  fields: Record<string, unknown>;
  clientMutationId: string;
}

export interface ContentSyncListResult {
  resources: ContentSyncResource[];
  nextCursor: string | null;
}
