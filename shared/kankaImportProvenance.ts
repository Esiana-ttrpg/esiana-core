export const KANKA_IMPORT_REPORT_TITLE = 'Import Report';

export type KankaImportMetadata = {
  sourcePath?: string;
  module?: string;
  slug?: string;
  tags?: string[];
  blurb?: string;
  infoboxCustomFields?: Record<string, string>;
  kankaEntityId?: string;
  kankaMapId?: string;
  kankaImportReport?: boolean;
};

export function readImportMetadata(metadata: unknown): KankaImportMetadata | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const root = metadata as Record<string, unknown>;
  const importMetadata = root.importMetadata;
  if (!importMetadata || typeof importMetadata !== 'object') return null;
  return importMetadata as KankaImportMetadata;
}

export function readKankaEntityId(metadata: unknown): string | null {
  const value = readImportMetadata(metadata)?.kankaEntityId;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function readKankaMapId(metadata: unknown): string | null {
  const value = readImportMetadata(metadata)?.kankaMapId;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function isKankaImportReportPage(metadata: unknown, title: string): boolean {
  if (title !== KANKA_IMPORT_REPORT_TITLE) return false;
  return readImportMetadata(metadata)?.kankaImportReport === true;
}

export function readKankaAssetSourcePath(imageCredit: unknown): string | null {
  if (!imageCredit || typeof imageCredit !== 'object') return null;
  const value = (imageCredit as Record<string, unknown>).kankaImportSourcePath;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function readKankaMarkerId(style: unknown): string | null {
  if (!style || typeof style !== 'object') return null;
  const value = (style as Record<string, unknown>).kankaMarkerId;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
