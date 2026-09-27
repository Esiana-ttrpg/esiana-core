import { useEffect, useRef, useState } from 'react';
import type { CharacterFieldDescriptor, CharacterPageDescriptor, CharacterPageDisplayMode } from '@shared/characterPages';
import { getPluginCharacterPageRenderer } from '@/lib/pluginCharacterPages';
import {
  fetchPluginCharacterPageData,
  fetchCharacterFields,
  updateCharacterField,
  updatePluginCharacterPageData,
} from '@/lib/wiki';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface PluginCharacterPageHostProps {
  campaignHandle: string;
  character: { id: string; title: string; visibility: string };
  page: CharacterPageDescriptor;
}

function displayModeForWidth(width: number): CharacterPageDisplayMode {
  if (width < 640) return 'narrow';
  if (width >= 1200) return 'wide';
  return 'standard';
}

export function PluginCharacterPageHost({
  campaignHandle,
  character,
  page,
}: PluginCharacterPageHostProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [displayMode, setDisplayMode] = useState<CharacterPageDisplayMode>('standard');
  const [pluginData, setPluginData] = useState<unknown>();
  const [fields, setFields] = useState<CharacterFieldDescriptor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedPageId, setLoadedPageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const update = () => setDisplayMode(displayModeForWidth(root.clientWidth));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadedPageId(null);
    setError(null);
    void Promise.all([
      fetchPluginCharacterPageData(campaignHandle, character.id, page.id),
      fetchCharacterFields(campaignHandle, character.id),
    ]).then(([result, allFields]) => {
      if (!controller.signal.aborted) {
        setPluginData(result.data);
        setFields(allFields.filter((field) => field.pluginId === page.pluginId && field.sourceKey === page.sourceKey));
        setLoadedPageId(page.id);
      }
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to load plugin page');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [campaignHandle, character.id, page.id]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || loading || loadedPageId !== page.id || error || !page.pluginId || !page.sourceKey) return;
    const registration = getPluginCharacterPageRenderer(page.pluginId, page.sourceKey);
    if (!registration) {
      setError(`The ${page.title} renderer is unavailable.`);
      return;
    }
    const controller = new AbortController();
    let cleanup: void | (() => void);
    root.replaceChildren();
    Promise.resolve(registration.render(root, {
      character,
      campaign: { handle: campaignHandle },
      page,
      pluginData,
      fields,
      permissions: {
        canRead: true,
        canEdit: page.capabilities.canEdit,
        canChangeVisibility: page.capabilities.canEdit,
        coreActions: [],
      },
      displayMode,
      signal: controller.signal,
      async updatePluginData(data) {
        const result = await updatePluginCharacterPageData(
          campaignHandle,
          character.id,
          page.id,
          data,
          page.pluginSchemaVersion ?? 1,
        );
        if (!controller.signal.aborted) setPluginData(result.data);
        return result;
      },
      async updateField(fieldId, value) {
        const updated = await updateCharacterField(campaignHandle, character.id, fieldId, value);
        if (!controller.signal.aborted) {
          setFields((current) => current.map((field) => field.id === updated.id ? updated : field));
        }
        return updated;
      },
      core: {},
    })).then((nextCleanup) => {
      cleanup = nextCleanup;
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Plugin renderer failed');
    });
    return () => {
      controller.abort();
      cleanup?.();
      root.replaceChildren();
    };
    // The plugin owns this DOM subtree. State updates and responsive width
    // changes must not tear it down, because doing so discards renderer-local
    // edits. A page identity change or reload is the only remount boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignHandle, character.id, error, loadedPageId, loading, page.id]);

  return (
    <section className="min-w-0" aria-label={page.title}>
      {loading ? <LoadingSpinner label={`Loading ${page.title}…`} /> : null}
      {error ? (
        <div className="rounded-lg border border-border/50 bg-elevated/50 p-4 text-sm text-muted" role="alert">
          {error}
        </div>
      ) : null}
      <div ref={rootRef} data-plugin-character-page={page.key} data-display-mode={displayMode} />
    </section>
  );
}
