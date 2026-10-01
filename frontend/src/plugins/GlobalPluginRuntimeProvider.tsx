import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { fetchGlobalFrontendPlugins } from '@/lib/frontendPlugins';
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
  mode: 'global' | 'campaign' | 'idle';
}

const PluginRuntimeContext = createContext<PluginRuntimeContextValue>({
  plugins: [],
  loading: false,
  error: null,
  mode: 'idle',
});

export function usePluginRuntime(): PluginRuntimeContextValue {
  return useContext(PluginRuntimeContext);
}

export { PluginRuntimeContext };

/** Bootstraps globally installed+enabled frontend plugins (no campaign jail). */
export function GlobalPluginRuntimeProvider({ children }: { children: ReactNode }) {
  const [plugins, setPlugins] = useState<FrontendPluginDescriptor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        resetFrontendPluginLoader();
        const descriptors = await fetchGlobalFrontendPlugins();
        if (cancelled) return;
        await bootstrapFrontendPlugins(descriptors, {});
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
  }, []);

  const value = useMemo(
    () => ({ plugins, loading, error, mode: 'global' as const }),
    [plugins, loading, error],
  );

  return (
    <PluginRuntimeContext.Provider value={value}>
      {children}
    </PluginRuntimeContext.Provider>
  );
}
