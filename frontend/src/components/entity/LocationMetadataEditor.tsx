import { META_FIELD_LABEL_CLASS } from '@/lib/surfaceLayout';
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
import { IdentityPagePicker } from '@/components/campaign/IdentityPagePicker';
import { parseLocationMetadata, type LocationMetadataFields } from '@/lib/locationMetadata';
import { filterLocationPages } from '@/lib/questHubLayout';
import { updateLocationMetadata } from '@/lib/wiki';
import type { WikiTreeNode } from '@/types/wiki';

interface LocationMetadataEditorProps {
  campaignHandle: string;
  pageId: string;
  blockId?: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
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
  onSaved,
  section = 'all',
  bare = false,
  focusField,
}: LocationMetadataEditorProps) {
  const source = useMemo(() => parseLocationMetadata(metadata), [metadata]);
  const draftBlockId = blockId ?? `entity-location-hero:${pageId}`;
  const [draft, setDraft, , markCommitted, dirty] = useCodexMetadataDraft(
    metadata,
    parseLocationMetadata,
    draftBlockId,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locationPages = filterLocationPages(flatPages).filter((p) => p.id !== pageId);

  const persist = useCallback(async (patch: Partial<LocationMetadataFields>) => {
    setDraft((prev) => ({
      ...prev,
      ...patch,
      relatedLocationIds: patch.relatedLocationIds ?? prev.relatedLocationIds,
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
            />
          </label>
          <label className="space-y-1" id={codexFieldId(focusField, 'region')}>
            <span className={META_FIELD_LABEL_CLASS}>Region</span>
            <input
              className={codexFieldClass}
              value={draft.region ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, region: e.target.value }))}
              onBlur={() => void persist({ region: draft.region })}
            />
          </label>
          <label className="space-y-1" id={codexFieldId(focusField, 'regionKey')}>
            <span className={META_FIELD_LABEL_CLASS}>Region key</span>
            <input
              className={codexFieldClass}
              value={draft.regionKey ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, regionKey: e.target.value }))}
              onBlur={() => void persist({ regionKey: draft.regionKey })}
              placeholder="stable-slug-for-snapshots"
            />
          </label>
          <label className="space-y-1" id={codexFieldId(focusField, 'regionPageId')}>
            <span className={META_FIELD_LABEL_CLASS}>Region page</span>
            <IdentityPagePicker
              flatPages={flatPages}
              lookupPages={locationPages}
              value={draft.regionPageId}
              placeholder="Optional region wiki page…"
              onChange={(nextId) => void persist({ regionPageId: nextId })}
            />
          </label>
          <label className="space-y-1" id={codexFieldId(focusField, 'dangerLevel')}>
            <span className={META_FIELD_LABEL_CLASS}>Danger (1–5)</span>
            <input
              type="number"
              min={1}
              max={5}
              className={codexFieldClass}
              value={draft.dangerLevel ?? ''}
              onChange={(e) => {
                const raw = e.target.value;
                const n = raw === '' ? null : Number(raw);
                setDraft((p) => ({
                  ...p,
                  dangerLevel:
                    n != null && Number.isFinite(n) ? Math.min(5, Math.max(1, Math.round(n))) : null,
                }));
              }}
              onBlur={() => void persist({ dangerLevel: draft.dangerLevel })}
            />
          </label>
          <label className="space-y-1" id={codexFieldId(focusField, 'climate')}>
            <span className={META_FIELD_LABEL_CLASS}>Climate</span>
            <input
              className={codexFieldClass}
              value={draft.climate ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, climate: e.target.value }))}
              onBlur={() => void persist({ climate: draft.climate })}
            />
          </label>
          <label className="space-y-1 sm:col-span-2" id={codexFieldId(focusField, 'knownFor')}>
            <span className={META_FIELD_LABEL_CLASS}>Known for</span>
            <input
              className={codexFieldClass}
              value={draft.knownFor ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, knownFor: e.target.value }))}
              onBlur={() => void persist({ knownFor: draft.knownFor })}
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
              flatPages={flatPages}
              lookupPages={flatPages}
              value={draft.mapPageId}
              placeholder="Link map page…"
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
    </CodexEditorShell>
  );
}
