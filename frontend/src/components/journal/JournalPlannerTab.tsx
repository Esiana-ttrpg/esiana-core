import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Circle,
  PlusCircle,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  JOURNAL_PUBLICATION_TYPES,
  type JournalPlannerItemDTO,
  type JournalPublicationType,
  type PerceivedPlannerState,
} from '@shared/journalPublication';
import {
  renderReleaseDiagnostic,
  translateContentReadiness,
  translatePublicationType,
} from '@/i18n/journalRelease';
import {
  createJournalSeries,
  evaluateJournalPublication,
  fetchJournalPlanner,
  fetchJournalPublication,
  generateNextSeriesIssue,
  releaseJournalPublication,
  updateJournalPublication,
  type ConditionDiagnostic,
  type JournalPublicationDTO,
  type JournalSeriesDTO,
} from '@/lib/journals';

interface JournalPlannerTabProps {
  campaignHandle: string;
}

const QUEUE_ORDER: PerceivedPlannerState[] = ['needs_plan', 'pending', 'blocked'];
const QUEUE_LABEL_KEY: Record<PerceivedPlannerState, string> = {
  needs_plan: 'journal.planner.queueNeedsPlan',
  pending: 'journal.planner.queuePending',
  blocked: 'journal.planner.queueBlocked',
};

function DiagnosticRow({ diagnostic }: { diagnostic: ConditionDiagnostic }) {
  const { t } = useTranslation();
  const text = renderReleaseDiagnostic(diagnostic, t);
  const indent = diagnostic.path.length * 12;
  if (diagnostic.outcome === 'met') {
    return (
      <li className="flex items-start gap-2 text-sm text-foreground" style={{ paddingLeft: indent }}>
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden />
        {text}
      </li>
    );
  }
  if (diagnostic.outcome === 'missing') {
    return (
      <li className="flex items-start gap-2 text-sm text-amber-400" style={{ paddingLeft: indent }}>
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
        {text}
      </li>
    );
  }
  return (
    <li className="flex items-start gap-2 text-sm text-muted" style={{ paddingLeft: indent }}>
      <Circle className="mt-0.5 size-4 shrink-0" aria-hidden />
      {text}
    </li>
  );
}

