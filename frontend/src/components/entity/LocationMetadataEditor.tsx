import { META_FIELD_LABEL_CLASS, META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useCallback, useMemo, useState } from 'react';
import { useBlockDraftFlush } from '@/hooks/useBlockDraftFlush';
import { useRegisterBlockDraft } from '@/contexts/PageBlockDraftRegistry';
import { diffRecordPatch } from '@/lib/blockDraftFlush';
import {
  CodexEditorShell,
  codexFieldClass,
  codexFieldId,
  PageIdListEditor,
  useCodexMetadataDraft,
} from '@/components/entity/codexMetadataEditorShared';
import { SuggestedTagMultiSelect } from '@/components/entity/SuggestedTagMultiSelect';
import { CreatePageModal } from '@/components/CreatePageModal';
import { IdentityPagePicker } from '@/components/campaign/IdentityPagePicker';
import { useWiki } from '@/contexts/WikiContext';
import {
  filterRegionLocationPages,
  LOCATION_THREAT_SUGGESTIONS,
  parseLocationMetadata,
  type LocationMetadataFields,
} from '@/lib/locationMetadata';
import { filterLocationPages, filterMapPages, findLocationsCategoryPage } from '@/lib/questHubLayout';
import { updateLocationMetadata, updateWikiPage } from '@/lib/wiki';
import type { WikiTreeNode } from '@/types/wiki';

type LocationContextCreateTarget = 'parent' | 'region';

interface LocationMetadataEditorProps {
  campaignHandle: string;
  pageId: string;
  blockId?: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  parentId?: string | null;
  onParentIdSaved?: (parentId: string | null) => void;
  onSaved: (metadata: Record<string, unknown>) => void;
  section?: 'identity' | 'atlas' | 'relationships' | 'all';
  bare?: boolean;
  focusField?: string | null;
}

