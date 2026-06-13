import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import {
  WORKSHOP_FORMALIZE_TARGETS,
  type WorkshopDocument,
  type WorkshopFormalizeTarget,
} from '@shared/workshopDocument';
import {
  extractSummaryFromMarkdown,
  LORE_NOTE_FOLDER_TITLES,
  WORKSHOP_FORMALIZE_TARGET_LABELS,
} from '@shared/workshopFormalize';
import { useWiki } from '@/contexts/WikiContext';
import { formalizeWorkshopDraft } from '@/lib/workshopDrafts';
import { campaignWikiPath, campaignProgressionPath } from '@/lib/campaignPaths';
import { scenesViewHref } from '@/lib/progressionLayout';

interface FormalizeDraftModalProps {
  open: boolean;
  campaignHandle: string;
  draft: WorkshopDocument;
  onClose: () => void;
  onFormalized?: () => void;
}

function isQuestPage(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const raw = metadata as Record<string, unknown>;
  return raw.questStatus !== undefined || raw.questType !== undefined;
}

export function FormalizeDraftModal({
  open,
  campaignHandle,
  draft,
  onClose,
  onFormalized,
}: FormalizeDraftModalProps) {
  const navigate = useNavigate();
  const { flatPages, refresh } = useWiki();
  const [target, setTarget] = useState<WorkshopFormalizeTarget>('character');
  const [title, setTitle] = useState(draft.title);
  const [summary, setSummary] = useState('');
  const [loreParentId, setLoreParentId] = useState('');
  const [linkedQuestPageId, setLinkedQuestPageId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(draft.title);
    setSummary(extractSummaryFromMarkdown(draft.bodyMarkdown));
    setTarget('character');
    setLoreParentId('');
    setLinkedQuestPageId('');
    setError(null);

    for (const anchorId of draft.anchorEntityIds ?? []) {
      const page = flatPages.find((p) => p.id === anchorId);
      if (page && isQuestPage(page.metadata)) {
        setLinkedQuestPageId(page.id);
        break;
      }
    }
  }, [open, draft, flatPages]);

  const worldId = useMemo(
    () => flatPages.find((p) => p.title === 'World' && !p.parentId)?.id ?? null,
    [flatPages],
  );

  const loreFolderOptions = useMemo(() => {
    if (!worldId) return [];
    return flatPages
      .filter(
        (p) =>
          p.parentId === worldId &&
          (LORE_NOTE_FOLDER_TITLES as readonly string[]).includes(p.title),
      )
      .map((p) => ({ id: p.id, title: p.title }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [flatPages, worldId]);

  const questOptions = useMemo(
    () =>
      flatPages
        .filter((p) => isQuestPage(p.metadata))
        .slice(0, 40)
        .map((p) => ({ id: p.id, title: p.title })),
    [flatPages],
  );

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await formalizeWorkshopDraft(campaignHandle, draft.id, {
        target,
        title: title.trim() || draft.title,
        summary: summary.trim() || null,
        loreParentId: target === 'lore_note' ? loreParentId || null : null,
        linkedQuestPageId:
          target === 'scene' && linkedQuestPageId ? linkedQuestPageId : null,
      });
      await refresh();
      onFormalized?.();
      onClose();
      if (result.target === 'scene') {
        navigate(scenesViewHref(campaignProgressionPath(campaignHandle), 'outline'));
      } else {
        navigate(campaignWikiPath(campaignHandle, result.formalizedPageId, flatPages));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to formalize draft');
    } finally {
      setSubmitting(false);
    }
  }

  const titleLabel =
    target === 'character' ? 'Name' : target === 'quest' ? 'Quest title' : 'Title';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-labelledby="formalize-draft-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="formalize-draft-title" className="text-sm font-semibold">
            Formalize into campaign
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-4">
          <p className="text-sm text-muted-foreground">
            Creates a minimal canonical entry. Enrich appearance, relationships, and structure
            later on the Codex page.
          </p>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-muted-foreground">Formalize as</legend>
            {WORKSHOP_FORMALIZE_TARGETS.map((id) => {
              const meta = WORKSHOP_FORMALIZE_TARGET_LABELS[id];
              return (
                <label
                  key={id}
                  className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-sm ${
                    target === id ? 'border-primary/60 bg-primary/5' : 'border-border'
                  }`}
                >
                  <input
                    type="radio"
                    name="formalize-target"
                    checked={target === id}
                    onChange={() => setTarget(id)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium text-foreground">{meta.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {meta.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">{titleLabel}</span>
            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">
              Summary <span className="font-normal">(optional)</span>
            </span>
            <textarea
              className="min-h-[72px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
            />
          </label>

          {target === 'lore_note' ? (
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Lore folder</span>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={loreParentId}
                onChange={(e) => setLoreParentId(e.target.value)}
                required
              >
                <option value="">Select folder under World…</option>
                {loreFolderOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {target === 'scene' && questOptions.length > 0 ? (
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted-foreground">
                Linked quest <span className="font-normal">(optional)</span>
              </span>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={linkedQuestPageId}
                onChange={(e) => setLinkedQuestPageId(e.target.value)}
              >
                <option value="">None</option>
                {questOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {submitting ? 'Creating…' : 'Create & open'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