export function JournalPlannerTab({ campaignHandle }: JournalPlannerTabProps) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState<JournalPlannerItemDTO[]>([]);
  const [series, setSeries] = useState<JournalSeriesDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('pub'));
  const [detail, setDetail] = useState<JournalPublicationDTO | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [draftTitle, setDraftTitle] = useState('');
  const [draftType, setDraftType] = useState<JournalPublicationType>('notice');
  const [draftBody, setDraftBody] = useState('');
  const [busy, setBusy] = useState(false);

  const loadPlanner = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJournalPlanner(campaignHandle);
      setItems(data.items);
      setSeries(data.series);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the Planner');
    } finally {
      setLoading(false);
    }
  }, [campaignHandle]);

  useEffect(() => {
    void loadPlanner();
  }, [loadPlanner]);

  const loadDetail = useCallback(
    async (id: string) => {
      setDetailLoading(true);
      try {
        const dto = await fetchJournalPublication(campaignHandle, id);
        setDetail(dto);
        setDraftTitle(dto.title);
        setDraftType(dto.type);
        setDraftBody(dto.contentMarkdown ?? '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load publication');
        setDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [campaignHandle],
  );

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  const grouped = useMemo(() => {
    const map: Record<PerceivedPlannerState, JournalPlannerItemDTO[]> = {
      needs_plan: [],
      pending: [],
      blocked: [],
    };
    for (const item of items) map[item.perceivedState].push(item);
    return map;
  }, [items]);

  const select = useCallback(
    (id: string) => {
      setSelectedId(id);
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'planner');
      next.set('pub', id);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleSaveContent = useCallback(async () => {
    if (!detail) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await updateJournalPublication(campaignHandle, detail.id, {
        title: draftTitle,
        type: draftType,
        contentMarkdown: draftBody,
      });
      setDetail(updated);
      await loadPlanner();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  }, [campaignHandle, detail, draftTitle, draftType, draftBody, loadPlanner]);

  const handleEvaluate = useCallback(async () => {
    if (!detail) return;
    setBusy(true);
    try {
      const result = await evaluateJournalPublication(campaignHandle, detail.id);
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              planState: result.planState,
              perceivedState: result.perceivedState,
              contentReadiness: result.contentReadiness,
              diagnostics: result.diagnostics,
            }
          : prev,
      );
      await loadPlanner();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate');
    } finally {
      setBusy(false);
    }
  }, [campaignHandle, detail, loadPlanner]);

  const handleRelease = useCallback(
    async (override: boolean) => {
      if (!detail) return;
      setBusy(true);
      setError(null);
      try {
        await releaseJournalPublication(campaignHandle, detail.id, { override });
        setSelectedId(null);
        setDetail(null);
        await loadPlanner();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to release');
      } finally {
        setBusy(false);
      }
    },
    [campaignHandle, detail, loadPlanner],
  );

  const handleNewSeries = useCallback(async () => {
    const name = window.prompt(t('journal.planner.seriesStrip')) ?? '';
    if (!name.trim()) return;
    try {
      await createJournalSeries(campaignHandle, { name: name.trim() });
      await loadPlanner();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create series');
    }
  }, [campaignHandle, loadPlanner, t]);

  const handleGenerateNext = useCallback(
    async (seriesId: string) => {
      try {
        const result = await generateNextSeriesIssue(campaignHandle, seriesId);
        await loadPlanner();
        if (result.publicationId) select(result.publicationId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate issue');
      }
    },
    [campaignHandle, loadPlanner, select],
  );

  const contentReady = detail?.contentReadiness === 'ready';
  const releasable = detail?.planState === 'ready' && contentReady;

  return (
    <div className="flex flex-col gap-4 px-4 py-4 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-foreground">
            <CalendarClock className="size-5 text-primary" aria-hidden />
            {t('journal.planner.title')}
          </h2>
          <p className="text-sm text-muted">{t('journal.planner.subtitle')}</p>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSpinner label={t('journal.planner.title')} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(16rem,20rem)_1fr]">
          <div className="flex flex-col gap-4">
            {items.length === 0 ? (
              <EmptyState icon={CalendarClock} title={t('journal.planner.emptyQueue')} />
            ) : (
              QUEUE_ORDER.map((state) => {
                const group = grouped[state];
                if (group.length === 0) return null;
                return (
                  <section key={state} className="flex flex-col gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {t(QUEUE_LABEL_KEY[state])} · {group.length}
                    </h3>
                    <ul className="flex flex-col gap-1">
                      {group.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => select(item.id)}
                            className={[
                              'w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                              item.id === selectedId
                                ? 'border-primary bg-elevated/40'
                                : 'border-border hover:border-primary/40',
                            ].join(' ')}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate font-medium text-foreground">
                                {item.title || t('journal.states.empty')}
                              </span>
                              {item.unmetCount > 0 && (
                                <span className="shrink-0 text-xs text-muted">
                                  {t('journal.planner.unmetCount', { count: item.unmetCount })}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted">
                              {translatePublicationType(item.type, t)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })
            )}

            <section className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {t('journal.planner.seriesStrip')}
                </h3>
                <button
                  type="button"
                  onClick={() => void handleNewSeries()}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <PlusCircle className="size-3.5" aria-hidden />
                  {t('journal.planner.seriesStrip')}
                </button>
              </div>
              {series.length === 0 ? (
                <p className="text-xs text-muted">{t('journal.planner.seriesNoRule')}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {series.map((entry) => (
                    <li key={entry.id} className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-foreground">{entry.name}</span>
                      <span className="text-xs text-muted">
                        {entry.nextIssueState.kind === 'no_rule'
                          ? t('journal.planner.seriesNoRule')
                          : entry.nextIssueState.kind === 'draft_created'
                            ? t('journal.planner.seriesDraftReady')
                            : t('journal.planner.seriesNotCreated')}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleGenerateNext(entry.id)}
                        className="self-start text-xs text-primary hover:underline"
                      >
                        {t('journal.planner.generateNext')}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            {!selectedId ? (
              <div className="flex h-full items-center justify-center py-16 text-center text-sm text-muted">
                {t('journal.planner.workbenchEmpty')}
              </div>
            ) : detailLoading || !detail ? (
              <LoadingSpinner label={t('journal.planner.workbenchTitle')} />
            ) : (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3">
                  <input
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    placeholder={t('journal.planner.workbenchTitle')}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-base font-semibold text-foreground"
                  />
                  <div className="flex items-center gap-2">
                    <select
                      value={draftType}
                      onChange={(event) => setDraftType(event.target.value as JournalPublicationType)}
                      className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground"
                    >
                      {JOURNAL_PUBLICATION_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {translatePublicationType(type, t)}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-muted">
                      {translateContentReadiness(detail.contentReadiness, t)}
                    </span>
                  </div>
                  <textarea
                    value={draftBody}
                    onChange={(event) => setDraftBody(event.target.value)}
                    rows={6}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSaveContent()}
                    disabled={busy}
                    className="self-start rounded-lg bg-primary px-3 py-2 text-sm font-medium text-background hover:bg-primary/90 disabled:opacity-50"
                  >
                    {t('journal.planner.saveRule')}
                  </button>
                </div>

                <section className="flex flex-col gap-2 border-t border-border pt-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    {t('journal.planner.diagnosticsHeading')}
                  </h3>
                  {detail.diagnostics.length === 0 ? (
                    <p className="text-sm text-muted">{t('journal.states.needsPlan')}</p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {detail.diagnostics.map((diagnostic, index) => (
                        <DiagnosticRow key={index} diagnostic={diagnostic} />
                      ))}
                    </ul>
                  )}
                  {!contentReady && (
                    <p className="text-xs text-amber-400">{t('journal.planner.contentGate')}</p>
                  )}
                </section>

                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={() => void handleEvaluate()}
                    disabled={busy}
                    className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 disabled:opacity-50"
                  >
                    {t('journal.planner.evaluate')}
                  </button>
                  {releasable ? (
                    <button
                      type="button"
                      onClick={() => void handleRelease(false)}
                      disabled={busy}
                      className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-background hover:bg-primary/90 disabled:opacity-50"
                    >
                      {t('journal.planner.release')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleRelease(true)}
                      disabled={busy || !contentReady}
                      className="rounded-lg border border-primary/60 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
                    >
                      {t('journal.planner.releaseOverride')}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default JournalPlannerTab;
