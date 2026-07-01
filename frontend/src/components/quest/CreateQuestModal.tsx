import { useEffect, useState, type FormEvent } from 'react';
import { ScrollText, X } from 'lucide-react';
import { CreateVisibilityField } from '@/components/create/CreateVisibilityField';
import {
  DEFAULT_CREATE_VISIBILITY,
  type WikiPageVisibility,
} from '@/lib/createEntityConfig';
import { QUEST_TYPE_PRESETS } from '@/lib/questMetadata';
import { createQuestPage } from '@/lib/wiki';
import type { WikiTreeNode } from '@/types/wiki';

interface CreateQuestModalProps {
  open: boolean;
  campaignHandle: string;
  questsRootId: string;
  initialTitle?: string | null;
  onClose: () => void;
  onCreated: (page: WikiTreeNode) => void;
}

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/60';

export function CreateQuestModal({
  open,
  campaignHandle,
  questsRootId,
  initialTitle = null,
  onClose,
  onCreated,
}: CreateQuestModalProps) {
  const [title, setTitle] = useState('');
  const [questType, setQuestType] = useState('');
  const [visibility, setVisibility] = useState<WikiPageVisibility>(DEFAULT_CREATE_VISIBILITY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(initialTitle?.trim() ?? '');
    setQuestType('');
    setVisibility(DEFAULT_CREATE_VISIBILITY);
    setError(null);
  }, [open, initialTitle]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!questsRootId) {
      setError('Quests category is not set up for this campaign.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const page = await createQuestPage(campaignHandle, questsRootId, {
        title: title.trim(),
        questType: questType.trim() || null,
        visibility,
      });
      onCreated(page);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create quest.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-quest-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2
            id="create-quest-title"
            className="flex items-center gap-2 text-lg font-semibold text-foreground"
          >
            <ScrollText className="size-5 text-primary" />
            Create quest
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-elevated"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error ? (
            <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>
          ) : null}

          <label className="block space-y-1">
            <span className="text-sm text-muted">Title *</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder="Rescue the missing envoy"
              autoFocus
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm text-muted">Quest type</span>
            <input
              value={questType}
              onChange={(e) => setQuestType(e.target.value)}
              className={inputClass}
              placeholder="Main, Side, Faction…"
              list="quest-type-presets"
            />
            <datalist id="quest-type-presets">
              {QUEST_TYPE_PRESETS.map((preset) => (
                <option key={preset} value={preset} />
              ))}
            </datalist>
          </label>

          <CreateVisibilityField value={visibility} onChange={setVisibility} disabled={submitting} />

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-foreground"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Creating…' : 'Create quest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
