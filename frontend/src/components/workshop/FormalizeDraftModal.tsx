import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import type { WorkshopDocument, WorkshopFormalizeTarget } from '@shared/workshopDocument';
import {
  extractSummaryFromMarkdown,
  getWorkshopFormalizeTargetDef,
  WORKSHOP_FORMALIZE_TARGET_LABELS,
  WORKSHOP_FORMALIZE_UI_GROUPS,
  WORKSHOP_UI_FORMALIZE_TARGETS,
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
  const [linkedQuestPageId, setLinkedQuestPageId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(draft.title);
    setTarget(draft.intendedTarget && WORKSHOP_UI_FORMALIZE_TARGETS.includes(draft.intendedTarget)
      ? draft.intendedTarget
      : 'character');
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

  const questOptions = useMemo(
    () =>
      flatPages
        .filter((p) => isQuestPage(p.metadata))
        .slice(0, 40)
        .map((p) => ({ id: p.id, title: p.title })),
    [flatPages],
  );

  const groupedTargets = useMemo(
    () =>
      WORKSHOP_FORMALIZE_UI_GROUPS.map((group) => ({
        ...group,
        targets: WORKSHOP_UI_FORMALIZE_TARGETS.filter(
          (id) => getWorkshopFormalizeTargetDef(id).uiGroup === group.id,
        ),
      })).filter((group) => group.targets.length > 0),
    [],
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
        summary: extractSummaryFromMarkdown(draft.bodyMarkdown) || null,
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

  const titleLabel = getWorkshopFormalizeTargetDef(target).titleFieldLabel;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-labelledby="formalize-draft-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="formalize-draft-title" className="text-sm font-semibold">
            Save as…
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

          <fieldset className="space-y-3">
            <legend className="text-xs font-medium text-muted-foreground">Save as</legend>
            {groupedTargets.map((group) => (
              <div key={group.id} className="space-y-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </div>
                {group.targets.map((id) => {
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
              </div>
            ))}
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
              {submitting ? 'Saving…' : 'Save As'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
