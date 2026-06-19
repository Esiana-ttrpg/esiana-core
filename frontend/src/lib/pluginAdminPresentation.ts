import { PluginScopes } from '@/lib/pluginManifest';
import type {
  CampaignPluginCapabilityRecord,
  PluginCompatibilityMeta,
  SystemPluginRecord,
} from '@/types/admin';

export type PluginListStatus = 'quarantined' | 'enabled' | 'disabled' | 'installed';

export type InstalledPluginAdminRow = {
  id: string;
  name: string;
  scope: 'global' | 'campaign';
  version: string;
  lastUpdated?: string;
  lastVerified?: string;
  lastVerifiedCoreVersion?: string;
  runtimeStatus?: string;
  quarantineReason?: string | null;
  isEnabled?: boolean;
  isGlobal: boolean;
  source: SystemPluginRecord | CampaignPluginCapabilityRecord;
};

function mapCompatibility(compatibility?: PluginCompatibilityMeta) {
  return {
    lastVerified: compatibility?.lastVerified,
    lastVerifiedCoreVersion: compatibility?.lastVerifiedCore,
  };
}

function rowFromGlobal(plugin: SystemPluginRecord): InstalledPluginAdminRow {
  const history = mapCompatibility(plugin.compatibility);
  return {
    id: plugin.id,
    name: plugin.adminDisplayLabel ?? plugin.name,
    scope: 'global',
    version: plugin.version,
    lastUpdated: plugin.updatedAt ?? plugin.installedAt,
    lastVerified: history.lastVerified,
    lastVerifiedCoreVersion: history.lastVerifiedCoreVersion,
    runtimeStatus: plugin.runtimeStatus,
    quarantineReason: plugin.quarantineReason,
    isEnabled: plugin.isEnabled,
    isGlobal: true,
    source: plugin,
  };
}

function rowFromCampaign(capability: CampaignPluginCapabilityRecord): InstalledPluginAdminRow {
  const history = mapCompatibility(capability.compatibility);
  return {
    id: capability.id,
    name: capability.name,
    scope: 'campaign',
    version: capability.version,
    lastUpdated: capability.updatedAt ?? capability.installedAt,
    lastVerified: history.lastVerified,
    lastVerifiedCoreVersion: history.lastVerifiedCoreVersion,
    runtimeStatus: capability.runtimeStatus,
    quarantineReason: capability.quarantineReason,
    isGlobal: false,
    source: capability,
  };
}

export function buildInstalledPluginRows(
  plugins: SystemPluginRecord[],
  campaignCapabilities: CampaignPluginCapabilityRecord[],
): InstalledPluginAdminRow[] {
  const globalRows = plugins
    .filter((plugin) => plugin.scope === PluginScopes.GLOBAL)
    .map(rowFromGlobal);
  const campaignRows = campaignCapabilities.map(rowFromCampaign);
  return [...globalRows, ...campaignRows].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
}

export function deriveListStatus(row: InstalledPluginAdminRow): PluginListStatus {
  if (row.runtimeStatus === 'quarantined') return 'quarantined';
  if (row.isGlobal) {
    return row.isEnabled ? 'enabled' : 'disabled';
  }
  return 'installed';
}

export function formatArtifactVersion(version: string | undefined): string {
  const trimmed = version?.trim();
  return trimmed ? trimmed : '—';
}

function formatIsoDate(iso: string): string | null {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return null;
  }
}

/** Display-only — no comparisons to host core or conditional styling. */
export function formatLastVerifiedDisplay(row: {
  lastVerified?: string;
  lastVerifiedCoreVersion?: string;
}): string {
  if (row.lastVerified) {
    const formatted = formatIsoDate(row.lastVerified);
    if (formatted) return formatted;
  }
  if (row.lastVerifiedCoreVersion?.trim()) {
    return `Verified on core ${row.lastVerifiedCoreVersion.trim()}`;
  }
  return '—';
}

export function formatLastUpdatedDisplay(iso: string | undefined): string {
  if (!iso?.trim()) return '—';
  return formatIsoDate(iso) ?? '—';
}

export function scopeLabel(scope: InstalledPluginAdminRow['scope']): string {
  return scope === 'global' ? 'Global' : 'Campaign';
}

export function isGlobalPluginRow(
  row: InstalledPluginAdminRow,
): row is InstalledPluginAdminRow & { source: SystemPluginRecord } {
  return row.isGlobal;
}

export function getGlobalPluginFromRow(row: InstalledPluginAdminRow): SystemPluginRecord | null {
  return row.isGlobal ? (row.source as SystemPluginRecord) : null;
}
