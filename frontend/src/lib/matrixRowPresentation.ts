import type {
  MatrixDocsKey,
  MatrixHelp,
  MatrixRow,
  MatrixSettingsTab,
} from '@shared/campaignPolicy/matrixCatalog';
import type { CampaignRoleCapabilityOverrideRow } from '@shared/campaignPolicy/capabilityOverrides';
import type { MembershipRole } from '@shared/campaignPolicy/membershipRoles';
import type { AudioConfiguration, ProviderConnection } from '@/lib/sessionAudio';
import { campaignSettingsPath } from '@/lib/campaignPaths';
import { docsLinks } from '@/lib/docsLinks';

export type MatrixCellTone =
  | 'inherited'
  | 'override'
  | 'unavailable'
  | 'disabled-global'
  | 'disabled-setting'
  | 'missing-provider';

export type MatrixStatusItem = {
  tone: MatrixCellTone;
  label: string;
};

export type MatrixSettingLink = {
  label: string;
  href: string;
};

const GLOBAL_ADMIN_AUDIO_HELP =
  'Session recordings are controlled by the instance administrator. Campaign settings cannot turn them back on.';

export function resolveMatrixSettingHref(
  campaignHandle: string,
  tab: MatrixSettingsTab,
  hash?: string,
): string {
  const path = campaignSettingsPath(campaignHandle, tab);
  return hash ? `${path}#${hash}` : path;
}

export function resolveMatrixDocsHref(key: MatrixDocsKey): string {
  return docsLinks[key];
}

export function matrixRowHelp(row: MatrixRow): MatrixHelp | null {
  if (!row.help?.explanation && !row.help?.docsKey) return null;
  return row.help;
}

export function matrixGlobalAdminHelp(row: MatrixRow, globallyDisabled: boolean): string | null {
  if (row.globalFeature === 'audio' && globallyDisabled) {
    return GLOBAL_ADMIN_AUDIO_HELP;
  }
  return null;
}

export function matrixRowHasHelp(row: MatrixRow, globallyDisabled: boolean): boolean {
  return Boolean(matrixRowHelp(row) || matrixGlobalAdminHelp(row, globallyDisabled));
}

export function matrixRowSettingLink(
  row: MatrixRow,
  campaignHandle: string,
  globallyDisabled: boolean,
): MatrixSettingLink | null {
  const dep = row.dependency;
  if (!dep?.settingTab || !dep.settingLabel) return null;
  if (row.globalFeature === 'audio' && globallyDisabled) return null;
  return {
    label: dep.settingLabel,
    href: resolveMatrixSettingHref(campaignHandle, dep.settingTab, dep.settingHash),
  };
}

export function matrixFeatureStatuses(
  row: MatrixRow,
  input: {
    audioGlobalEnabled: boolean | null;
    audioSettings: AudioConfiguration | null;
    hasTranscriptionProvider: boolean | null;
  },
): MatrixStatusItem[] {
  const items: MatrixStatusItem[] = [];
  if (row.globalFeature === 'audio' && input.audioGlobalEnabled === false) {
    items.push({ tone: 'disabled-global', label: 'Disabled by Global Admin' });
  }
  if (row.campaignFeature === 'audio-enabled' && input.audioSettings && !input.audioSettings.enabled) {
    items.push({ tone: 'disabled-setting', label: 'Campaign recordings are off' });
  }
  if (row.campaignFeature === 'audio-provider') {
    if (input.audioSettings && !input.audioSettings.transcriptionEnabled) {
      items.push({ tone: 'disabled-setting', label: 'Transcription is off' });
    } else if (input.hasTranscriptionProvider === false) {
      items.push({ tone: 'missing-provider', label: 'No transcription provider' });
    }
  }
  return items;
}

export function matrixCellTone(input: {
  observerUnavailable: boolean;
  globallyDisabled: boolean;
  hasOverride: boolean;
}): MatrixCellTone {
  if (input.observerUnavailable) return 'unavailable';
  if (input.globallyDisabled) return 'disabled-global';
  if (input.hasOverride) return 'override';
  return 'inherited';
}

export function matrixCellStatusLabel(tone: MatrixCellTone): string {
  switch (tone) {
    case 'unavailable':
      return 'Unavailable';
    case 'disabled-global':
      return 'Disabled';
    case 'disabled-setting':
      return 'Setting off';
    case 'missing-provider':
      return 'No provider';
    case 'override':
      return 'Override';
    default:
      return 'Default';
  }
}

export function roleHasOverride(
  overrides: readonly CampaignRoleCapabilityOverrideRow[],
  role: MembershipRole,
  capability: string,
): boolean {
  return overrides.some((row) => row.role === role && row.capability === capability);
}

export function hasEnabledTranscriptionProvider(
  providers: readonly ProviderConnection[] | null,
): boolean | null {
  if (!providers) return null;
  return providers.some((provider) => provider.enabled);
}
