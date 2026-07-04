import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Circle,
  ExternalLink,
  FileText,
  Layers,
  Mail,
  MoreHorizontal,
  Newspaper,
  Plus,
  ScrollText,
  Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReleaseRuleEditor } from '@/components/journal/ReleaseRuleEditor';
import { CreatePublicationModal } from '@/components/journal/CreatePublicationModal';
import { CreateSeriesModal } from '@/components/journal/CreateSeriesModal';
import {
  JOURNAL_PUBLICATION_TYPES,
  type JournalPlannerItemDTO,
  type JournalPublicationType,
  type JournalSourceKind,
  type PerceivedPlannerState,
} from '@shared/journalPublication';
import type { ReleaseNode, ReleaseRuleEnvelope } from '@shared/journalReleaseRule';
import {
  journalStateSummary,
  renderReleaseDiagnostic,
  translateContentReadiness,
  translatePerceivedState,
  translatePublicationType,
} from '@/i18n/journalRelease';
import { campaignWorkshopPath } from '@/lib/campaignPaths';
import { formatRelativeUpdated } from '@/utils/formatDate';
import {
  deleteJournalPublication,
  evaluateJournalPublication,
  fetchJournalPlanner,
  fetchJournalPublication,
  generateNextSeriesIssue,
  releaseJournalPublication,
  saveJournalPublicationRule,
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

/**
 * State gravity via the existing depth ladder + soft borders (never saturated
 * status colors, per deprecated-ui-patterns #9): blocked sits heaviest, needs
 * plan is the lightest / least grounded.
 */
const QUEUE_STATE_SURFACE: Record<PerceivedPlannerState, string> = {
  needs_plan: 'region-depth-1 border-border/40',
  pending: 'region-depth-2 border-border/50',
  blocked: 'region-depth-3 border-border/60',
};

const QUEUE_STATE_DOT: Record<PerceivedPlannerState, string> = {
  needs_plan: 'bg-muted',
  pending: 'bg-accent',
  blocked: 'bg-accent-warm',
};

const TYPE_ICON: Partial<Record<JournalPublicationType, LucideIcon>> = {
  newsletter: Newspaper,
  dispatch: Newspaper,
  notice: FileText,
  letter: Mail,
  obituary: ScrollText,
  rumor_sheet: ScrollText,
  journal_entry: ScrollText,
  proclamation: ScrollText,
};

type TranslateFn = (key: string, params?: Record<string, unknown>) => string;

function sourceLabel(kind: JournalSourceKind, t: TranslateFn): string {
  return kind === 'workshop'
    ? t('journal.planner.sourceWorkshop')
    : t('journal.planner.sourceQuickDraft');
}

const CHIP_CLASS = 'rounded-full bg-elevated px-2 py-0.5 text-xs text-muted';

function DiagnosticRow({ diagnostic }: { diagnostic: ConditionDiagnostic }) {
  const { t } = useTranslation();
  const text = renderReleaseDiagnostic(diagnostic, t);
  const indent = diagnostic.path.length * 12;
  if (diagnostic.outcome === 'met') {
    return (
      <li className="flex items-start gap-2 text-sm text-muted" style={{ paddingLeft: indent }}>
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        {text}
      </li>
    );
  }
  if (diagnostic.outcome === 'missing') {
    return (
      <li className="flex items-start gap-2 text-sm text-foreground" style={{ paddingLeft: indent }}>
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent-warm" aria-hidden />
        {text}
      </li>
    );
  }
  return (
    <li className="flex items-start gap-2 text-sm text-foreground" style={{ paddingLeft: indent }}>
      <Circle className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
      {text}
    </li>
  );
}

function QueueCard({
  item,
  selected,
  onSelect,
}: {
  item: JournalPlannerItemDTO;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const Icon = TYPE_ICON[item.type] ?? FileText;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'flex min-h-[4.5rem] w-full flex-col gap-1.5 rounded-lg border px-3 py-2.5 text-left transition-colors',
        QUEUE_STATE_SURFACE[item.perceivedState],
        selected ? 'border-primary ring-1 ring-primary/30' : 'hover:border-primary/40',
      ].join(' ')}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="size-4 shrink-0 text-muted" aria-hidden />
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">
          {item.title || t('journal.states.empty')}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={CHIP_CLASS}>{translatePublicationType(item.type, t)}</span>
        <span className={CHIP_CLASS}>{sourceLabel(item.sourceKind, t)}</span>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted">
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            className={`size-1.5 shrink-0 rounded-full ${QUEUE_STATE_DOT[item.perceivedState]}`}
            aria-hidden
          />
          <span className="truncate">
            {formatRelativeUpdated(item.updatedAt)}
            {item.issueNumber != null
              ? ` · ${t('journal.library.issueLabel', { n: item.issueNumber })}`
              : ''}
          </span>
        </span>
        {item.unmetCount > 0 && (
          <span className="shrink-0 rounded-full bg-accent-warm/10 px-2 py-0.5 font-medium text-accent-warm">
            {t('journal.planner.waitingOn', { count: item.unmetCount })}
          </span>
        )}
      </div>
    </button>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right text-recessed-foreground">{children}</dd>
    </div>
  );
}

