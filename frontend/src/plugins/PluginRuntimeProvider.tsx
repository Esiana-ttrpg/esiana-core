import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useWiki } from '@/contexts/WikiContext';
import { fetchCampaignFrontendPlugins } from '@/lib/frontendPlugins';
import {
  applyCspMetaTag,
  buildCspMetaContent,
  mergePluginCspExtensions,
} from '@/lib/cspPolicy';
import {
  bootstrapFrontendPlugins,
  resetFrontendPluginLoader,
} from '@/plugins/pluginRegistry';
import type { FrontendPluginDescriptor } from '@/plugins/slots';

interface PluginRuntimeContextValue {
  plugins: FrontendPluginDescriptor[];
  loading: boolean;
  error: string | null;
}

const PluginRuntimeContext = createContext<PluginRuntimeContextValue>({
  plugins: [],
  loading: false,
  error: null,
});

export function PluginRuntimeProvider({ children }: { children: ReactNode }) {
  const { campaign } = useWiki();
  const [plugins, setPlugins] = useState<FrontendPluginDescriptor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const campaignKey = campaign?.id ?? campaign?.handle ?? null;

  useEffect(() => {
    if (!campaignKey) {
      resetFrontendPluginLoader();
      setPlugins([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        resetFrontendPluginLoader();
        const descriptors = await fetchCampaignFrontendPlugins(campaignKey);
        if (cancelled) return;
        await bootstrapFrontendPlugins(descriptors, {
          campaignId: campaign?.id,
          campaignHandle: campaign?.handle,
        });
        if (cancelled) return;
        const cspExtensions = mergePluginCspExtensions(descriptors, {
          isDev: import.meta.env.DEV,
        });
        applyCspMetaTag(
          buildCspMetaContent(cspExtensions, { isDev: import.meta.env.DEV }),
        );
        setPlugins(descriptors);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unable to load plugins');
        setPlugins([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      resetFrontendPluginLoader();
    };
  }, [campaign?.id, campaign?.handle, campaignKey]);

  const value = useMemo(
    () => ({ plugins, loading, error }),
    [plugins, loading, error],
  );

  return (
    <PluginRuntimeContext.Provider value={value}>
      {plugins.some((plugin) => plugin.runtimeStatus === 'quarantined') ? (
        <div
          className="border-b border-amber-900/40 bg-amber-950/30 px-4 py-2 text-center text-xs text-amber-200"
          role="status"
        >
          One or more campaign plugins are temporarily unavailable (hook quarantine). Check Admin →
          Plugins for details.
        </div>
      ) : null}
      {children}
    </PluginRuntimeContext.Provider>
  );
}

export function usePluginRuntime(): PluginRuntimeContextValue {
  return useContext(PluginRuntimeContext);
}
