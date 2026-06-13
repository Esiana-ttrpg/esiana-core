import {
  summarizeRegistryEntryNetworkAccess,
  summarizeRegistryEntryPermissions,
} from '@/lib/pluginInstallPreview';
import type { PluginRegistryEntry } from '@/lib/pluginManifest';

export function PluginInstallConsent({ entry }: { entry: PluginRegistryEntry }) {
  const permissions = summarizeRegistryEntryPermissions(entry);
  const network = summarizeRegistryEntryNetworkAccess(entry);

  if (permissions.length === 0 && network.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-100/90">
      <p className="font-medium text-amber-200">This plugin requests:</p>
      {permissions.length > 0 ? (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-amber-300/80">Capabilities</p>
          <ul className="mt-1 list-inside list-disc font-mono text-[11px]">
            {permissions.map((permission) => (
              <li key={permission}>{permission}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {network.length > 0 ? (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-amber-300/80">
            Outbound network access
          </p>
          <ul className="mt-1 list-inside list-disc font-mono text-[11px]">
            {network.map((domain) => (
              <li key={domain}>{domain}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
