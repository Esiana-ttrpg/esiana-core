import { META_FIELD_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useCallback, useMemo, useState } from 'react';
import { useBlockDraftFlush } from '@/hooks/useBlockDraftFlush';
import { useRegisterBlockDraft } from '@/contexts/PageBlockDraftRegistry';
import { diffRecordPatch } from '@/lib/blockDraftFlush';
import {
  AppearanceEditor,
  CodexEditorShell,
  codexFieldClass,
  codexFieldId,
  PageIdListEditor,
  useCodexMetadataDraft,
} from '@/components/entity/codexMetadataEditorShared';
import { IdentityPagePicker } from '@/components/campaign/IdentityPagePicker';
import { parseObjectMetadata, type ObjectMetadataFields } from '@/lib/objectMetadata';
import {
  filterLocationPages,
  filterNpcPages,
  filterObjectPages,
  filterOrganizationPages,
} from '@/lib/questHubLayout';
import { updateObjectMetadata } from '@/lib/wiki';
import type { WikiTreeNode } from '@/types/wiki';

interface ObjectMetadataEditorProps {
  campaignHandle: string;
  pageId: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  onSaved: (metadata: Record<string, unknown>) => void;
  section?: 'identity' | 'provenance' | 'relationships' | 'appearance' | 'all';
  bare?: boolean;
  focusField?: string | null;
}

export function ObjectMetadataEditor({
  campaignHandle,
  pageId,
  metadata,
  flatPages,
  onSaved,
  section = 'all',
  bare = false,
  focusField,
}: ObjectMetadataEditorProps) {
  const source = useMemo(() => parseObjectMetadata(metadata), [metadata]);
  const draftBlockId = `object-metadata:${pageId}`;
  const [draft, setDraft, , markCommitted, dirty] = useCodexMetadataDraft(
    metadata,
    parseObjectMetadata,
    draftBlockId,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orgPages = filterOrganizationPages(flatPages);
  const locationPages = filterLocationPages(flatPages);
  const holderPages = useMemo(
    () => [...filterNpcPages(flatPages), ...filterObjectPages(flatPages, pageId)],
    [flatPages, pageId],
  );

  const persist = useCallback(async (patch: Partial<ObjectMetadataFields>) => {
    const previous = { ...draft };
    setDraft((prev) => ({
      ...prev,
      ...patch,
      appearance: patch.appearance
        ? { ...prev.appearance, ...patch.appearance }
        : prev.appearance,
      relatedOrganizationIds:
        patch.relatedOrganizationIds ?? prev.relatedOrganizationIds,
      relatedLocationIds: patch.relatedLocationIds ?? prev.relatedLocationIds,
    }));
    setSaving(true);
    setError(null);
    try {
      const result = await updateObjectMetadata(campaignHandle, pageId, patch);
      markCommitted(parseObjectMetadata(result.metadata));
      onSaved(result.metadata);
    } catch (err) {
      setDraft(previous);
      setError(err instanceof Error ? err.message : 'Failed to save object data');
    } finally {
      setSaving(false);
    }
  }, [campaignHandle, draft, markCommitted, onSaved, pageId, setDraft]);

  const flushDraft = useBlockDraftFlush(
    useCallback(async () => {
      if (!dirty) return;
      const patch = diffRecordPatch(
        source,
        draft,
        Object.keys(source) as (keyof ObjectMetadataFields)[],
      );
      if (Object.keys(patch).length === 0) return;
      await persist(patch);
    }, [dirty, draft, persist, source]),
  );
  useRegisterBlockDraft(draftBlockId, dirty, flushDraft);

  const showIdentity = section === 'all' || section === 'identity';
  const showProvenance = section === 'all' || section === 'provenance';
  const showRelationships = section === 'all' || section === 'relationships';
  const showAppearance = section === 'all' || section === 'appearance';

  return (
    <CodexEditorShell saving={saving} error={error} bare={bare}>
      {showIdentity ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1 sm:col-span-2" id={codexFieldId(focusField, 'objectType')}>
            <span className={META_FIELD_LABEL_CLASS}>Type</span>
            <input
              className={codexFieldClass}
              value={draft.objectType ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, objectType: e.target.value }))}
              onBlur={() => void persist({ objectType: draft.objectType })}
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
          <label className="space-y-1" id={codexFieldId(focusField, 'investedOrMagical')}>
            <span className={META_FIELD_LABEL_CLASS}>Invested / magical</span>
            <input
              className={codexFieldClass}
              value={draft.investedOrMagical ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, investedOrMagical: e.target.value }))}
              onBlur={() => void persist({ investedOrMagical: draft.investedOrMagical })}
            />
          </label>
          <label className="space-y-1 sm:col-span-2" id={codexFieldId(focusField, 'powersSummary')}>
            <span className={META_FIELD_LABEL_CLASS}>Powers</span>
            <textarea
              className={`${codexFieldClass} min-h-[3rem] resize-y`}
              value={draft.powersSummary ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, powersSummary: e.target.value }))}
              onBlur={() => void persist({ powersSummary: draft.powersSummary })}
            />
          </label>
        </div>
      ) : null}

      {showProvenance ? (
        <div className="grid gap-2">
          <label className="space-y-1" id={codexFieldId(focusField, 'provenance')}>
            <span className={META_FIELD_LABEL_CLASS}>Provenance</span>
            <textarea
              className={`${codexFieldClass} min-h-[3rem] resize-y`}
              value={draft.provenance ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, provenance: e.target.value }))}
              onBlur={() => void persist({ provenance: draft.provenance })}
            />
          </label>
          <label className="space-y-1" id={codexFieldId(focusField, 'historicalSignificance')}>
            <span className={META_FIELD_LABEL_CLASS}>Historical significance</span>
            <input
              className={codexFieldClass}
              value={draft.historicalSignificance ?? ''}
              onChange={(e) =>
                setDraft((p) => ({ ...p, historicalSignificance: e.target.value }))
              }
              onBlur={() => void persist({ historicalSignificance: draft.historicalSignificance })}
            />
          </label>
          <label className="space-y-1" id={codexFieldId(focusField, 'currentHolderId')}>
            <span className={META_FIELD_LABEL_CLASS}>Current holder</span>
            <IdentityPagePicker
              flatPages={holderPages}
              lookupPages={flatPages}
              value={draft.currentHolderId}
              placeholder="Search characters or objects…"
              onChange={(nextId) => void persist({ currentHolderId: nextId })}
            />
          </label>
        </div>
      ) : null}

      {showRelationships ? (
        <div className="space-y-3">
          <PageIdListEditor
            label="Related organizations"
            ids={draft.relatedOrganizationIds}
            pickerPages={orgPages}
            flatPages={flatPages}
            placeholder="Search organizations…"
            onChange={(next) => void persist({ relatedOrganizationIds: next })}
          />
          <PageIdListEditor
            label="Related locations"
            ids={draft.relatedLocationIds}
            pickerPages={locationPages}
            flatPages={flatPages}
            placeholder="Search locations…"
            onChange={(next) => void persist({ relatedLocationIds: next })}
          />
        </div>
      ) : null}

      {showAppearance ? (
        <AppearanceEditor
          campaignHandle={campaignHandle}
          appearance={draft.appearance}
          focusField={focusField}
          onChange={(appearance) => setDraft((p) => ({ ...p, appearance }))}
          onPersist={(appearance) =>
            void persist({ appearance: { ...draft.appearance, ...appearance } })
          }
        />
      ) : null}
    </CodexEditorShell>
  );
}
