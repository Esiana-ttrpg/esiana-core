import { useEffect, useState, type FormEvent } from 'react';
import { Layers, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createJournalSeries, type JournalSeriesDTO } from '@/lib/journals';

interface CreateSeriesModalProps {
  open: boolean;
  campaignHandle: string;
  onClose: () => void;
  onCreated: (series: JournalSeriesDTO) => void;
}

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/60';

/**
 * Series creation is an organization affordance, not a publication entry point.
 * A single name field keeps it visually distinct from the quick-draft modal.
 */
export function CreateSeriesModal({
  open,
  campaignHandle,
  onClose,
  onCreated,
}: CreateSeriesModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setDescription('');
    setError(null);
    setSubmitting(false);
  }, [open]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError(t('journal.create.seriesRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const series = await createJournalSeries(campaignHandle, {
        name: name.trim(),
        description: description.trim() || null,
      });
      onCreated(series);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('journal.create.seriesRequired'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-series-title"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2
            id="create-series-title"
            className="flex items-center gap-2 text-lg font-semibold text-foreground"
          >
            <Layers className="size-5 text-primary" aria-hidden />
            {t('journal.create.seriesHeading')}
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
            <span className="text-sm text-muted">{t('journal.create.seriesNameLabel')}</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
              placeholder={t('journal.create.seriesNamePlaceholder')}
              autoFocus
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm text-muted">{t('journal.create.seriesDescriptionLabel')}</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className={inputClass}
              placeholder={t('journal.create.seriesDescriptionPlaceholder')}
            />
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
              {submitting ? t('journal.create.submitting') : t('journal.create.seriesSubmit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateSeriesModal;
