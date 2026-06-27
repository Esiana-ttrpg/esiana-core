import { META_FIELD_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  OBJECTIVE_STATUSES,
  parseObjectiveMetadata,
  type ObjectiveMetadataFields,
  type ObjectiveStatus,
} from '@/lib/objectiveMetadata';
import { updateObjectiveMetadata } from '@/lib/wiki';
import type { WikiTreeNode } from '@/types/wiki';

const fieldClass =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60';

interface ObjectiveMetadataEditorProps {
  campaignHandle: string;
  pageId: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  onSaved: (metadata: Record<string, unknown>) => void;
  bare?: boolean;
}

export function ObjectiveMetadataEditor({
  campaignHandle,
  pageId,
  metadata,
  flatPages,
  onSaved,
  bare = false,
}: ObjectiveMetadataEditorProps) {
  const [draft, setDraft] = useState<ObjectiveMetadataFields>(() =>
    parseObjectiveMetadata(metadata),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPage = flatPages.find((p) => p.id === pageId);
  const parentQuest = currentPage?.parentId
    ? flatPages.find((p) => p.id === currentPage.parentId)
    : undefined;

  useEffect(() => {
    setDraft(parseObjectiveMetadata(metadata));
  }, [metadata]);

  const persist = useCallback(
    async (patch: Partial<ObjectiveMetadataFields>) => {
      const previous = { ...draft };
      setDraft((prev) => ({ ...prev, ...patch }));
      setSaving(true);
      setError(null);
      try {
        const result = await updateObjectiveMetadata(campaignHandle, pageId, patch);
        const next = parseObjectiveMetadata(result.metadata);
        setDraft(next);
        onSaved(result.metadata);
      } catch (err) {
        setDraft(previous);
        setError(err instanceof Error ? err.message : 'Failed to save objective');
      } finally {
        setSaving(false);
      }
    },
    [campaignHandle, draft, onSaved, pageId],
  );

  const body = (
    <div className="space-y-3">
      {parentQuest ? (
        <p className="text-xs text-muted-foreground">
          Parent quest: <span className="font-medium text-foreground">{parentQuest.title}</span>{' '}
          (wiki tree — not editable here)
        </p>
      ) : null}
      <label className="block space-y-0.5">
        <span className={META_FIELD_LABEL_CLASS}>Status</span>
        <select
          className={fieldClass}
          value={draft.objectiveStatus}
          onChange={(e) => {
            void persist({ objectiveStatus: e.target.value as ObjectiveStatus });
          }}
        >
          {OBJECTIVE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-0.5">
        <span className={META_FIELD_LABEL_CLASS}>Summary</span>
        <textarea
          className={`${fieldClass} min-h-[60px]`}
          value={draft.summary ?? ''}
          onBlur={(e) => {
            const summary = e.target.value.trim() || null;
            if (summary !== draft.summary) void persist({ summary });
          }}
          onChange={(e) => setDraft((prev) => ({ ...prev, summary: e.target.value || null }))}
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
      <h3 className="mb-2 text-sm font-medium">Objective</h3>
      {body}
    </div>
  );
}
