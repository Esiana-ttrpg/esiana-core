import { useEffect, useMemo, useRef } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useWiki } from '@/contexts/WikiContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MascotErrorPanel } from '@/components/errors/MascotErrorPanel';
import { getPluginPage } from '@/lib/pluginPages';
import { createPluginPageNavigation } from '@/lib/pluginPages';
import {
  createBasePluginSlotContext,
  enrichPluginSlotContext,
} from '@/lib/pluginSlotContext';
import { usePluginRuntime } from '@/plugins/PluginRuntimeProvider';
import { PluginErrorBoundary } from '@/plugins/slots/PluginErrorBoundary';

export function PluginPageHost() {
  const { campaignHandle = '', pluginId = '', pageId = '', '*': splat } = useParams<{
    campaignHandle: string;
    pluginId: string;
    pageId: string;
    '*': string;
  }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { campaign } = useWiki();
  const { plugins, loading } = usePluginRuntime();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const descriptor = useMemo(
    () => plugins.find((plugin) => plugin.id === pluginId),
    [pluginId, plugins],
  );
  const page = useMemo(
    () => (pluginId && pageId ? getPluginPage(pluginId, pageId) : undefined),
    [pageId, pluginId],
  );

  const navigation = useMemo(() => {
    if (!campaignHandle || !pluginId || !pageId) return null;
    return createPluginPageNavigation({
      campaignHandle,
      pluginId,
      pageId,
      pathname: location.pathname,
      search: location.search,
      navigate: (nextPath, replace) => {
        if (replace) navigate(nextPath, { replace: true });
        else navigate(nextPath);
      },
    });
  }, [campaignHandle, location.pathname, location.search, navigate, pageId, pluginId]);

  const slotContext = useMemo(() => {
    if (!descriptor) return null;
    return enrichPluginSlotContext(
      createBasePluginSlotContext({
        campaignId: campaign?.id,
        campaignHandle,
        config: descriptor.config,
        isEnabled: true,
      }),
      pluginId,
    );
  }, [campaign?.id, campaignHandle, descriptor, pluginId]);

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
        console.error(`[plugins] Page render failed for "${pluginId}/${pageId}"`, error);
        root.textContent = 'Plugin page failed to render.';
      }
    })();

    return () => {
      cancelled = true;
      if (typeof cleanup === 'function') cleanup();
      root.replaceChildren();
    };
  }, [navigation, page, pageId, pluginId, slotContext, splat, location.pathname, location.search]);

  if (!campaignHandle || !pluginId || !pageId) {
    return <Navigate to="../dashboard" replace />;
  }

  if (loading) {
    return <LoadingSpinner label="Loading plugin page…" />;
  }

  if (!descriptor || !page?.render) {
    return (
      <MascotErrorPanel
        code={404}
        title="Plugin page not found"
        description="This plugin page is unavailable or not registered."
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <header className="mb-4 border-b border-border/40 pb-3">
        <p className="text-xs uppercase tracking-wide text-muted">{descriptor.name}</p>
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
