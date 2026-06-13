import { useEffect, useRef, useState } from 'react';
import { Settings2 } from 'lucide-react';
import {
  getLayoutWidget,
  parsePluginWidgetPlacementId,
} from '@/lib/pluginPresentation';
import {
  createBasePluginSlotContext,
  enrichPluginSlotContext,
} from '@/lib/pluginSlotContext';
import { PluginErrorBoundary } from '@/plugins/slots/PluginErrorBoundary';
import { DashboardWidgetShell } from '@/components/dashboard/DashboardWidgetShell';

interface PluginDashboardWidgetProps {
  widgetId: string;
  pluginId: string;
  campaignHandle: string;
  campaignId?: string;
  widgetConfig: Record<string, unknown>;
  customizeMode: boolean;
  onHide?: () => void;
  onConfigChange: (next: Record<string, unknown>) => void;
}

export function PluginDashboardWidget({
  widgetId,
  pluginId,
  campaignHandle,
  campaignId,
  widgetConfig,
  customizeMode,
  onHide,
  onConfigChange,
}: PluginDashboardWidgetProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const layoutWidget = getLayoutWidget(pluginId, widgetId);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !layoutWidget?.render) return;

    const context = enrichPluginSlotContext(
      createBasePluginSlotContext({ campaignHandle, campaignId, config: {} }),
      pluginId,
    );

    let cancelled = false;
    let cleanup: void | (() => void);
    void (async () => {
      const result = await layoutWidget.render!(host, context, widgetConfig);
      if (cancelled) return;
      cleanup = typeof result === 'function' ? result : undefined;
    })();

    return () => {
      cancelled = true;
      if (typeof cleanup === 'function') cleanup();
      host.replaceChildren();
    };
  }, [campaignHandle, campaignId, layoutWidget, pluginId, widgetConfig]);

  useEffect(() => {
    const settingsHost = settingsRef.current;
    if (!settingsHost || !settingsOpen || !layoutWidget?.renderSettings) {
      settingsHost?.replaceChildren();
      return;
    }

    const context = enrichPluginSlotContext(
      createBasePluginSlotContext({ campaignHandle, campaignId, config: {} }),
      pluginId,
    );

    let cancelled = false;
    let cleanup: void | (() => void);
    void (async () => {
      const result = await layoutWidget.renderSettings!(
        settingsHost,
        context,
        widgetConfig,
        (partial) => onConfigChange({ ...widgetConfig, ...partial }),
      );
      if (cancelled) return;
      cleanup = typeof result === 'function' ? result : undefined;
    })();

    return () => {
      cancelled = true;
      if (typeof cleanup === 'function') cleanup();
      settingsHost.replaceChildren();
    };
  }, [
    campaignHandle,
    campaignId,
    layoutWidget,
    onConfigChange,
    pluginId,
    settingsOpen,
    widgetConfig,
  ]);

  const parsed = parsePluginWidgetPlacementId(`plugin:${pluginId}:${widgetId}`);
  const title = layoutWidget?.title ?? parsed?.widgetId ?? 'Plugin widget';

  return (
    <DashboardWidgetShell title={title} customizeMode={customizeMode} onHide={onHide}>
      {layoutWidget?.renderSettings ? (
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
            onClick={() => setSettingsOpen((open) => !open)}
          >
            <Settings2 className="size-3.5" />
            {settingsOpen ? 'Close settings' : 'Settings'}
          </button>
        </div>
      ) : null}
      {settingsOpen ? <div ref={settingsRef} className="mb-3 rounded-md border border-border/40 p-2" /> : null}
      <PluginErrorBoundary pluginId={pluginId}>
        <div ref={hostRef} className={`esiana-plugin-widget esiana-plugin-${pluginId}`} />
      </PluginErrorBoundary>
    </DashboardWidgetShell>
  );
}