function stateBadgeClass(state: PerceivedPlannerState, releasable: boolean): string {
  if (releasable) return 'border-primary/20 bg-primary/10 text-primary';
  if (state === 'blocked') return 'border-border/60 bg-elevated text-accent-warm';
  if (state === 'needs_plan') return 'border-border/40 bg-elevated text-muted';
  return 'border-border/60 bg-elevated text-foreground';
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
  const [draftRule, setDraftRule] = useState<ReleaseNode | ReleaseRuleEnvelope | null>(null);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSeriesOpen, setIsSeriesOpen] = useState(false);

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
        setDraftRule(dto.releaseRule);
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
      setMenuOpen(false);
      setSelectedId(id);
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'planner');
      next.set('pub', id);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const clearSelection = useCallback(() => {
    setMenuOpen(false);
    setSelectedId(null);
    setDetail(null);
    const next = new URLSearchParams(searchParams);
    next.delete('pub');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

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

  const handleSaveRule = useCallback(async () => {
    if (!detail) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await saveJournalPublicationRule(campaignHandle, detail.id, draftRule);
      setDetail(updated);
      setDraftRule(updated.releaseRule);
      await loadPlanner();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save plan');
    } finally {
      setBusy(false);
    }
  }, [campaignHandle, detail, draftRule, loadPlanner]);

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
        clearSelection();
        await loadPlanner();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to release');
      } finally {
        setBusy(false);
      }
    },
    [campaignHandle, detail, clearSelection, loadPlanner],
  );

  const handleDelete = useCallback(async () => {
    if (!detail) return;
    if (!window.confirm(t('journal.planner.deleteConfirm'))) return;
    setBusy(true);
    setError(null);
    try {
      await deleteJournalPublication(campaignHandle, detail.id);
      clearSelection();
      await loadPlanner();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setBusy(false);
    }
  }, [campaignHandle, detail, clearSelection, loadPlanner, t]);

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
  const outstanding = useMemo(
    () => detail?.diagnostics.filter((diag) => diag.outcome !== 'met') ?? [],
    [detail],
  );
  const detailSeriesName = useMemo(() => {
    if (!detail?.seriesId) return null;
    return series.find((entry) => entry.id === detail.seriesId)?.name ?? null;
  }, [detail, series]);

  const primaryButton =
    'rounded-lg bg-primary px-3 py-2 text-sm font-medium text-background hover:bg-primary/90 disabled:opacity-50';
  const ghostButton =
    'rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 disabled:opacity-50';

  return (
    <div className="flex flex-col gap-4 px-4 py-4 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-foreground">
            <CalendarClock className="size-5 text-primary" aria-hidden />
            {t('journal.planner.title')}
          </h2>
          <p className="text-sm text-muted">{t('journal.planner.subtitle')}</p>
        </div>
        <button type="button" onClick={() => setIsCreateOpen(true)} className={primaryButton}>
          <span className="inline-flex items-center gap-1.5">
            <Plus className="size-4" aria-hidden />
            {t('journal.planner.newPublication')}
          </span>
        </button>
      </header>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSpinner label={t('journal.planner.title')} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(15rem,18rem)_minmax(0,1fr)]">
          {/* Left queue */}
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/60 px-3 py-2 text-sm text-muted transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <Plus className="size-4" aria-hidden />
              {t('journal.planner.newDraft')}
            </button>

            {items.length === 0 ? (
              <EmptyState icon={CalendarClock} title={t('journal.planner.emptyQueue')} />
            ) : (
              QUEUE_ORDER.map((state) => {
                const group = grouped[state];
                if (group.length === 0) return null;
                return (
                  <section key={state} className="flex flex-col gap-2">
                    <h3 className="text-sm font-medium text-muted">
                      {t(QUEUE_LABEL_KEY[state])} · {group.length}
                    </h3>
                    <ul className="flex flex-col gap-2">
                      {group.map((item) => (
                        <li key={item.id}>
                          <QueueCard
                            item={item}
                            selected={item.id === selectedId}
                            onSelect={() => select(item.id)}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })
            )}

            {/* Series strip — organization only, never a creation gate */}
            <section className="flex flex-col gap-2 rounded-xl border border-border/50 bg-surface p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-sm font-medium text-muted">
                  <Layers className="size-4" aria-hidden />
                  {t('journal.planner.seriesStrip')}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsSeriesOpen(true)}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Plus className="size-3.5" aria-hidden />
                  {t('journal.planner.newSeries')}
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

          {/* Right region: workbench + rail (or empty CTA) */}
          {!selectedId ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border/60 bg-surface py-16 text-center">
              <CalendarClock className="size-8 text-muted" aria-hidden />
              <p className="max-w-sm text-sm text-muted">{t('journal.planner.workbenchEmpty')}</p>
              <button type="button" onClick={() => setIsCreateOpen(true)} className={primaryButton}>
                <span className="inline-flex items-center gap-1.5">
                  <Plus className="size-4" aria-hidden />
                  {t('journal.planner.newPublication')}
                </span>
              </button>
            </div>
          ) : detailLoading || !detail ? (
            <div className="rounded-xl border border-border/60 bg-surface p-4">
              <LoadingSpinner label={t('journal.planner.workbenchTitle')} />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
              {/* Workbench */}
              <div className="flex flex-col rounded-xl border border-border/60 bg-surface px-4 pt-4">
                {/* Detail header */}
                <div className="flex flex-col gap-3 border-b border-border/60 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <input
                      value={draftTitle}
                      onChange={(event) => setDraftTitle(event.target.value)}
                      placeholder={t('journal.planner.workbenchTitle')}
                      aria-label={t('journal.create.titleLabel')}
                      className="min-w-0 flex-1 bg-transparent text-2xl font-semibold text-focal-foreground outline-none placeholder:text-muted"
                    />
                    <div className="relative flex shrink-0 items-center gap-1">
                      {detail.workshopDraftId && (
                        <Link
                          to={campaignWorkshopPath(campaignHandle, {
                            draftId: detail.workshopDraftId,
                          })}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm text-foreground hover:border-primary/40"
                        >
                          <ExternalLink className="size-4" aria-hidden />
                          <span className="hidden sm:inline">
                            {t('journal.planner.openInEditor')}
                          </span>
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => setMenuOpen((open) => !open)}
                        aria-label={t('journal.planner.moreActions')}
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                        className="rounded-lg border border-border p-1.5 text-muted hover:text-foreground"
                      >
                        <MoreHorizontal className="size-4" aria-hidden />
                      </button>
                      {menuOpen && (
                        <>
                          <button
                            type="button"
                            aria-label={t('journal.create.cancel')}
                            className="fixed inset-0 z-10 cursor-default"
                            onClick={() => setMenuOpen(false)}
                          />
                          <div
                            role="menu"
                            className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-border bg-surface p-1 shadow-lg"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => void handleDelete()}
                              disabled={busy}
                              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-foreground hover:bg-elevated disabled:opacity-50"
                            >
                              <Trash2 className="size-4 text-accent-warm" aria-hidden />
                              {t('journal.planner.delete')}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${stateBadgeClass(
                        detail.perceivedState,
                        Boolean(releasable),
                      )}`}
                    >
                      {releasable
                        ? t('journal.states.ready')
                        : translatePerceivedState(detail.perceivedState, t)}
                    </span>
                    <span className={CHIP_CLASS}>{translatePublicationType(detail.type, t)}</span>
                    <span className={CHIP_CLASS}>{sourceLabel(detail.sourceKind, t)}</span>
                  </div>
                </div>

                {/* Section 1 — What is this? */}
                <section className="flex flex-col gap-3 py-4">
                  <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <span className="flex size-5 items-center justify-center rounded-full bg-elevated text-xs text-muted">
                      1
                    </span>
                    {t('journal.planner.sectionWhatIsThis')}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <label className="flex items-center gap-2">
                      <span className="text-sm text-muted">{t('journal.create.typeLabel')}</span>
                      <select
                        value={draftType}
                        onChange={(event) =>
                          setDraftType(event.target.value as JournalPublicationType)
                        }
                        className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground"
                      >
                        {JOURNAL_PUBLICATION_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {translatePublicationType(type, t)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <span className="text-sm text-muted">
                      {t('journal.planner.sourceLabel')}: {sourceLabel(detail.sourceKind, t)}
                    </span>
                    <span className="text-sm text-recessed-foreground">
                      {translateContentReadiness(detail.contentReadiness, t)}
                    </span>
                  </div>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-muted">{t('journal.planner.notesLabel')}</span>
                    <textarea
                      value={draftBody}
                      onChange={(event) => setDraftBody(event.target.value)}
                      rows={7}
                      placeholder={t('journal.planner.notesPlaceholder')}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </label>
                </section>

                {/* Section 2 — Release when… (flat predicate registry) */}
                <section className="flex flex-col gap-3 border-t border-border/40 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <span className="flex size-5 items-center justify-center rounded-full bg-elevated text-xs text-muted">
                        2
                      </span>
                      {t('journal.planner.sectionReleaseWhen')}
                    </h3>
                    {draftRule && (
                      <button
                        type="button"
                        onClick={() => setDraftRule(null)}
                        className="text-xs text-muted hover:text-foreground"
                      >
                        {t('journal.planner.clearAll')}
                      </button>
                    )}
                  </div>
                  <div className="rounded-lg region-depth-1 p-3">
                    <ReleaseRuleEditor rule={draftRule} onChange={setDraftRule} />
                  </div>
                </section>

                {/* Section 3 — What happens when released? */}
                <section className="flex flex-col gap-2 border-t border-border/40 py-4">
                  <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <span className="flex size-5 items-center justify-center rounded-full bg-elevated text-xs text-muted">
                      3
                    </span>
                    {t('journal.planner.sectionWhenReleased')}
                  </h3>
                  <p className="text-sm text-focal-muted">{t('journal.planner.whenReleasedHelp')}</p>
                </section>

                {/* Sticky footer — actions (manual release lives here, not in the rule builder) */}
                <div className="sticky bottom-0 z-10 mt-2 flex flex-wrap items-center gap-2 border-t border-border/60 bg-surface py-3">
                  <button
                    type="button"
                    onClick={() => void handleSaveContent()}
                    disabled={busy}
                    className={primaryButton}
                  >
                    {t('journal.planner.saveContent')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveRule()}
                    disabled={busy}
                    className={ghostButton}
                  >
                    {t('journal.planner.saveRule')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleEvaluate()}
                    disabled={busy}
                    className={ghostButton}
                  >
                    {t('journal.planner.evaluate')}
                  </button>
                  <div className="flex-1" />
                  {releasable ? (
                    <button
                      type="button"
                      onClick={() => void handleRelease(false)}
                      disabled={busy}
                      className={primaryButton}
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

              {/* Right rail — three weighted cards, subordinate to the workbench */}
              <aside className="flex flex-col gap-4">
                {/* Status — authoritative */}
                <section className="rounded-xl border border-border/60 region-depth-3 p-4 shadow-[inset_3px_0_0_0_var(--color-accent)]">
                  <h3 className="mb-2 text-sm font-semibold text-contextual-foreground/85">
                    {t('journal.planner.statusHeading')}
                  </h3>
                  <div className="flex flex-col gap-2">
                    <span
                      className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${stateBadgeClass(
                        detail.perceivedState,
                        Boolean(releasable),
                      )}`}
                    >
                      {releasable
                        ? t('journal.states.ready')
                        : translatePerceivedState(detail.perceivedState, t)}
                    </span>
                    <p className="text-sm text-focal-foreground">
                      {journalStateSummary(
                        detail.planState,
                        outstanding.length,
                        Boolean(contentReady),
                        t,
                      )}
                    </p>
                    {!contentReady && (
                      <p className="text-xs text-muted">{t('journal.planner.contentGate')}</p>
                    )}
                  </div>
                </section>

                {/* Waiting on — mild tension, the actionable list */}
                <section className="rounded-xl border border-border/50 region-depth-2 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-contextual-foreground/85">
                    {t('journal.planner.waitingOnHeading')}
                  </h3>
                  {outstanding.length === 0 ? (
                    <p className="text-sm text-muted">{t('journal.planner.nothingOutstanding')}</p>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {outstanding.map((diagnostic, index) => (
                        <DiagnosticRow key={index} diagnostic={diagnostic} />
                      ))}
                    </ul>
                  )}
                </section>

                {/* Summary — factual at-a-glance recap, lightest */}
                <section className="rounded-xl border border-border/40 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-contextual-foreground/85">
                    {t('journal.planner.summaryHeading')}
                  </h3>
                  <dl className="flex flex-col gap-1.5 text-sm">
                    <SummaryRow label={t('journal.create.typeLabel')}>
                      {translatePublicationType(detail.type, t)}
                    </SummaryRow>
                    <SummaryRow label={t('journal.planner.sourceLabel')}>
                      {sourceLabel(detail.sourceKind, t)}
                    </SummaryRow>
                    {detailSeriesName && (
                      <SummaryRow label={t('journal.planner.seriesLabel')}>
                        {detail.issueNumber != null
                          ? `${detailSeriesName} · ${t('journal.library.issueLabel', {
                              n: detail.issueNumber,
                            })}`
                          : detailSeriesName}
                      </SummaryRow>
                    )}
                    {detail.linkedPage && (
                      <SummaryRow label={t('journal.planner.originLabel')}>
                        {detail.linkedPage.title}
                      </SummaryRow>
                    )}
                    <SummaryRow label={t('journal.planner.lastCheckedLabel')}>
                      {detail.lastEvaluatedAt
                        ? formatRelativeUpdated(detail.lastEvaluatedAt)
                        : t('journal.planner.neverChecked')}
                    </SummaryRow>
                  </dl>
                </section>
              </aside>
            </div>
          )}
        </div>
      )}

      <CreatePublicationModal
        open={isCreateOpen}
        campaignHandle={campaignHandle}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(pub) => {
          void loadPlanner();
          select(pub.id);
        }}
      />
      <CreateSeriesModal
        open={isSeriesOpen}
        campaignHandle={campaignHandle}
        onClose={() => setIsSeriesOpen(false)}
        onCreated={() => {
          void loadPlanner();
        }}
      />
    </div>
  );
}

export default JournalPlannerTab;
