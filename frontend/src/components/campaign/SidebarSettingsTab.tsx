import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  fetchCampaign,
  updateCampaignSidebar,
  uploadCampaignSidebarSectionIcon,
} from '@/lib/campaigns';
import {
  moveSidebarItem,
  normalizeSidebarConfig,
  SIDEBAR_SECTION_META,
  SIDEBAR_TOOLS_FIXED_IDS,
  SIDEBAR_TOP_FIXED_IDS,
  SIDEBAR_UTILITY_STUB_IDS,
  SIDEBAR_UTILITY_VISIBILITY_IDS,
  TIME_TRACKING_WIKI_TITLES,
  toggleFixedSectionVisibility,
  toggleSidebarItem,
  updateSidebarHeaders,
  updateSidebarItemCustomLabel,
  updateSidebarSectionIcon,
  isFixedSectionVisible,
  type SidebarBucketKey,
  type SidebarConfig,
  type SidebarOrderItem,
  type SidebarSectionId,
} from '@/lib/sidebarConfig';
import {
  sidebarConfigForPersist,
  SidebarSectionIconEditor,
} from '@/components/campaign/SidebarSectionIconEditor';
import { useWiki } from '@/contexts/WikiContext';

interface SidebarSettingsTabProps {
  campaignHandle: string;
}

interface DragState {
  bucket: SidebarBucketKey;
  index: number;
}

const ITEM_LABEL_INPUT_CLASS =
  'min-w-0 flex-1 rounded border border-transparent bg-transparent px-2 py-1 text-xs text-foreground transition-all hover:border-border focus:border-primary focus:outline-none';

const HEADER_INPUT_CLASS =
  'type-meta mb-3 w-full rounded border border-transparent bg-transparent px-2 py-1 font-medium text-muted transition-all hover:border-border focus:border-primary focus:outline-none';

function BucketHeading({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="border-t border-border/60 pt-4 first:border-t-0 first:pt-0">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={HEADER_INPUT_CLASS}
        aria-label={`${placeholder} section header`}
      />
    </div>
  );
}

function VisibilityToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex shrink-0 items-center gap-2 text-xs text-muted">
      <span className="hidden sm:inline">{enabled ? 'Visible' : 'Hidden'}</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          enabled ? 'bg-primary' : 'bg-elevated'
        }`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
            enabled ? 'left-[1.375rem]' : 'left-0.5'
          }`}
        />
      </button>
    </label>
  );
}

interface SidebarBucketEditorProps {
  bucket: SidebarBucketKey;
  headerValue: string;
  headerPlaceholder: string;
  rows: SidebarOrderItem[];
  config: SidebarConfig;
  drag: DragState | null;
  iconBusy: boolean;
  onHeaderChange: (value: string) => void;
  onDragStart: (bucket: SidebarBucketKey, index: number) => void;
  onDragOver: (bucket: SidebarBucketKey, index: number) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onToggle: (bucket: SidebarBucketKey, id: string) => void;
  onCustomLabelChange: (bucket: SidebarBucketKey, id: string, value: string) => void;
  onLucidePick: (sectionId: SidebarSectionId, lucideName: string) => void;
  onIconUpload: (sectionId: SidebarSectionId, file: File) => void;
  onIconReset: (sectionId: SidebarSectionId) => void;
}

