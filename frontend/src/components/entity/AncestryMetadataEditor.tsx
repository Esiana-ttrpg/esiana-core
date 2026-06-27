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
  PortraitImageEditor,
  useCodexMetadataDraft,
} from '@/components/entity/codexMetadataEditorShared';
import { IdentityPagePicker } from '@/components/campaign/IdentityPagePicker';
import {
  ANCESTRY_ENTITY_KIND_LABELS,
  parseAncestryMetadata,
  type AncestryEntityKind,
  type AncestryMetadataFields,
} from '@/lib/ancestryMetadata';
import {
  filterAncestryPages,
  filterLocationPages,
} from '@/lib/questHubLayout';
import { updateAncestryMetadata } from '@/lib/wiki';
import type { WikiTreeNode } from '@/types/wiki';

interface AncestryMetadataEditorProps {
  campaignHandle: string;
  pageId: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  onSaved: (metadata: Record<string, unknown>) => void;
  section?: 'identity' | 'culture' | 'relationships' | 'appearance' | 'all';
  bare?: boolean;
  focusField?: string | null;
}

export function AncestryMetadataEditor({
  campaignHandle,
  pageId,
  metadata,
  flatPages,
  onSaved,
  section = 'all',
  bare = false,
  focusField,
}: AncestryMetadataEditorProps) {
  const source = useMemo(() => parseAncestryMetadata(metadata), [metadata]);
  const draftBlockId = `ancestry-metadata:${pageId}`;
  const [draft, setDraft, , markCommitted, dirty] = useCodexMetadataDraft(
    metadata,
    parseAncestryMetadata,
    draftBlockId,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ancestryPages = filterAncestryPages(flatPages, pageId);
  const locationPages = filterLocationPages(flatPages);

  const persist = useCallback(async (patch: Partial<AncestryMetadataFields>) => {
    const previous = { ...draft };
    setDraft((prev) => ({
      ...prev,
      ...patch,
      appearance: patch.appearance
        ? { ...prev.appearance, ...patch.appearance }
        : prev.appearance,
      relatedAncestryIds: patch.relatedAncestryIds ?? prev.relatedAncestryIds,
      relatedLocationIds: patch.relatedLocationIds ?? prev.relatedLocationIds,
    }));
    setSaving(true);
    setError(null);
    try {
      const result = await updateAncestryMetadata(campaignHandle, pageId, patch);
      markCommitted();
      onSaved(result.metadata);
    } catch (err) {
      setDraft(previous);
      setError(err instanceof Error ? err.message : 'Failed to save ancestry data');
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
        Object.keys(source) as (keyof AncestryMetadataFields)[],
      );
      if (Object.keys(patch).length === 0) return;
      await persist(patch);
    }, [dirty, draft, persist, source]),
  );
  useRegisterBlockDraft(draftBlockId, dirty, flushDraft);

  const showIdentity = section === 'all' || section === 'identity';
  const showCulture = section === 'all' || section === 'culture';
  const showRelationships = section === 'all' || section === 'relationships';
  const showAppearance = section === 'all' || section === 'appearance';
  const showPortraitEditor = showIdentity || showAppearance;

  return (
    <CodexEditorShell saving={saving} error={error} bare={bare}>
      {showPortraitEditor ? (
        <PortraitImageEditor
          campaignHandle={campaignHandle}
          portraitUrl={draft.appearance.portraitUrl}
          portraitCredit={draft.appearance.portraitCredit}
          onChange={({ portraitUrl, portraitCredit }) =>
            setDraft((p) => ({
              ...p,
              appearance: { ...p.appearance, portraitUrl, portraitCredit },
            }))
          }
          onPersist={(patch) =>
            void persist({
              appearance: { ...draft.appearance, ...patch },
            })
          }
        />
      ) : null}

      {showIdentity ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1" id={codexFieldId(focusField, 'entityKind')}>
            <span className={META_FIELD_LABEL_CLASS}>Kind</span>
            <select
              className={codexFieldClass}
              value={draft.entityKind}
              onChange={(e) => {
                const entityKind = e.target.value as AncestryEntityKind;
                setDraft((p) => ({ ...p, entityKind }));
              }}
              onBlur={() => void persist({ entityKind: draft.entityKind })}
            >
              {Object.entries(ANCESTRY_ENTITY_KIND_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1" id={codexFieldId(focusField, 'parentAncestryId')}>
            <span className={META_FIELD_LABEL_CLASS}>Parent ancestry</span>
            <IdentityPagePicker
              flatPages={ancestryPages}
              lookupPages={flatPages}
              value={draft.parentAncestryId}
              placeholder="Search parent ancestry…"
              onChange={(next) => void persist({ parentAncestryId: next })}
            />
          </label>
          {draft.entityKind === 'hybrid' ? (
            <label className="space-y-1 sm:col-span-2" id={codexFieldId(focusField, 'secondaryParentAncestryId')}>
              <span className={META_FIELD_LABEL_CLASS}>
                Secondary parent
              </span>
              <IdentityPagePicker
                flatPages={ancestryPages}
                lookupPages={flatPages}
                value={draft.secondaryParentAncestryId}
                placeholder="Search second parent…"
                onChange={(next) => void persist({ secondaryParentAncestryId: next })}
              />
            </label>
          ) : null}
          <label className="space-y-1 sm:col-span-2" id={codexFieldId(focusField, 'identitySummary')}>
            <span className={META_FIELD_LABEL_CLASS}>
              Identity summary
            </span>
            <textarea
              className={`${codexFieldClass} min-h-[3rem] resize-y`}
              value={draft.identitySummary ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, identitySummary: e.target.value }))}
              onBlur={() => void persist({ identitySummary: draft.identitySummary })}
            />
          </label>
          <label className="space-y-1 sm:col-span-2" id={codexFieldId(focusField, 'ancestryType')}>
            <span className={META_FIELD_LABEL_CLASS}>Type</span>
            <input
              className={codexFieldClass}
              value={draft.ancestryType ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, ancestryType: e.target.value }))}
              onBlur={() => void persist({ ancestryType: draft.ancestryType })}
            />
          </label>
          <label className="space-y-1" id={codexFieldId(focusField, 'homeland')}>
            <span className={META_FIELD_LABEL_CLASS}>Homeland</span>
            <input
              className={codexFieldClass}
              value={draft.homeland ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, homeland: e.target.value }))}
              onBlur={() => void persist({ homeland: draft.homeland })}
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
          <label className="space-y-1 sm:col-span-2" id={codexFieldId(focusField, 'knownFor')}>
            <span className={META_FIELD_LABEL_CLASS}>Known for</span>
            <input
              className={codexFieldClass}
              value={draft.knownFor ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, knownFor: e.target.value }))}
              onBlur={() => void persist({ knownFor: draft.knownFor })}
            />
          </label>
          <label className="space-y-1" id={codexFieldId(focusField, 'language')}>
            <span className={META_FIELD_LABEL_CLASS}>Language</span>
            <input
              className={codexFieldClass}
              value={draft.language ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, language: e.target.value }))}
              onBlur={() => void persist({ language: draft.language })}
            />
          </label>
        </div>
      ) : null}

      {showCulture ? (
        <div className="grid gap-2">
          <label className="space-y-1" id={codexFieldId(focusField, 'traditions')}>
            <span className={META_FIELD_LABEL_CLASS}>Traditions</span>
            <textarea
              className={`${codexFieldClass} min-h-[3rem] resize-y`}
              value={draft.traditions ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, traditions: e.target.value }))}
              onBlur={() => void persist({ traditions: draft.traditions })}
            />
          </label>
          <label className="space-y-1" id={codexFieldId(focusField, 'values')}>
            <span className={META_FIELD_LABEL_CLASS}>Values</span>
            <textarea
              className={`${codexFieldClass} min-h-[3rem] resize-y`}
              value={draft.values ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, values: e.target.value }))}
              onBlur={() => void persist({ values: draft.values })}
            />
          </label>
          <label className="space-y-1" id={codexFieldId(focusField, 'reputation')}>
            <span className={META_FIELD_LABEL_CLASS}>Reputation</span>
            <input
              className={codexFieldClass}
              value={draft.reputation ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, reputation: e.target.value }))}
              onBlur={() => void persist({ reputation: draft.reputation })}
            />
          </label>
        </div>
      ) : null}

      {showRelationships ? (
        <div className="space-y-3">
          <PageIdListEditor
            label="Related ancestries"
            ids={draft.relatedAncestryIds}
            pickerPages={ancestryPages}
            flatPages={flatPages}
            placeholder="Search ancestries…"
            onChange={(next) => void persist({ relatedAncestryIds: next })}
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
          appearance={draft.appearance}
          focusField={focusField}
          hidePortrait
          onChange={(appearance) => setDraft((p) => ({ ...p, appearance }))}
          onPersist={(appearance) =>
            void persist({ appearance: { ...draft.appearance, ...appearance } })
          }
        />
      ) : null}
    </CodexEditorShell>
  );
}
