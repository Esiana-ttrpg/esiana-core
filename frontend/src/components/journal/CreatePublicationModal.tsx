import { useEffect, useState, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_JOURNAL_PUBLICATION_TYPE,
  JOURNAL_PUBLICATION_TYPES,
  computeContentReadiness,
  type JournalPublicationType,
} from '@shared/journalPublication';
import { translatePublicationType } from '@/i18n/journalRelease';
import { useWiki } from '@/contexts/WikiContext';
import { WikiTipTapEditor } from '@/components/wiki/WikiTipTapEditor';
import {
  createJournalPublication,
  createJournalSeries,
  fetchJournalSeries,
  type JournalPublicationDTO,
  type JournalSeriesDTO,
} from '@/lib/journals';

export type CreatePublicationVariant = 'library' | 'planner';

interface CreatePublicationModalProps {
  open: boolean;
  campaignHandle: string;
  variant: CreatePublicationVariant;
  onClose: () => void;
  onCreated: (publication: JournalPublicationDTO) => void;
}

type WizardStep = 'details' | 'content';

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/60';

/**
 * Two-step New Publication wizard: details then content. Library completes with an
 * immediate publication attempt; Planner creates an unfinished draft.
 */
export function CreatePublicationModal({
  open,
  campaignHandle,
  variant,
  onClose,
  onCreated,
}: CreatePublicationModalProps) {
  const { t } = useTranslation();
  const { tree } = useWiki();

  const [step, setStep] = useState<WizardStep>('details');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<JournalPublicationType>(DEFAULT_JOURNAL_PUBLICATION_TYPE);
  const [summary, setSummary] = useState('');
  const [seriesId, setSeriesId] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [body, setBody] = useState('');
  const [seriesOptions, setSeriesOptions] = useState<JournalSeriesDTO[]>([]);
  const [showNewSeries, setShowNewSeries] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState('');
  const [creatingSeries, setCreatingSeries] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep('details');
    setTitle('');
    setType(DEFAULT_JOURNAL_PUBLICATION_TYPE);
    setSummary('');
    setSeriesId('');
    setTagsInput('');
    setBody('');
    setShowNewSeries(false);
    setNewSeriesName('');
    setError(null);
    setSubmitting(false);
    void fetchJournalSeries(campaignHandle)
      .then(setSeriesOptions)
      .catch(() => setSeriesOptions([]));
  }, [open, campaignHandle]);

  if (!open) return null;

  function handleDetailsContinue(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError(t('journal.create.titleRequired'));
      return;
    }
    setError(null);
    setStep('content');
  }

  async function handleCreateInlineSeries() {
    if (!newSeriesName.trim()) {
      setError(t('journal.create.seriesRequired'));
      return;
    }
    setCreatingSeries(true);
    setError(null);
    try {
      const created = await createJournalSeries(campaignHandle, {
        name: newSeriesName.trim(),
      });
      setSeriesOptions((prev) => [...prev, created]);
      setSeriesId(created.id);
      setShowNewSeries(false);
      setNewSeriesName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('journal.create.seriesRequired'));
    } finally {
      setCreatingSeries(false);
    }
  }

  async function handleFinish(event: FormEvent) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const contentMarkdown = body;
    const readiness = computeContentReadiness({
      title: trimmedTitle,
      contentMarkdown,
    });
    if (variant === 'library' && readiness !== 'ready') {
      setError(t('journal.create.contentRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const tags = tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
      const publication = await createJournalPublication(campaignHandle, {
        title: trimmedTitle,
        type,
        summary: summary.trim() || null,
        seriesId: seriesId || null,
        contentMarkdown,
        tags: tags.length > 0 ? tags : undefined,
        ...(variant === 'library' ? { releaseNow: true } : {}),
      });
      onCreated(publication);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('journal.create.titleRequired'));
    } finally {
      setSubmitting(false);
    }
  }

  const stepLabel =
    step === 'details' ? t('journal.create.stepDetails') : t('journal.create.stepContent');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-publication-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-border bg-surface shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2
              id="create-publication-title"
              className="flex items-center gap-2 text-lg font-semibold text-foreground"
            >
              <Plus className="size-5 text-primary" aria-hidden />
              {t('journal.create.publicationHeading')}
            </h2>
            <p className="mt-0.5 text-xs text-muted">{stepLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-elevated"
            aria-label={t('journal.create.cancel')}
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {error ? (
          <p className="mx-5 mt-4 shrink-0 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        {step === 'details' ? (
          <form onSubmit={handleDetailsContinue} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
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

              <label className="block space-y-1">
                <span className="text-sm text-muted">{t('journal.create.summaryLabel')}</span>
                <textarea
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  rows={2}
                  className={inputClass}
                  placeholder={t('journal.create.summaryPlaceholder')}
                />
              </label>

              <div className="space-y-2">
                <label className="block space-y-1">
                  <span className="text-sm text-muted">{t('journal.create.seriesAssignLabel')}</span>
                  <select
                    value={seriesId}
                    onChange={(event) => setSeriesId(event.target.value)}
                    className={inputClass}
                    disabled={showNewSeries}
                  >
                    <option value="">{t('journal.create.seriesNone')}</option>
                    {seriesOptions.map((series) => (
                      <option key={series.id} value={series.id}>
                        {series.name}
                      </option>
                    ))}
                  </select>
                </label>
                {!showNewSeries ? (
                  <button
                    type="button"
                    onClick={() => setShowNewSeries(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    {t('journal.create.createNewSeries')}
                  </button>
                ) : (
                  <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border/60 p-3">
                    <label className="min-w-[12rem] flex-1 space-y-1">
                      <span className="text-xs text-muted">{t('journal.create.seriesNameLabel')}</span>
                      <input
                        value={newSeriesName}
                        onChange={(event) => setNewSeriesName(event.target.value)}
                        className={inputClass}
                        placeholder={t('journal.create.seriesNamePlaceholder')}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={creatingSeries}
                      onClick={() => void handleCreateInlineSeries()}
                      className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20 disabled:opacity-50"
                    >
                      {t('journal.create.seriesSubmit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewSeries(false);
                        setNewSeriesName('');
                      }}
                      className="rounded-lg px-3 py-2 text-sm text-muted hover:text-foreground"
                    >
                      {t('journal.create.cancel')}
                    </button>
                  </div>
                )}
              </div>

              <label className="block space-y-1">
                <span className="text-sm text-muted">{t('journal.create.tagsLabel')}</span>
                <input
                  value={tagsInput}
                  onChange={(event) => setTagsInput(event.target.value)}
                  className={inputClass}
                  placeholder={t('journal.create.tagsPlaceholder')}
                />
              </label>
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-foreground"
              >
                {t('journal.create.cancel')}
              </button>
              <button
                type="submit"
                className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
              >
                {t('journal.create.continue')}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={(event) => void handleFinish(event)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              <WikiTipTapEditor
                content={body}
                onChange={setBody}
                wikiTree={tree}
                minHeight="min-h-[220px]"
                enableInstrumentation={false}
              />
            </div>
            <div className="flex shrink-0 justify-between gap-2 border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep('details');
                }}
                disabled={submitting}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-foreground disabled:opacity-50"
              >
                {t('journal.create.back')}
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-foreground disabled:opacity-50"
                >
                  {t('journal.create.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
                >
                  {submitting ? t('journal.create.submitting') : t('journal.create.finish')}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default CreatePublicationModal;