function SidebarBucketEditor({
  bucket,
  headerValue,
  headerPlaceholder,
  rows,
  config,
  drag,
  iconBusy,
  onHeaderChange,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onToggle,
  onCustomLabelChange,
  onLucidePick,
  onIconUpload,
  onIconReset,
}: SidebarBucketEditorProps) {
  return (
    <section
      onDragOver={(event) => {
        event.preventDefault();
        if (rows.length === 0) onDragOver(bucket, 0);
      }}
      onDrop={onDrop}
    >
      <BucketHeading
        value={headerValue}
        placeholder={headerPlaceholder}
        onChange={onHeaderChange}
      />
      <ul className="min-h-[3rem] space-y-2 rounded-lg border border-dashed border-border/80 bg-background/40 p-2">
        {rows.length === 0 ? (
          <li className="px-2 py-4 text-center text-xs text-muted">
            Drop modules here
          </li>
        ) : (
          rows.map((row, index) => (
            <li
              key={row.id}
              draggable
              onDragStart={() => onDragStart(bucket, index)}
              onDragOver={(event) => {
                event.preventDefault();
                onDragOver(bucket, index);
              }}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              className={`flex items-center gap-2 rounded-lg border bg-background/60 px-3 py-2.5 transition-colors ${
                drag?.bucket === bucket && drag.index === index
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border'
              }`}
            >
              <button
                type="button"
                aria-label={`Reorder ${row.label}`}
                className="cursor-grab text-muted hover:text-foreground active:cursor-grabbing"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <GripVertical className="size-4" />
              </button>
              <SidebarSectionIconEditor
                config={config}
                sectionId={row.id as SidebarSectionId}
                label={row.label}
                disabled={iconBusy}
                compact
                onLucidePick={onLucidePick}
                onUpload={onIconUpload}
                onReset={onIconReset}
              />
              <input
                type="text"
                value={row.customLabel ?? ''}
                placeholder={row.label}
                onChange={(event) =>
                  onCustomLabelChange(bucket, row.id, event.target.value)
                }
                onMouseDown={(event) => event.stopPropagation()}
                className={ITEM_LABEL_INPUT_CLASS}
                aria-label={`Display label for ${row.label}`}
              />
              <VisibilityToggle
                enabled={row.enabled}
                onToggle={() => onToggle(bucket, row.id)}
              />
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

function FixedNavIconSection({
  title,
  sectionIds,
  config,
  iconBusy,
  onLucidePick,
  onIconUpload,
  onIconReset,
  onVisibilityToggle,
}: {
  title: string;
  sectionIds: SidebarSectionId[];
  config: SidebarConfig;
  iconBusy: boolean;
  onLucidePick: (sectionId: SidebarSectionId, lucideName: string) => void;
  onIconUpload: (sectionId: SidebarSectionId, file: File) => void;
  onIconReset: (sectionId: SidebarSectionId) => void;
  onVisibilityToggle?: (sectionId: SidebarSectionId) => void;
}) {
  return (
    <section className="border-t border-border/60 pt-4">
      <h3 className={`mb-3 ${META_SECTION_LABEL_CLASS}`}>
        {title}
      </h3>
      <ul className="space-y-2">
        {sectionIds.map((sectionId) => {
          const meta = SIDEBAR_SECTION_META[sectionId];
          const supportsVisibility = SIDEBAR_UTILITY_VISIBILITY_IDS.includes(sectionId);
          return (
            <li
              key={sectionId}
              className="flex items-center gap-3 rounded-lg border border-border bg-background/60 px-3 py-2.5"
            >
              <SidebarSectionIconEditor
                config={config}
                sectionId={sectionId}
                label={meta.label}
                disabled={iconBusy}
                onLucidePick={onLucidePick}
                onUpload={onIconUpload}
                onReset={onIconReset}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm text-foreground">
                    {meta.label}
                  </span>
                  {meta.statusLabel ? (
                    <span className="shrink-0 rounded bg-elevated px-1.5 py-0.5 META_SECTION_LABEL_CLASS">
                      {meta.statusLabel}
                    </span>
                  ) : null}
                </div>
                {supportsVisibility && meta.settingsDescription ? (
                  <p className="mt-0.5 text-xs text-muted">
                    {meta.settingsDescription}
                  </p>
                ) : null}
              </div>
              {supportsVisibility && onVisibilityToggle ? (
                <VisibilityToggle
                  enabled={isFixedSectionVisible(config, sectionId)}
                  onToggle={() => onVisibilityToggle(sectionId)}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function SidebarSettingsTab({ campaignHandle }: SidebarSettingsTabProps) {
  const { refresh } = useWiki();
  const [config, setConfig] = useState<SidebarConfig>(() =>
    normalizeSidebarConfig(null),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [iconBusy, setIconBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configRef = useRef(config);

  configRef.current = config;

  const persist = useCallback(
    async (nextConfig: SidebarConfig) => {
      setSaving(true);
      setError(null);
      try {
        const saved = await updateCampaignSidebar(
          campaignHandle,
          sidebarConfigForPersist(nextConfig),
        );
        setConfig(saved);
        await refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to save sidebar layout.',
        );
      } finally {
        setSaving(false);
      }
    },
    [campaignHandle, refresh],
  );

  const schedulePersist = useCallback(
    (nextConfig: SidebarConfig) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void persist(nextConfig);
      }, 350);
    },
    [persist],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const campaign = await fetchCampaign(campaignHandle);
        if (cancelled) return;
        setConfig(normalizeSidebarConfig(campaign.sidebarConfig));
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load sidebar settings.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [campaignHandle]);

  function applyConfig(nextConfig: SidebarConfig, debounced = true) {
    setConfig(nextConfig);
    if (debounced) {
      schedulePersist(nextConfig);
    } else {
      void persist(nextConfig);
    }
  }

  function handleIconLucidePick(sectionId: SidebarSectionId, lucideName: string) {
    applyConfig(updateSidebarSectionIcon(config, sectionId, `lucide:${lucideName}`));
  }

  function handleIconReset(sectionId: SidebarSectionId) {
    applyConfig(updateSidebarSectionIcon(config, sectionId, null));
  }

  async function handleIconUpload(sectionId: SidebarSectionId, file: File) {
    setIconBusy(true);
    setError(null);
    try {
      const saved = await uploadCampaignSidebarSectionIcon(
        campaignHandle,
        sectionId,
        file,
      );
      setConfig(saved);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload sidebar icon.');
    } finally {
      setIconBusy(false);
    }
  }

  function handleToggleFixedVisibility(sectionId: SidebarSectionId) {
    applyConfig(toggleFixedSectionVisibility(config, sectionId));
  }

  function handleToggle(bucket: SidebarBucketKey, id: string) {
    applyConfig(toggleSidebarItem(config, bucket, id));
  }

  function handleCustomLabelChange(
    bucket: SidebarBucketKey,
    id: string,
    value: string,
  ) {
    applyConfig(updateSidebarItemCustomLabel(config, bucket, id, value));
  }

  function handleWorldHeaderChange(value: string) {
    applyConfig(updateSidebarHeaders(config, { world: value }));
  }

  function handlePlayHeaderChange(value: string) {
    applyConfig(updateSidebarHeaders(config, { play: value }));
  }

  function handleTimelineHeaderChange(value: string) {
    applyConfig(updateSidebarHeaders(config, { timeline: value }));
  }

  function handleToolsHeaderChange(value: string) {
    applyConfig(updateSidebarHeaders(config, { tools: value }));
  }

  function handleDragStart(bucket: SidebarBucketKey, index: number) {
    setDrag({ bucket, index });
  }

  function handleDragOver(bucket: SidebarBucketKey, index: number) {
    if (!drag) return;
    if (drag.bucket === bucket && drag.index === index) return;
    const nextConfig = moveSidebarItem(config, drag, { bucket, index });
    setDrag({ bucket, index });
    setConfig(nextConfig);
  }

  function handleDrop() {
    if (!drag) return;
    setDrag(null);
    schedulePersist(configRef.current);
  }

  function handleDragEnd() {
    setDrag(null);
  }

  if (loading) {
    return <LoadingSpinner label="Loading sidebar settings…" />;
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Sidebar</h2>
          <p className="mt-1 text-sm text-muted">
            Rename section headers and module labels, pick Lucide icons or upload
            custom SVGs, drag items within or between buckets, and toggle
            visibility. Route ids stay unchanged.
          </p>
        </div>
        {(saving || iconBusy) && (
          <span className={`${META_SECTION_LABEL_CLASS} text-primary`}>
            Saving…
          </span>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded border border-red-700 bg-red-950/50 p-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="space-y-2">
        <SidebarBucketEditor
          bucket="play"
          headerValue={config.headers.play}
          headerPlaceholder="PLAY"
          rows={config.playOrder}
          config={config}
          drag={drag}
          iconBusy={iconBusy || saving}
          onHeaderChange={handlePlayHeaderChange}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onToggle={handleToggle}
          onCustomLabelChange={handleCustomLabelChange}
          onLucidePick={handleIconLucidePick}
          onIconUpload={handleIconUpload}
          onIconReset={handleIconReset}
        />

        <SidebarBucketEditor
          bucket="worldLore"
          headerValue={config.headers.world}
          headerPlaceholder="WORLD"
          rows={config.worldLoreOrder}
          config={config}
          drag={drag}
          iconBusy={iconBusy || saving}
          onHeaderChange={handleWorldHeaderChange}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onToggle={handleToggle}
          onCustomLabelChange={handleCustomLabelChange}
          onLucidePick={handleIconLucidePick}
          onIconUpload={handleIconUpload}
          onIconReset={handleIconReset}
        />

        <section className="border-t border-border/60 pt-4">
          <BucketHeading
            value={config.headers.timeline}
            placeholder="TIMELINE"
            onChange={handleTimelineHeaderChange}
          />
          <p className="px-2 text-xs text-muted">
            Fixed links: {TIME_TRACKING_WIKI_TITLES.join(', ')} (order not customizable).
          </p>
        </section>

        <SidebarBucketEditor
          bucket="tools"
          headerValue={config.headers.tools}
          headerPlaceholder="TOOLS"
          rows={config.toolsOrder}
          config={config}
          drag={drag}
          iconBusy={iconBusy || saving}
          onHeaderChange={handleToolsHeaderChange}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onToggle={handleToggle}
          onCustomLabelChange={handleCustomLabelChange}
          onLucidePick={handleIconLucidePick}
          onIconUpload={handleIconUpload}
          onIconReset={handleIconReset}
        />

        <FixedNavIconSection
          title="Top navigation icons"
          sectionIds={SIDEBAR_TOP_FIXED_IDS}
          config={config}
          iconBusy={iconBusy || saving}
          onLucidePick={handleIconLucidePick}
          onIconUpload={handleIconUpload}
          onIconReset={handleIconReset}
        />

        <FixedNavIconSection
          title="Tools navigation"
          sectionIds={SIDEBAR_TOOLS_FIXED_IDS}
          config={config}
          iconBusy={iconBusy || saving}
          onLucidePick={handleIconLucidePick}
          onIconUpload={handleIconUpload}
          onIconReset={handleIconReset}
          onVisibilityToggle={handleToggleFixedVisibility}
        />

        <FixedNavIconSection
          title="Hidden planned stubs"
          sectionIds={SIDEBAR_UTILITY_STUB_IDS}
          config={config}
          iconBusy={iconBusy || saving}
          onLucidePick={handleIconLucidePick}
          onIconUpload={handleIconUpload}
          onIconReset={handleIconReset}
          onVisibilityToggle={handleToggleFixedVisibility}
        />
      </div>

      <p className="mt-4 text-xs text-muted">
        Top links ({SIDEBAR_TOP_FIXED_IDS.join(', ')}) support custom icons. Campaign home
        lives in the header. Tools
        links ({SIDEBAR_TOOLS_FIXED_IDS.join(', ')}) and hidden stubs (
        {SIDEBAR_UTILITY_STUB_IDS.join(', ')}) support visibility toggles where noted.
        Adventure submenu items (Threads, Unresolved, etc.) are fixed under Adventure.
      </p>
    </div>
  );
}
