import { useEffect, useState, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_JOURNAL_PUBLICATION_TYPE,
  JOURNAL_PUBLICATION_TYPES,
  type JournalPublicationType,
} from '@shared/journalPublication';
import { translatePublicationType } from '@/i18n/journalRelease';
import { createJournalPublication, type JournalPublicationDTO } from '@/lib/journals';

interface CreatePublicationModalProps {
  open: boolean;
  campaignHandle: string;
  onClose: () => void;
  onCreated: (publication: JournalPublicationDTO) => void;
}

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/60';

/**
 * Quick-draft entry: the primary "get writing fast" affordance. Always creates a
 * top-level publication (never under a Series). Shared by the Library toolbar,
 * the Planner header, and the empty-workbench CTA.
 */
export function CreatePublicationModal({
  open,
  campaignHandle,
  onClose,
  onCreated,
}: CreatePublicationModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<JournalPublicationType>(DEFAULT_JOURNAL_PUBLICATION_TYPE);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setType(DEFAULT_JOURNAL_PUBLICATION_TYPE);
    setError(null);
    setSubmitting(false);
  }, [open]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError(t('journal.create.titleRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const publication = await createJournalPublication(campaignHandle, {
        title: title.trim(),
        type,
      });
      onCreated(publication);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('journal.create.titleRequired'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-publication-title"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2
            id="create-publication-title"
            className="flex items-center gap-2 text-lg font-semibold text-foreground"
          >
            <Plus className="size-5 text-primary" aria-hidden />
            {t('journal.create.publicationHeading')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-elevated"
            aria-label={t('journal.create.cancel')}
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error ? (
            <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>
          ) : null}

          <label className="block space-y-1">
            <span className="text-sm text-muted">{t('journal.create.titleLabel')}</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={inputClass}
              placeholder={t('journal.create.titlePlaceholder')}
              autoFocus
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm text-muted">{t('journal.create.typeLabel')}</span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as JournalPublicationType)}
              className={inputClass}
            >
              {JOURNAL_PUBLICATION_TYPES.map((option) => (
                <option key={option} value={option}>
                  {translatePublicationType(option, t)}
                </option>
              ))}
            </select>
          </label>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-foreground"
            >
              {t('journal.create.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
            >
              {submitting ? t('journal.create.submitting') : t('journal.create.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreatePublicationModal;
