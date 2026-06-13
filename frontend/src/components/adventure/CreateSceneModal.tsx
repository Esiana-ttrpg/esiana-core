import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import {
  SCENE_BEAT_TYPES,
  SCENE_KINDS,
  SCENE_NARRATIVE_WEIGHTS,
  DEFAULT_SCENE_NARRATIVE_WEIGHT,
  type SceneBeatType,
  type SceneKind,
  type SceneNarrativeWeight,
} from '@/lib/sceneMetadata';
import { formatSceneBeatLabel, sceneBeatHint } from '@/lib/sceneBeatVisualTokens';
import { createScenePage } from '@/lib/adventure';
import { resolveNarrativeScenesRootId } from '@/lib/adventureLayout';
import { campaignWikiPath } from '@/lib/campaignPaths';
import type { WikiTreeNode } from '@/types/wiki';

interface CreateSceneModalProps {
  open: boolean;
  campaignHandle: string;
  flatPages: WikiTreeNode[];
  onClose: () => void;
  onCreated?: () => void;
}

export function CreateSceneModal({
  open,
  campaignHandle,
  flatPages,
  onClose,
  onCreated,
}: CreateSceneModalProps) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [beatType, setBeatType] = useState<SceneBeatType | ''>('');
  const [sceneKind, setSceneKind] = useState<SceneKind | ''>('');
  const [narrativeWeight, setNarrativeWeight] = useState<SceneNarrativeWeight>(
    DEFAULT_SCENE_NARRATIVE_WEIGHT,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scenesRootId = useMemo(
    () => resolveNarrativeScenesRootId(flatPages),
    [flatPages],
  );

  useEffect(() => {
    if (!open) {
      setTitle('');
      setSummary('');
      setBeatType('');
      setSceneKind('');
      setNarrativeWeight(DEFAULT_SCENE_NARRATIVE_WEIGHT);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!scenesRootId || !title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const page = await createScenePage(campaignHandle, {
        title: title.trim(),
        parentId: scenesRootId,
        summary: summary.trim() || undefined,
        beatType: beatType || undefined,
        sceneKind: sceneKind || undefined,
        narrativeWeight,
      });
      onCreated?.();
      onClose();
      navigate(campaignWikiPath(campaignHandle, page.id, flatPages));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create scene');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-4 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">New narrative scene</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        {!scenesRootId ? (
          <p className="text-sm text-muted-foreground">
            Scenes category not found. Ensure the campaign wiki has a Scenes folder.
          </p>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
            <label className="block text-sm">
              Title
              <input
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              Summary
              <textarea
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5"
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="DM-facing narrative intent for this scene"
              />
            </label>
            <label className="block text-sm">
              Beat type
              <select
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5"
                value={beatType}
                onChange={(e) => setBeatType(e.target.value as SceneBeatType | '')}
              >
                <option value="">—</option>
                {SCENE_BEAT_TYPES.map((b) => (
                  <option key={b} value={b}>
                    {formatSceneBeatLabel(b) ?? b}
                  </option>
                ))}
              </select>
              {beatType ? (
                <p className="mt-1 text-xs text-muted-foreground">{sceneBeatHint(beatType)}</p>
              ) : null}
            </label>
            <label className="block text-sm">
              Scene kind
              <select
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5"
                value={sceneKind}
                onChange={(e) => setSceneKind(e.target.value as SceneKind | '')}
              >
                <option value="">—</option>
                {SCENE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Narrative weight
              <select
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5"
                value={narrativeWeight}
                onChange={(e) => setNarrativeWeight(e.target.value as SceneNarrativeWeight)}
              >
                {SCENE_NARRATIVE_WEIGHTS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </label>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Create scene
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
