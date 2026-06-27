import { META_FIELD_LABEL_CLASS, META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useCallback, useMemo, useState } from 'react';
import { useBlockDraft } from '@/hooks/useBlockDraft';
import { useBlockDraftFlush } from '@/hooks/useBlockDraftFlush';
import { useRegisterBlockDraft } from '@/contexts/PageBlockDraftRegistry';
import { diffRecordPatch } from '@/lib/blockDraftFlush';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { IdentityPagePicker } from '@/components/campaign/IdentityPagePicker';
import {
  filterLocationPages,
  filterNpcPages,
} from '@/lib/questHubLayout';
import { parseFamilyMetadata, type FamilyMetadataFields } from '@/lib/familyMetadata';
import { updateFamilyMetadata } from '@/lib/wiki';
import type { WikiTreeNode } from '@/types/wiki';

const fieldClass =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60';

interface FamilyMetadataEditorProps {
  campaignHandle: string;
  pageId: string;
  blockId?: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  onSaved: (metadata: Record<string, unknown>) => void;
  section?: 'identity' | 'lineage' | 'all';
  bare?: boolean;
}

export function FamilyMetadataEditor({
  campaignHandle,
  pageId,
  blockId,
  metadata,
  flatPages,
  onSaved,
  section = 'all',
  bare = false,
}: FamilyMetadataEditorProps) {
  const source = useMemo(() => parseFamilyMetadata(metadata), [metadata]);
  const draftBlockId = blockId ?? `entity-family-hero:${pageId}`;
  const { draft, setDraft, dirty, markCommitted } = useBlockDraft({
    blockId: draftBlockId,
    source,
    serialize: (value) => JSON.stringify(value),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [traitDraft, setTraitDraft] = useState('');

  const npcPages = filterNpcPages(flatPages);
  const locationPages = filterLocationPages(flatPages);

  const persist = useCallback(
    async (patch: Partial<FamilyMetadataFields>) => {
      setDraft((prev) => ({ ...prev, ...patch }));
      setSaving(true);
      setError(null);
      try {
        const result = await updateFamilyMetadata(campaignHandle, pageId, patch);
        markCommitted(parseFamilyMetadata(result.metadata));
        onSaved(result.metadata);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save family data');
      } finally {
        setSaving(false);
      }
    },
    [campaignHandle, markCommitted, onSaved, pageId, setDraft],
  );

  const flushDraft = useBlockDraftFlush(
    useCallback(async () => {
      if (!dirty) return;
      const patch = diffRecordPatch(
        source,
        draft,
        Object.keys(source) as (keyof FamilyMetadataFields)[],
      );
      if (Object.keys(patch).length === 0) return;
      await persist(patch);
    }, [dirty, draft, persist, source]),
  );
  useRegisterBlockDraft(draftBlockId, dirty, flushDraft);

  function addTrait() {
    const trimmed = traitDraft.trim();
    if (!trimmed) return;
    const next = [...draft.inheritedTraits, trimmed];
    setTraitDraft('');
    void persist({ inheritedTraits: next });
  }

  function removeTrait(index: number) {
    void persist({
      inheritedTraits: draft.inheritedTraits.filter((_, i) => i !== index),
    });
  }

  const showIdentity = section === 'all' || section === 'identity';
  const showLineage = section === 'all' || section === 'lineage';

  const body = (
    <>
      {showIdentity ? (
      <>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1">
          <span className={META_FIELD_LABEL_CLASS}>
            Type
          </span>
          <input
            className={fieldClass}
            value={draft.familyType ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, familyType: e.target.value }))}
            onBlur={() => void persist({ familyType: draft.familyType })}
          />
        </label>
        <label className="space-y-1">
          <span className={META_FIELD_LABEL_CLASS}>
            Status
          </span>
          <input
            className={fieldClass}
            value={draft.status ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value }))}
            onBlur={() => void persist({ status: draft.status })}
          />
        </label>
        <label className="space-y-1">
          <span className={META_FIELD_LABEL_CLASS}>
            Region
          </span>
          <input
            className={fieldClass}
            value={draft.region ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, region: e.target.value }))}
            onBlur={() => void persist({ region: draft.region })}
          />
        </label>
        <label className="space-y-1">
          <span className={META_FIELD_LABEL_CLASS}>
            House branch
          </span>
          <input
            className={fieldClass}
            value={draft.houseBranch ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, houseBranch: e.target.value }))}
            onBlur={() => void persist({ houseBranch: draft.houseBranch })}
          />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className={META_FIELD_LABEL_CLASS}>
            Coat of arms
          </span>
          <input
            className={fieldClass}
            value={draft.coatOfArms ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, coatOfArms: e.target.value }))}
            onBlur={() => void persist({ coatOfArms: draft.coatOfArms })}
          />
        </label>
      </div>

      <div className="space-y-2">
        <span className={META_SECTION_LABEL_CLASS}>
          Inherited traits
        </span>
        <div className="flex gap-1">
          <input
            className={fieldClass}
            value={traitDraft}
            placeholder="Add trait…"
            onChange={(e) => setTraitDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTrait();
              }
            }}
          />
          <button
            type="button"
            onClick={addTrait}
            className="rounded border border-border px-2 text-xs hover:border-primary/40"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
        <ul className="space-y-1">
          {draft.inheritedTraits.map((trait, index) => (
            <li
              key={`${trait}-${index}`}
              className="flex items-center justify-between rounded border border-border/60 px-2 py-1 text-xs"
            >
              <span>{trait}</span>
              <button
                type="button"
                onClick={() => removeTrait(index)}
                className="text-muted hover:text-red-400"
                aria-label={`Remove trait ${trait}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </div>
      </>
      ) : null}

      {showLineage ? (
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1">
          <span className={META_FIELD_LABEL_CLASS}>
            Current head
          </span>
          <IdentityPagePicker
            flatPages={npcPages}
            lookupPages={flatPages}
            value={draft.headCharacterId}
            placeholder="Search characters…"
            onChange={(nextId) => void persist({ headCharacterId: nextId })}
          />
        </label>
        <label className="space-y-1">
          <span className={META_FIELD_LABEL_CLASS}>
            Seat
          </span>
          <IdentityPagePicker
            flatPages={locationPages}
            lookupPages={flatPages}
            value={draft.seatLocationId}
            placeholder="Search locations…"
            onChange={(nextId) => void persist({ seatLocationId: nextId })}
          />
        </label>
      </div>
      ) : null}

      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </>
  );

  if (bare) {
    return (
      <div className="relative space-y-3">
        {saving ? (
          <Loader2 className="absolute right-0 top-0 size-3.5 animate-spin text-muted" />
        ) : null}
        {body}
      </div>
    );
  }

  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className={META_SECTION_LABEL_CLASS}>
          Dynasty registry
        </h3>
        {saving && <Loader2 className="size-3.5 animate-spin text-muted" />}
      </div>
      {body}
    </section>
  );
}