export function LocationMetadataEditor({
  campaignHandle,
  pageId,
  blockId,
  metadata,
  flatPages,
  parentId = null,
  onParentIdSaved,
  onSaved,
  section = 'all',
  bare = false,
  focusField,
}: LocationMetadataEditorProps) {
  const { refresh } = useWiki();
  const source = useMemo(() => parseLocationMetadata(metadata), [metadata]);
  const draftBlockId = blockId ?? `entity-location-hero:${pageId}`;
  const [draft, setDraft, , markCommitted, dirty] = useCodexMetadataDraft(
    metadata,
    parseLocationMetadata,
    draftBlockId,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createContextOpen, setCreateContextOpen] = useState(false);
  const [createContextTarget, setCreateContextTarget] =
    useState<LocationContextCreateTarget>('parent');
  const [createContextTitle, setCreateContextTitle] = useState<string | null>(null);

  const locationPages = filterLocationPages(flatPages).filter((p) => p.id !== pageId);
  const regionPages = useMemo(
    () => filterRegionLocationPages(locationPages),
    [locationPages],
  );
  const parentPickerPages = locationPages;
  const locationsRoot = useMemo(
    () => findLocationsCategoryPage(flatPages),
    [flatPages],
  );
  const mapPages = useMemo(() => filterMapPages(flatPages), [flatPages]);

  const persist = useCallback(async (patch: Partial<LocationMetadataFields>) => {
    setDraft((prev) => ({
      ...prev,
      ...patch,
      relatedLocationIds: patch.relatedLocationIds ?? prev.relatedLocationIds,
      threats: patch.threats ?? prev.threats,
      knownFor: patch.knownFor ?? prev.knownFor,
    }));
    setSaving(true);
    setError(null);
    try {
      const result = await updateLocationMetadata(campaignHandle, pageId, patch);
      markCommitted(parseLocationMetadata(result.metadata));
      onSaved(result.metadata);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save location data');
    } finally {
      setSaving(false);
    }
  }, [campaignHandle, markCommitted, onSaved, pageId, setDraft]);

  const persistParentId = useCallback(
    async (nextParentId: string | null) => {
      setSaving(true);
      setError(null);
      try {
        await updateWikiPage(campaignHandle, pageId, { parentId: nextParentId });
        onParentIdSaved?.(nextParentId);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save parent page');
      } finally {
        setSaving(false);
      }
    },
    [campaignHandle, onParentIdSaved, pageId, refresh],
  );

  const openCreateLocationPage = useCallback(
    (target: LocationContextCreateTarget, title: string) => {
      setCreateContextTarget(target);
      setCreateContextTitle(title.trim() || null);
      setCreateContextOpen(true);
    },
    [],
  );

  const handleLocationContextPageCreated = useCallback(
    async (page: WikiTreeNode) => {
      const target = createContextTarget;
      setCreateContextOpen(false);
      setCreateContextTitle(null);
      await refresh();
      if (target === 'parent') {
        await persistParentId(page.id);
      } else {
        await persist({ regionPageId: page.id });
      }
    },
    [createContextTarget, persist, persistParentId, refresh],
  );

  const flushDraft = useBlockDraftFlush(
    useCallback(async () => {
      if (!dirty) return;
      const patch = diffRecordPatch(
        source,
        draft,
        Object.keys(source) as (keyof LocationMetadataFields)[],
      );
      if (Object.keys(patch).length === 0) return;
      await persist(patch);
    }, [dirty, draft, persist, source]),
  );
  useRegisterBlockDraft(draftBlockId, dirty, flushDraft);

  const showIdentity = section === 'all' || section === 'identity';
  const showAtlas = section === 'all' || section === 'atlas';
  const showRelationships = section === 'all' || section === 'relationships';

  return (
    <CodexEditorShell saving={saving} error={error} bare={bare}>
      {showIdentity ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1 sm:col-span-2" id={codexFieldId(focusField, 'locationType')}>
            <span className={META_FIELD_LABEL_CLASS}>Type</span>
            <input
              className={codexFieldClass}
              value={draft.locationType ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, locationType: e.target.value }))}
              onBlur={() => void persist({ locationType: draft.locationType })}
              placeholder="City, district, inn…"
            />
          </label>

          <div className="space-y-2 sm:col-span-2">
            <h3 className={META_SECTION_LABEL_CLASS}>Location context</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1" id={codexFieldId(focusField, 'parentPageId')}>
                <span className={META_FIELD_LABEL_CLASS}>Parent page</span>
                <p className="text-[10px] text-muted">Where this place sits in the hierarchy.</p>
                <IdentityPagePicker
                  flatPages={parentPickerPages}
                  defaultOptions={parentPickerPages}
                  searchOptions={parentPickerPages}
                  lookupPages={flatPages}
                  value={parentId}
                  placeholder="Search locations…"
                  createLabel="Create location page"
                  onCreatePage={
                    locationsRoot
                      ? (title) => openCreateLocationPage('parent', title)
                      : undefined
                  }
                  onChange={(nextId) => void persistParentId(nextId)}
                />
              </label>

              <div className="space-y-1" id={codexFieldId(focusField, 'regionPageId')}>
                <span className={META_FIELD_LABEL_CLASS}>Region</span>
                <p className="text-[10px] text-muted">
                  Broader area this place belongs to.
                </p>
                <IdentityPagePicker
                  flatPages={locationPages}
                  defaultOptions={regionPages.length > 0 ? regionPages : locationPages}
                  searchOptions={locationPages}
                  lookupPages={flatPages}
                  value={draft.regionPageId}
                  placeholder="Search locations…"
                  createLabel="Create location page"
                  onCreatePage={
                    locationsRoot
                      ? (title) => openCreateLocationPage('region', title)
                      : undefined
                  }
                  onChange={(nextId) => void persist({ regionPageId: nextId })}
                />
              </div>
            </div>
          </div>

          <label className="space-y-1 sm:col-span-2" id={codexFieldId(focusField, 'climate')}>
            <span className={META_FIELD_LABEL_CLASS}>Climate</span>
            <textarea
              className={`${codexFieldClass} min-h-[52px] resize-y`}
              value={draft.climate ?? ''}
              placeholder="Cold coastal winters, dry summers…"
              onChange={(e) => setDraft((p) => ({ ...p, climate: e.target.value }))}
              onBlur={() => void persist({ climate: draft.climate?.trim() || null })}
            />
          </label>

          <div className="sm:col-span-2" id={codexFieldId(focusField, 'threats')}>
            <SuggestedTagMultiSelect
              id="location-threats"
              label="Threats"
              values={draft.threats}
              suggestions={LOCATION_THREAT_SUGGESTIONS}
              onChange={(next) => void persist({ threats: next })}
              placeholder="Custom threat or hazard…"
            />
          </div>

          <div className="sm:col-span-2" id={codexFieldId(focusField, 'knownFor')}>
            <SuggestedTagMultiSelect
              id="location-known-for"
              label="Known for"
              values={draft.knownFor}
              onChange={(next) => void persist({ knownFor: next })}
              placeholder="Notable reputation or characteristic…"
            />
          </div>

          <label className="space-y-1 sm:col-span-2" id={codexFieldId(focusField, 'currentStatus')}>
            <span className={META_FIELD_LABEL_CLASS}>Current status</span>
            <textarea
              className={`${codexFieldClass} min-h-[52px] resize-y`}
              value={draft.currentStatus ?? ''}
              placeholder="Occupied, prospering, under martial law…"
              onChange={(e) => setDraft((p) => ({ ...p, currentStatus: e.target.value }))}
              onBlur={() =>
                void persist({ currentStatus: draft.currentStatus?.trim() || null })
              }
            />
          </label>
        </div>
      ) : null}

      {showAtlas ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1" id={codexFieldId(focusField, 'rulerOrAuthority')}>
            <span className={META_FIELD_LABEL_CLASS}>Ruler / authority</span>
            <input
              className={codexFieldClass}
              value={draft.rulerOrAuthority ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, rulerOrAuthority: e.target.value }))}
              onBlur={() => void persist({ rulerOrAuthority: draft.rulerOrAuthority })}
            />
          </label>
          <label className="space-y-1" id={codexFieldId(focusField, 'population')}>
            <span className={META_FIELD_LABEL_CLASS}>Population</span>
            <input
              className={codexFieldClass}
              value={draft.population ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, population: e.target.value }))}
              onBlur={() => void persist({ population: draft.population })}
            />
          </label>
          <label className="space-y-1 sm:col-span-2" id={codexFieldId(focusField, 'mapPageId')}>
            <span className={META_FIELD_LABEL_CLASS}>Map page</span>
            <IdentityPagePicker
              flatPages={mapPages}
              defaultOptions={mapPages}
              searchOptions={mapPages}
              lookupPages={flatPages}
              value={draft.mapPageId}
              placeholder="Search maps…"
              onChange={(nextId) => void persist({ mapPageId: nextId })}
            />
          </label>
        </div>
      ) : null}

      {showRelationships ? (
        <PageIdListEditor
          label="Related locations"
          ids={draft.relatedLocationIds}
          pickerPages={locationPages}
          flatPages={flatPages}
          placeholder="Search locations…"
          onChange={(next) => void persist({ relatedLocationIds: next })}
        />
      ) : null}

      {locationsRoot && createContextOpen ? (
        <CreatePageModal
          open={createContextOpen}
          campaignHandle={campaignHandle}
          parentId={locationsRoot.id}
          categoryTitle="Locations"
          flatPages={flatPages}
          initialTitle={createContextTitle}
          initialMetadata={
            createContextTarget === 'region' ? { Type: 'Region' } : undefined
          }
          onClose={() => {
            setCreateContextOpen(false);
            setCreateContextTitle(null);
          }}
          onCreated={(page) => void handleLocationContextPageCreated(page)}
        />
      ) : null}
    </CodexEditorShell>
  );
}
