import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  parseThreadMetadata,
  type ThreadMetadataFields,
} from '@/lib/threadMetadata';
import { updateThreadMetadata, patchThreadLifecycle, fetchThreadLifecycleStates } from '@/lib/wiki';
import {
  NarrativeLifecycleStates,
  type NarrativeLifecycleState,
} from '@shared/narrativeLifecycle';
import { ThreadCardProperties } from '@/components/thread/ThreadCardProperties';
import type { WikiTreeNode } from '@/types/wiki';

interface ThreadMetadataEditorProps {
  campaignHandle: string;
  pageId: string;
  pageTitle: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  onSaved: (metadata: Record<string, unknown>) => void;
  bare?: boolean;
}

export function ThreadMetadataEditor({
  campaignHandle,
  pageId,
  pageTitle,
  metadata,
  flatPages,
  onSaved,
  bare = false,
}: ThreadMetadataEditorProps) {
  const [draft, setDraft] = useState<ThreadMetadataFields>(() =>
    parseThreadMetadata(metadata),
  );
  const [lifecycleState, setLifecycleState] = useState<NarrativeLifecycleState>(
    NarrativeLifecycleStates.DISCOVERED,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    setDraft(parseThreadMetadata(metadata));
  }, [metadata]);

  const loadLifecycle = useCallback(async () => {
    try {
      const data = await fetchThreadLifecycleStates(campaignHandle, [pageId]);
      const row = data.items.find((item) => item.subjectId === pageId);
      const state = (row?.lifecycleState ?? row?.visible) as NarrativeLifecycleState | null;
      if (state && (Object.values(NarrativeLifecycleStates) as string[]).includes(state)) {
        setLifecycleState(state);
      }
    } catch {
      setLifecycleState(NarrativeLifecycleStates.DISCOVERED);
    }
  }, [campaignHandle, pageId]);

  useEffect(() => {
    void loadLifecycle();
  }, [loadLifecycle]);

  async function persistMetadata(patch: Partial<ThreadMetadataFields>) {
    const previous = { ...draft };
    setDraft((prev) => ({ ...prev, ...patch }));
    setSaving(true);
    setError(null);
    try {
      const result = await updateThreadMetadata(campaignHandle, pageId, patch);
      const next = parseThreadMetadata(result.metadata);
      setDraft(next);
      setWarnings(result.metadataWarnings ?? []);
      onSaved(result.metadata);
    } catch (err) {
      setDraft(previous);
      setError(err instanceof Error ? err.message : 'Failed to save thread data');
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function handleLifecycleChange(next: NarrativeLifecycleState) {
    const previous = lifecycleState;
    setLifecycleState(next);
    setSaving(true);
    setError(null);
    try {
      const result = await patchThreadLifecycle(
        campaignHandle,
        pageId,
        next,
        pageTitle,
      );
      setLifecycleState(result.lifecycleState as NarrativeLifecycleState);
      if (result.threadStatus) {
        setDraft((prev) => {
          const next = {
            ...prev,
            threadStatus: result.threadStatus as ThreadMetadataFields['threadStatus'],
          };
          const base =
            metadata && typeof metadata === 'object'
              ? { ...(metadata as Record<string, unknown>) }
              : {};
          onSaved({ ...base, ...next });
          return next;
        });
      } else {
        const base =
          metadata && typeof metadata === 'object'
            ? { ...(metadata as Record<string, unknown>) }
            : {};
        onSaved({ ...base, ...draft });
      }
    } catch (err) {
      setLifecycleState(previous);
      setError(err instanceof Error ? err.message : 'Failed to update lifecycle');
      throw err;
    } finally {
      setSaving(false);
    }
  }

  const body = (
    <>
      {warnings.length > 0 ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-100">
          {warnings.join(' ')}
        </div>
      ) : null}
      {error ? (
        <p className="rounded-md bg-red-950/40 px-2 py-0.5 text-[11px] text-red-300">
          {error}
        </p>
      ) : null}
      <ThreadCardProperties
        thread={draft}
        lifecycleState={lifecycleState}
        flatPages={flatPages}
        pageId={pageId}
        disabled={saving}
        onThreadPatch={persistMetadata}
        onLifecycleChange={handleLifecycleChange}
      />
      {saving ? (
        <p className="flex items-center gap-1 text-[10px] text-muted">
          <Loader2 className="size-3 animate-spin" /> Saving…
        </p>
      ) : null}
    </>
  );

  if (bare) return <div className="space-y-2">{body}</div>;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface/40 p-3">
      {body}
    </div>
  );
}
