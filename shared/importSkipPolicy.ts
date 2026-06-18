export type SkipReasonCode =
  | 'system_module'
  | 'not_supported'
  | 'config'
  | 'metadata_only'
  | 'asset_only';

export const KANKA_SKIP_POLICY: Record<string, SkipReasonCode> = {
  abilities: 'system_module',
  items: 'system_module',
  maps: 'not_supported',
  settings: 'config',
  tags: 'metadata_only',
  w: 'asset_only',
};

export function isKankaSkippedFolder(folderName: string): boolean {
  return Object.prototype.hasOwnProperty.call(KANKA_SKIP_POLICY, folderName.toLowerCase());
}

export function kankaSkipReason(folderName: string): SkipReasonCode | null {
  return KANKA_SKIP_POLICY[folderName.toLowerCase()] ?? null;
}

export const KANKA_SKIP_REASON_LABELS: Record<SkipReasonCode, string> = {
  system_module: 'system data',
  not_supported: 'not supported in v1',
  config: 'campaign config',
  metadata_only: 'metadata only',
  asset_only: 'image assets only',
};
