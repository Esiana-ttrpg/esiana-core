import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { parseSceneMetadata, type SceneMetadataFields } from '@/lib/sceneMetadata';
import {
  updateSceneMetadata,
  patchSceneLifecycle,
  fetchSceneLifecycleStates,
} from '@/lib/wiki';
import {
  NarrativeLifecycleStates,
  type NarrativeLifecycleState,
} from '@shared/narrativeLifecycle';
import { SceneCardProperties } from '@/components/scene/SceneCardProperties';
import type { WikiTreeNode } from '@/types/wiki';

interface SceneMetadataEditorProps {
  campaignHandle: string;
  pageId: string;
  pageTitle: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  onSaved: (metadata: Record<string, unknown>) => void;
  bare?: boolean;
}

/** Scene orchestration editor (SceneEditorPanel). */
export function SceneMetadataEditor({
  campaignHandle,
  pageId,
  pageTitle,
  metadata,
  flatPages,
  onSaved,
  bare = false,
}: SceneMetadataEditorProps) {
  const [draft, setDraft] = useState<SceneMetadataFields>(() => parseSceneMetadata(metadata));
  const [lifecycleState, setLifecycleState] = useState<NarrativeLifecycleState>(
    NarrativeLifecycleStates.LOCKED,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    setDraft(parseSceneMetadata(metadata));
  }, [metadata]);

  const loadLifecycle = useCallback(async () => {
    try {
      const data = await fetchSceneLifecycleStates(campaignHandle, [pageId]);
      const row = data.items.find((item) => item.subjectId === pageId);
      const state = (row?.lifecycleState ?? row?.visible) as NarrativeLifecycleState | null;
      if (state && (Object.values(NarrativeLifecycleStates) as string[]).includes(state)) {
        setLifecycleState(state);
      }
    } catch {
      setLifecycleState(NarrativeLifecycleStates.LOCKED);
    }
  }, [campaignHandle, pageId]);

  useEffect(() => {
    void loadLifecycle();
  }, [loadLifecycle]);

  async function persistMetadata(patch: Partial<SceneMetadataFields>) {
    const previous = { ...draft };
    setDraft((prev) => ({ ...prev, ...patch }));
    setSaving(true);
    setError(null);
    try {
      const result = await updateSceneMetadata(campaignHandle, pageId, patch);
      const next = parseSceneMetadata(result.metadata);
      setDraft(next);
      setWarnings(result.metadataWarnings ?? []);
      onSaved(result.metadata);
      if (patch.sceneStatus) {
        await loadLifecycle();
      }
    } catch (err) {
      setDraft(previous);
      setError(err instanceof Error ? err.message : 'Failed to save scene data');
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
      const result = await patchSceneLifecycle(campaignHandle, pageId, next, pageTitle);
      setLifecycleState(result.lifecycleState as NarrativeLifecycleState);
      if (result.sceneStatus) {
        setDraft((prev) => {
          const updated = {
            ...prev,
            sceneStatus: result.sceneStatus as SceneMetadataFields['sceneStatus'],
          };
          const base =
            metadata && typeof metadata === 'object'
              ? { ...(metadata as Record<string, unknown>) }
              : {};
          onSaved({ ...base, ...updated });
          return updated;
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
      <SceneCardProperties
        scene={draft}
        lifecycleState={lifecycleState}
        flatPages={flatPages}
        pageId={pageId}
        campaignHandle={campaignHandle}
        disabled={saving}
        onScenePatch={persistMetadata}
        onLifecycleChange={handleLifecycleChange}
      />
      {saving ? (
        <p className="flex items-center gap-1 text-[10px] text-muted">
          <Loader2 className="size-3 animate-spin" /> Saving…
        </p>
      ) : null}
    </>
  );

  if (bare) return body;

  return (
    <section className="rounded-lg border border-border bg-card p-3">
      <h3 className="mb-2 text-sm font-semibold">Scene orchestration</h3>
      {body}
    </section>
  );
}

export { SceneMetadataEditor as SceneEditorPanel };
