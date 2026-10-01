import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useEffect, useMemo, useRef } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MascotErrorPanel } from '@/components/errors/MascotErrorPanel';
import { createPluginPageNavigation, getPluginPage } from '@/lib/pluginPages';
import {
  createBasePluginSlotContext,
  enrichPluginSlotContext,
} from '@/lib/pluginSlotContext';
import { usePluginRuntime } from '@/plugins/PluginRuntimeProvider';
import { PluginErrorBoundary } from '@/plugins/slots/PluginErrorBoundary';

/** Hosts globally scoped plugin pages at `/plugins/:pluginId/:pageId/*`. */
export function GlobalPluginPageHost() {
  const { pluginId = '', pageId = '', '*': splat } = useParams<{
    pluginId: string;
    pageId: string;
    '*': string;
  }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { plugins, loading } = usePluginRuntime();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const descriptor = useMemo(
    () => plugins.find((plugin) => plugin.id === pluginId),
    [pluginId, plugins],
  );
  const page = useMemo(
    () => (pluginId && pageId ? getPluginPage(pluginId, pageId) : undefined),
    [pageId, pluginId, plugins],
  );

  const navigation = useMemo(() => {
    if (!pluginId || !pageId) return null;
    return createPluginPageNavigation({
      pluginId,
      pageId,
      pathname: location.pathname,
      search: location.search,
      navigate: (nextPath, replace) => {
        if (replace) navigate(nextPath, { replace: true });
        else navigate(nextPath);
      },
    });
  }, [location.pathname, location.search, navigate, pageId, pluginId]);

  const slotContext = useMemo(() => {
    if (!descriptor) return null;
    return enrichPluginSlotContext(
      createBasePluginSlotContext({
        config: descriptor.config,
        isEnabled: true,
      }),
      pluginId,
    );
  }, [descriptor, pluginId]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !page?.render || !slotContext || !navigation) return;

    let cancelled = false;
    let cleanup: void | (() => void);

    void (async () => {
      try {
        const result = await page.render!(root, slotContext, navigation);
        if (cancelled) return;
        cleanup = typeof result === 'function' ? result : undefined;
      } catch (error) {
        console.error(
          '[plugins] Global page render failed for "%s/%s"',
          pluginId,
          pageId,
          error,
        );
        root.textContent = 'Plugin page failed to render.';
      }
    })();

    return () => {
      cancelled = true;
      if (typeof cleanup === 'function') cleanup();
      root.replaceChildren();
    };
  }, [navigation, page, pageId, pluginId, slotContext, splat, location.pathname, location.search]);

  if (!pluginId || !pageId) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return <LoadingSpinner label="Loading plugin page…" />;
  }

  const scopeOk =
    page?.scope === 'global' || page?.scope === 'both' || page?.scope === undefined;

  if (!descriptor || !page?.render || !scopeOk) {
    return (
      <MascotErrorPanel
        code={404}
        title="Plugin page not found"
        description="This global plugin page is unavailable or not registered."
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <header className="mb-4 border-b border-border/40 pb-3">
        <p className={META_SECTION_LABEL_CLASS}>{descriptor.name}</p>
        <h1 className="font-display text-2xl text-foreground">{page.title}</h1>
      </header>
      <PluginErrorBoundary pluginId={pluginId}>
        <div
          ref={rootRef}
          className={`esiana-plugin-page esiana-plugin-${pluginId.replace(/[^a-z0-9-]/gi, '-')}`}
        />
      </PluginErrorBoundary>
    </div>
  );
}
