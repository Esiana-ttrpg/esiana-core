import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HubSectionHeader } from '@/components/hub/HubSectionHeader';
import {
  listAppHomeCards,
  meetsPluginRequires,
  type PluginAppHomeCardDefinition,
} from '@/lib/pluginContributions';
import {
  createBasePluginSlotContext,
  enrichPluginSlotContext,
} from '@/lib/pluginSlotContext';
import { PluginErrorBoundary } from '@/plugins/slots/PluginErrorBoundary';
import { usePluginRuntime } from '@/plugins/PluginRuntimeProvider';

function AppHomeCardMount({ card }: { card: PluginAppHomeCardDefinition }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const context = useMemo(
    () =>
      enrichPluginSlotContext(
        createBasePluginSlotContext({
          config: {},
          isEnabled: true,
        }),
        card.pluginId,
      ),
    [card.pluginId],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let cleanup: void | (() => void);

    void (async () => {
      try {
        const result = await card.render(host, context);
        if (cancelled) return;
        cleanup = typeof result === 'function' ? result : undefined;
      } catch (error) {
        console.error('[plugins] App Home card failed for "%s"', card.pluginId, error);
        host.textContent = 'Plugin card failed to render.';
      }
    })();

    return () => {
      cancelled = true;
      if (typeof cleanup === 'function') cleanup();
      host.replaceChildren();
    };
  }, [card, context]);

  return (
    <PluginErrorBoundary pluginId={card.pluginId}>
      <div
        className={`hub-plugin-card rounded-xl border border-border/60 bg-elevated/40 p-4 esiana-plugin-${card.pluginId.replace(/[^a-z0-9-]/gi, '-')}`}
      >
        <div ref={hostRef} className="min-w-0" />
      </div>
    </PluginErrorBoundary>
  );
}

/** Conditional Plugins section for Global App Home — absent when no cards. */
export function HubPluginsSection() {
  const { isAuthenticated } = useAuth();
  const { loading, plugins } = usePluginRuntime();

  const cards = useMemo(() => {
    if (loading || !isAuthenticated) return [];
    return listAppHomeCards().filter((card) =>
      meetsPluginRequires(card.requires, { isAuthenticated }),
    );
  }, [loading, isAuthenticated, plugins]);

  if (cards.length === 0) return null;

  return (
    <section className="space-y-3" aria-label="Plugins">
      <HubSectionHeader variant="page" title="Plugins" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <AppHomeCardMount key={`${card.pluginId}:${card.id}`} card={card} />
        ))}
      </div>
    </section>
  );
}
