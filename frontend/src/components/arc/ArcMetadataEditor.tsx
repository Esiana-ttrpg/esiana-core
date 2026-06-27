import { META_FIELD_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  ARC_KINDS,
  parseArcMetadata,
  type ArcKind,
  type ArcMetadataFields,
} from '@/lib/arcMetadata';
import { updateArcMetadata } from '@/lib/wiki';
import { PageIdListEditor } from '@/components/entity/codexMetadataEditorShared';
import type { WikiTreeNode } from '@/types/wiki';

const fieldClass =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60';

interface ArcMetadataEditorProps {
  campaignHandle: string;
  pageId: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  onSaved: (metadata: Record<string, unknown>) => void;
  bare?: boolean;
}

export function ArcMetadataEditor({
  campaignHandle,
  pageId,
  metadata,
  flatPages,
  onSaved,
  bare = false,
}: ArcMetadataEditorProps) {
  const [draft, setDraft] = useState<ArcMetadataFields>(() => parseArcMetadata(metadata));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(parseArcMetadata(metadata));
  }, [metadata]);

  const persist = useCallback(
    async (patch: Partial<ArcMetadataFields>) => {
      const previous = { ...draft };
      setDraft((prev) => ({ ...prev, ...patch }));
      setSaving(true);
      setError(null);
      try {
        const result = await updateArcMetadata(campaignHandle, pageId, patch);
        const next = parseArcMetadata(result.metadata);
        setDraft(next);
        onSaved(result.metadata);
      } catch (err) {
        setDraft(previous);
        setError(err instanceof Error ? err.message : 'Failed to save arc overlay');
      } finally {
        setSaving(false);
      }
    },
    [campaignHandle, draft, onSaved, pageId],
  );

  const pickerPages = flatPages.filter((p) => p.id !== pageId);

  const body = (
    <div className="space-y-3">
      <p className="text-[10px] text-muted">
        Soft overlay membership — not wiki parent hierarchy. Campaign arcs contain questlines;
        questlines contain quests.
      </p>
      <label className="block space-y-0.5">
        <span className={META_FIELD_LABEL_CLASS}>Arc kind</span>
        <select
          className={fieldClass}
          value={draft.arcKind}
          onChange={(e) => {
            void persist({ arcKind: e.target.value as ArcKind });
          }}
        >
          {ARC_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {kind === 'campaign_arc' ? 'Campaign arc' : 'Questline'}
            </option>
          ))}
        </select>
      </label>
      <PageIdListEditor
        label="Contained pages"
        ids={draft.containedPageIds}
        pickerPages={pickerPages}
        flatPages={flatPages}
        placeholder={
          draft.arcKind === 'campaign_arc' ? 'Questline pages…' : 'Quest pages…'
        }
        onChange={(containedPageIds) => {
          void persist({ containedPageIds });
        }}
      />
      <label className="block space-y-0.5">
        <span className={META_FIELD_LABEL_CLASS}>
          Act index
        </span>
        <input
          type="number"
          className={fieldClass}
          value={draft.actIndex ?? ''}
          onBlur={(e) => {
            const raw = e.target.value.trim();
            const actIndex = raw === '' ? null : Number(raw);
            if (actIndex !== draft.actIndex) void persist({ actIndex });
          }}
          onChange={(e) => {
            const raw = e.target.value.trim();
            setDraft((prev) => ({
              ...prev,
              actIndex: raw === '' ? null : Number(raw),
            }));
          }}
        />
      </label>
      <label className="block space-y-0.5">
        <span className={META_FIELD_LABEL_CLASS}>
          Pacing target
        </span>
        <input
          type="text"
          className={fieldClass}
          value={draft.pacingTarget ?? ''}
          onBlur={(e) => {
            const pacingTarget = e.target.value.trim() || null;
            if (pacingTarget !== draft.pacingTarget) void persist({ pacingTarget });
          }}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, pacingTarget: e.target.value || null }))
          }
        />
      </label>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {saving ? (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Saving…
        </p>
      ) : null}
    </div>
  );

  if (bare) return body;
  return (
    <div className="rounded border border-border p-3">
      <h3 className="mb-2 text-sm font-medium">Arc overlay</h3>
      {body}
    </div>
  );
}
