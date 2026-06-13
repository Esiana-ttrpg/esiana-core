import { useEffect, useRef } from 'react';
import type { ComponentType } from 'react';
import { PluginErrorBoundary } from './PluginErrorBoundary';
import { getUiSlotRegistrations } from './uiSlotRegistry';
import type { PluginSlotContextBase, PluginSlotContext, PluginUiSlotId } from './types';
import { usePluginRuntime } from '../PluginRuntimeProvider';
import { enrichPluginSlotContext } from '@/lib/pluginSlotContext';

function slotScopeClass(slot: PluginUiSlotId, pluginId: string): string {
  const safePlugin = pluginId.replace(/[^a-z0-9-]/gi, '-');
  return `esiana-plugin-slot esiana-plugin-slot--${slot.replace(/:/g, '-')} esiana-plugin-${safePlugin}`;
}

function VanillaSlotMount({
  pluginId,
  render,
  context,
}: {
  pluginId: string;
  render: NonNullable<ReturnType<typeof getUiSlotRegistrations>[number]['render']>;
  context: PluginSlotContext;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let cleanup: void | (() => void);

    void (async () => {
      try {
        const result = await render(host, context);
        if (cancelled) return;
        cleanup = typeof result === 'function' ? result : undefined;
      } catch (error) {
        console.error(`[plugins] Slot render failed for "${pluginId}"`, error);
        host.textContent = 'Plugin failed to render.';
      }
    })();

    return () => {
      cancelled = true;
      if (typeof cleanup === 'function') {
        cleanup();
      }
      host.replaceChildren();
    };
  }, [context, pluginId, render]);

  return <div ref={hostRef} className="esiana-plugin-slot-host min-w-0" />;
}

function ReactSlotMount({
  component: Component,
  context,
}: {
  component: ComponentType<{ context: PluginSlotContext }>;
  context: PluginSlotContext;
}) {
  return <Component context={context} />;
}

export function PluginSlotHost({
  slot,
  context,
  className = '',
}: {
  slot: PluginUiSlotId;
  context: PluginSlotContextBase;
  className?: string;
}) {
  const { plugins: _loadedPlugins } = usePluginRuntime();
  const entries = getUiSlotRegistrations(slot);
  if (entries.length === 0) return null;

  return (
    <div className={`esiana-plugin-slot-group ${className}`.trim()} data-slot={slot}>
      {entries.map((entry) => {
        const slotContext = enrichPluginSlotContext(
          {
            ...context,
            config: entry.config,
          },
          entry.pluginId,
        );
        const reactComponent = (entry as { component?: ComponentType<{ context: PluginSlotContext }> })
          .component;

        return (
          <PluginErrorBoundary key={`${entry.pluginId}:${slot}`} pluginId={entry.pluginId}>
            <div className={slotScopeClass(slot, entry.pluginId)}>
              {reactComponent ? (
                <ReactSlotMount component={reactComponent} context={slotContext} />
              ) : entry.render ? (
                <VanillaSlotMount
                  pluginId={entry.pluginId}
                  render={entry.render}
                  context={slotContext}
                />
              ) : null}
            </div>
          </PluginErrorBoundary>
        );
      })}
    </div>
  );
}
