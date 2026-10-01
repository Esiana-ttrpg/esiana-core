import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOptionalWiki } from '@/contexts/WikiContext';
import {
  listPageSections,
  meetsPluginRequires,
  type PluginPageSectionDefinition,
  type PluginPageTarget,
} from '@/lib/pluginContributions';
import {
  createBasePluginSlotContext,
  enrichPluginSlotContext,
} from '@/lib/pluginSlotContext';
import { PluginErrorBoundary } from '@/plugins/slots/PluginErrorBoundary';
import { usePluginRuntime } from '@/plugins/PluginRuntimeProvider';

function PageSectionMount({
  section,
  pageId,
  surfaceKey,
}: {
  section: PluginPageSectionDefinition;
  pageId?: string;
  surfaceKey?: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const wiki = useOptionalWiki();

  const context = useMemo(
    () =>
      enrichPluginSlotContext(
        {
          ...createBasePluginSlotContext({
            campaignId: wiki?.campaign?.id,
            campaignHandle: wiki?.campaignHandle,
            config: {},
            isEnabled: true,
          }),
          pageTarget: section.target,
          pageId,
          surfaceKey,
        },
        section.pluginId,
      ),
    [section, pageId, surfaceKey, wiki?.campaign?.id, wiki?.campaignHandle],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let cleanup: void | (() => void);

    void (async () => {
      try {
        const result = await section.render(host, context);
        if (cancelled) return;
        cleanup = typeof result === 'function' ? result : undefined;
      } catch (error) {
        console.error(
          `[plugins] Page section failed for "${section.pluginId}:${section.id}"`,
          error,
        );
        host.textContent = 'Plugin section failed to render.';
      }
    })();

    return () => {
      cancelled = true;
      if (typeof cleanup === 'function') cleanup();
      host.replaceChildren();
    };
  }, [section, context]);

  return (
    <PluginErrorBoundary pluginId={section.pluginId}>
      <div
        className={`esiana-plugin-page-section esiana-plugin-${section.pluginId.replace(/[^a-z0-9-]/gi, '-')}`}
        data-page-target={section.target}
      >
        <div ref={hostRef} className="min-w-0" />
      </div>
    </PluginErrorBoundary>
  );
}

/**
 * Bottom-of-page plugin section host. Invisible when empty; no user-facing heading.
 */
export function PluginPageExtensionsHost({
  target,
  pageId,
  surfaceKey,
  className = '',
}: {
  target: PluginPageTarget;
  pageId?: string;
  surfaceKey?: string;
  className?: string;
}) {
  const { isAuthenticated } = useAuth();
  const wiki = useOptionalWiki();
  const { loading, plugins } = usePluginRuntime();

  const sections = useMemo(() => {
    if (loading) return [];
    return listPageSections(target).filter((section) =>
      meetsPluginRequires(section.requires, {
        isAuthenticated,
        campaignRole: wiki?.campaign?.role,
      }),
    );
  }, [target, loading, isAuthenticated, wiki?.campaign?.role, plugins]);

  if (sections.length === 0) return null;

  return (
    <div className={`space-y-4 ${className}`.trim()} data-plugin-page-extensions={target}>
      {sections.map((section) => (
        <PageSectionMount
          key={`${section.pluginId}:${section.id}`}
          section={section}
          pageId={pageId}
          surfaceKey={surfaceKey}
        />
      ))}
    </div>
  );
}
