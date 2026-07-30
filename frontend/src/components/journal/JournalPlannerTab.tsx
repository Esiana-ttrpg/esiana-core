import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CalendarClock,
  ExternalLink,
  FileText,
  Mail,
  Newspaper,
  Plus,
  ScrollText,
  Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { WikiTipTapEditor } from '@/components/wiki/WikiTipTapEditor';
import { InspectorCollapsibleSection } from '@/components/entity/InspectorCollapsibleSection';
import { ReleaseRuleEditor } from '@/components/journal/ReleaseRuleEditor';
import { CreatePublicationModal } from '@/components/journal/CreatePublicationModal';
import { CreateSeriesModal } from '@/components/journal/CreateSeriesModal';
import { useWiki } from '@/contexts/WikiContext';
import {
  JOURNAL_PUBLICATION_TYPES,
  type JournalLibraryItemDTO,
  type JournalPlannerItemDTO,
  type JournalPublicationType,
} from '@shared/journalPublication';
import type { ReleaseNode, ReleaseRuleEnvelope } from '@shared/journalReleaseRule';
import {
  journalStateSummary,
  renderReleaseDiagnostic,
  translatePublicationType,
} from '@/i18n/journalRelease';
import { campaignWorkshopPath } from '@/lib/campaignPaths';
import { SURFACE_CONTEXTUAL_CLASS } from '@/lib/surfaceLayout';
import { formatRelativeUpdated } from '@/utils/formatDate';
import {
  deleteJournalPublication,
  evaluateJournalPublication,
  fetchJournalPlanner,
  fetchJournalPublication,
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

type LifecycleSection = 'upcoming' | 'drafts' | 'unfinished';

const SECTION_ORDER: LifecycleSection[] = ['upcoming', 'drafts', 'unfinished'];

const SECTION_LABEL: Record<LifecycleSection, string> = {
  upcoming: 'journal.planner.sectionUpcoming',
  drafts: 'journal.planner.sectionDrafts',
  unfinished: 'journal.planner.sectionUnfinished',
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

function lifecycleSection(item: JournalPlannerItemDTO): LifecycleSection {
  if (item.contentReadiness === 'empty') return 'unfinished';
  if (item.status === 'scheduled') return 'upcoming';
  return 'drafts';
}

function cardAccentClass(item: JournalPlannerItemDTO): string {
  if (item.perceivedState === 'blocked') {
    return 'border-red-500/40 bg-red-500/5';
  }
  if (item.contentReadiness === 'empty') {
    return 'border-amber-500/40 bg-amber-500/5';
  }
  if (item.status === 'scheduled') {
    return 'border-primary/40 bg-primary/5';
  }
  return 'border-border/50 bg-surface';
}

function displayTitle(item: Pick<JournalPlannerItemDTO, 'title' | 'issueNumber'>, emptyLabel: string): string {
  const base = item.title?.trim() || emptyLabel;
  if (item.issueNumber != null) return `Issue ${item.issueNumber} — ${base}`;
  return base;
}

function PlannerNavCard({
  item,
  selected,
  onSelect,
  onDeleteDraft,
}: {
  item: JournalPlannerItemDTO;
  selected: boolean;
  onSelect: () => void;
  onDeleteDraft: () => void;
}) {
  const { t } = useTranslation();
  const Icon = TYPE_ICON[item.type] ?? FileText;
  const metaParts: string[] = [];
  if (item.seriesName) metaParts.push(item.seriesName);
  if (item.status === 'scheduled' && item.hasRule) {
    metaParts.push(t('journal.planner.scheduledLabel'));
  }
  if (item.unmetCount > 0) {
    metaParts.push(t('journal.planner.waitingOn', { count: item.unmetCount }));
  }

  return (
    <div
      className={[
        'group relative flex w-full flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors',
        cardAccentClass(item),
        selected ? 'ring-1 ring-primary/40' : 'hover:border-primary/30',
      ].join(' ')}
    >
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-col gap-1 text-left">
        <div className="flex min-w-0 items-center gap-2 pr-6">
          <Icon className="size-4 shrink-0 text-muted" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {displayTitle(item, t('journal.states.empty'))}
          </span>
        </div>
        {metaParts.length > 0 && (
          <p className="truncate pl-6 text-xs text-muted">{metaParts.join(' · ')}</p>
        )}
      </button>
      {item.status === 'draft' && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDeleteDraft();
          }}
          className="absolute right-2 top-2 rounded p-1 text-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
          aria-label={t('journal.planner.delete')}
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}

export function JournalPlannerTab({ campaignHandle }: JournalPlannerTabProps) {
  const { t } = useTranslation();
  const { tree } = useWiki();
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState<JournalPlannerItemDTO[]>([]);
  const [series, setSeries] = useState<JournalSeriesDTO[]>([]);
  const [recentReleases, setRecentReleases] = useState<JournalLibraryItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('pub'));
  const [detail, setDetail] = useState<JournalPublicationDTO | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [draftTitle, setDraftTitle] = useState('');
  const [draftType, setDraftType] = useState<JournalPublicationType>('notice');
  const [draftBody, setDraftBody] = useState('');
  const [draftRule, setDraftRule] = useState<ReleaseNode | ReleaseRuleEnvelope | null>(null);
  const [draftSeriesId, setDraftSeriesId] = useState<string>('');
  const [draftIssueNumber, setDraftIssueNumber] = useState<string>('');
  const [draftTags, setDraftTags] = useState('');
  const [busy, setBusy] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSeriesOpen, setIsSeriesOpen] = useState(false);

  const loadPlanner = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJournalPlanner(campaignHandle);
      setItems(data.items);
      setSeries(data.series);
      setRecentReleases(data.recentReleases ?? []);
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
        setDraftSeriesId(dto.seriesId ?? '');
        setDraftIssueNumber(dto.issueNumber != null ? String(dto.issueNumber) : '');
        setDraftTags((dto.tags ?? []).join(', '));
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
    const map: Record<LifecycleSection, JournalPlannerItemDTO[]> = {
      upcoming: [],
      drafts: [],
      unfinished: [],
    };
    for (const item of items) map[lifecycleSection(item)].push(item);
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

  const openLibraryEntry = useCallback(
    (id: string) => {
      const next = new URLSearchParams();
      next.set('pub', id);
      setSearchParams(next, { replace: false });
    },
    [setSearchParams],
  );

  const handleSaveContent = useCallback(async () => {
    if (!detail) return;
    setBusy(true);
    setError(null);
    try {
      const tags = draftTags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      const issueParsed = draftIssueNumber.trim()
        ? Number.parseInt(draftIssueNumber, 10)
        : null;
      const updated = await updateJournalPublication(campaignHandle, detail.id, {
        title: draftTitle,
        type: draftType,
        contentMarkdown: draftBody,
        seriesId: draftSeriesId || null,
        issueNumber: issueParsed != null && Number.isFinite(issueParsed) ? issueParsed : null,
        tags,
      });
      setDetail(updated);
      await loadPlanner();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  }, [
    campaignHandle,
    detail,
    draftTitle,
    draftType,
    draftBody,
    draftSeriesId,
    draftIssueNumber,
    draftTags,
    loadPlanner,
  ]);

  const handleSaveRule = useCallback(async () => {
    if (!detail) return;
    setBusy(true);
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
      try {
        await releaseJournalPublication(campaignHandle, detail.id, { override });
        setSelectedId(null);
        setDetail(null);
        const next = new URLSearchParams(searchParams);
        next.delete('pub');
        setSearchParams(next, { replace: true });
        await loadPlanner();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to release');
      } finally {
        setBusy(false);
      }
    },
    [campaignHandle, detail, loadPlanner, searchParams, setSearchParams],
  );

  const handleDeleteDraft = useCallback(
    async (id: string) => {
      if (!window.confirm(t('journal.planner.deleteConfirm'))) return;
      setBusy(true);
      try {
        await deleteJournalPublication(campaignHandle, id);
        if (selectedId === id) {
          setSelectedId(null);
          setDetail(null);
          const next = new URLSearchParams(searchParams);
          next.delete('pub');
          setSearchParams(next, { replace: true });
        }
        await loadPlanner();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete');
      } finally {
        setBusy(false);
      }
    },
    [campaignHandle, loadPlanner, searchParams, selectedId, setSearchParams, t],
  );

  const contentReady: boolean = detail?.contentReadiness === 'ready';
  const outstanding = useMemo(
    () => detail?.diagnostics.filter((diag) => diag.outcome !== 'met') ?? [],
    [detail],
  );

  const metadataSummary = useMemo(() => {
    const typeLabel = translatePublicationType(draftType, t);
    const seriesName = series.find((entry) => entry.id === draftSeriesId)?.name;
    const parts: string[] = [typeLabel];
    if (seriesName) parts.push(seriesName);
    const issue = draftIssueNumber.trim();
    if (issue) parts.push(`#${issue}`);
    return parts.join(' · ');
  }, [draftType, draftSeriesId, draftIssueNumber, series, t]);

  const secondarySummary = useMemo(() => {
    if (!detail) return null;
    const source =
      detail.sourceKind === 'workshop'
        ? t('journal.planner.sourceWorkshop')
        : t('journal.planner.sourceQuickDraft');
    const checked = detail.lastEvaluatedAt
      ? formatRelativeUpdated(detail.lastEvaluatedAt)
      : t('journal.planner.neverChecked');
    return `${source} · ${checked}`;
  }, [detail, t]);

  const railInputClass =
    'rounded-md border border-border bg-background px-2.5 py-1.5 text-sm';

  const primaryButton =
    'rounded-lg bg-primary px-3 py-2 text-sm font-medium text-background hover:bg-primary/90 disabled:opacity-50';
  const ghostButton =
    'rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 disabled:opacity-50';
  const tertiaryButton =
    'rounded-lg px-3 py-1.5 text-sm text-muted hover:text-foreground disabled:opacity-50';

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
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setIsSeriesOpen(true)} className={ghostButton}>
            {t('journal.planner.newSeries')}
          </button>
          <button type="button" onClick={() => setIsCreateOpen(true)} className={primaryButton}>
            <span className="inline-flex items-center gap-1.5">
              <Plus className="size-4" aria-hidden />
              {t('journal.planner.newPublication')}
            </span>
          </button>
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
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(15rem,18rem)_minmax(0,1fr)_minmax(18rem,22rem)]">
          {/* Left — lifecycle nav */}
          <div className="flex flex-col gap-4">
            {items.length === 0 ? (
              <EmptyState icon={CalendarClock} title={t('journal.planner.emptyQueue')} />
            ) : (
              SECTION_ORDER.map((section) => {
                const group = grouped[section];
                if (group.length === 0) return null;
                return (
                  <section key={section} className="flex flex-col gap-2">
                    <h3 className="text-sm font-medium text-muted">
                      {t(SECTION_LABEL[section])}
                    </h3>
                    <ul className="flex flex-col gap-2">
                      {group.map((item) => (
                        <li key={item.id}>
                          <PlannerNavCard
                            item={item}
                            selected={item.id === selectedId}
                            onSelect={() => select(item.id)}
                            onDeleteDraft={() => void handleDeleteDraft(item.id)}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })
            )}

            {recentReleases.length > 0 && (
              <section className="mt-2 flex flex-col gap-2 border-t border-border/40 pt-4">
                <h3 className="text-sm font-medium text-muted">
                  {t('journal.planner.recentReleases')}
                </h3>
                <ul className="flex flex-col gap-1">
                  {recentReleases.map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        onClick={() => openLibraryEntry(entry.id)}
                        className="w-full truncate text-left text-xs text-muted hover:text-foreground"
                      >
                        {displayTitle(entry, t('journal.states.empty'))}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Center — editor */}
          {!selectedId ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border/60 bg-surface py-16 text-center xl:col-span-2">
              <CalendarClock className="size-8 text-muted" aria-hidden />
              <p className="max-w-sm text-sm text-muted">{t('journal.planner.workbenchEmpty')}</p>
              <button type="button" onClick={() => setIsCreateOpen(true)} className={primaryButton}>
                {t('journal.planner.newPublication')}
              </button>
            </div>
          ) : detailLoading || !detail ? (
            <div className="rounded-xl border border-border/60 bg-surface p-4 xl:col-span-2">
              <LoadingSpinner label={t('journal.planner.workbenchTitle')} />
            </div>
          ) : (
            <>
              <div className="flex min-h-[32rem] flex-col rounded-xl border border-border/60 bg-surface">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
                  <input
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-xl font-semibold text-foreground outline-none"
                    aria-label={t('journal.create.titleLabel')}
                  />
                  {detail.workshopDraftId && (
                    <Link
                      to={campaignWorkshopPath(campaignHandle, {
                        draftId: detail.workshopDraftId,
                      })}
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="size-4" aria-hidden />
                      {t('journal.library.openInWorkshop')}
                    </Link>
                  )}
                </div>
                <div className="flex-1 px-2 py-2">
                  <WikiTipTapEditor
                    content={draftBody}
                    onChange={setDraftBody}
                    wikiTree={tree}
                    minHeight="min-h-[420px]"
                    enableInstrumentation={false}
                  />
                </div>
                <div className="flex flex-wrap gap-2 border-t border-border/60 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => void handleSaveContent()}
                    disabled={busy}
                    className={primaryButton}
                  >
                    {t('journal.planner.saveContent')}
                  </button>
                </div>
              </div>

              {/* Right — release plan, metadata, context */}
              <aside
                className={`min-w-0 rounded-xl border border-border/60 px-4 py-3 ${SURFACE_CONTEXTUAL_CLASS}`}
              >
                <InspectorCollapsibleSection
                  id="planner-release"
                  label={t('journal.planner.releasePlanHeading')}
                  defaultExpanded
                >
                  <div className="space-y-4">
                    <p className="text-sm leading-relaxed text-muted">
                      {journalStateSummary(
                        detail.planState,
                        outstanding.length,
                        contentReady,
                        t,
                      )}
                    </p>
                    <div>
                      <p className="mb-2 text-sm font-medium text-muted">
                        {t('journal.planner.waitingOnHeading')}
                      </p>
                      {outstanding.length > 0 ? (
                        <ul className="flex flex-col gap-2">
                          {outstanding.map((diagnostic: ConditionDiagnostic, index) => (
                            <li key={index} className="text-sm text-muted">
                              {renderReleaseDiagnostic(diagnostic, t)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted">
                          {t('journal.planner.nothingOutstanding')}
                        </p>
                      )}
                    </div>
                    <ReleaseRuleEditor
                      rule={draftRule}
                      onChange={setDraftRule}
                      wikiTree={tree}
                      diagnostics={detail.diagnostics}
                    />
                    <div className="space-y-3 border-t border-border/40 pt-4">
                      <button
                        type="button"
                        onClick={() => void handleRelease(false)}
                        disabled={busy || !contentReady}
                        className={`w-full ${primaryButton}`}
                      >
                        {t('journal.planner.release')}
                      </button>
                      <div className="grid grid-cols-2 gap-2">
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
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleRelease(true)}
                        disabled={busy || !contentReady}
                        className={`w-full ${tertiaryButton}`}
                      >
                        {t('journal.planner.releaseOverride')}
                      </button>
                    </div>
                  </div>
                </InspectorCollapsibleSection>

                <InspectorCollapsibleSection
                  id="planner-metadata"
                  label={t('journal.planner.metadataHeading')}
                  defaultExpanded={false}
                  summary={metadataSummary}
                >
                  <div className="flex flex-col gap-4 text-sm">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-muted">{t('journal.create.typeLabel')}</span>
                      <select
                        value={draftType}
                        onChange={(e) => setDraftType(e.target.value as JournalPublicationType)}
                        className={railInputClass}
                      >
                        {JOURNAL_PUBLICATION_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {translatePublicationType(type, t)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-muted">{t('journal.planner.seriesLabel')}</span>
                      <select
                        value={draftSeriesId}
                        onChange={(e) => setDraftSeriesId(e.target.value)}
                        className={railInputClass}
                      >
                        <option value="">—</option>
                        {series.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-muted">{t('journal.library.colIssue')}</span>
                      <input
                        type="number"
                        min={1}
                        value={draftIssueNumber}
                        onChange={(e) => setDraftIssueNumber(e.target.value)}
                        className={railInputClass}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-muted">{t('journal.library.tagsLabel')}</span>
                      <input
                        value={draftTags}
                        onChange={(e) => setDraftTags(e.target.value)}
                        placeholder={t('journal.planner.tagsPlaceholder')}
                        className={railInputClass}
                      />
                    </label>
                  </div>
                </InspectorCollapsibleSection>

                <InspectorCollapsibleSection
                  id="planner-more"
                  label={t('journal.planner.moreHeading')}
                  defaultExpanded={false}
                  summary={secondarySummary}
                >
                  <dl className="flex flex-col gap-4 text-sm">
                    <div className="flex flex-col gap-1">
                      <dt className="text-muted">{t('journal.planner.sourceLabel')}</dt>
                      <dd className="text-foreground">
                        {detail.sourceKind === 'workshop'
                          ? t('journal.planner.sourceWorkshop')
                          : t('journal.planner.sourceQuickDraft')}
                      </dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className="text-muted">{t('journal.planner.lastCheckedLabel')}</dt>
                      <dd className="text-foreground">
                        {detail.lastEvaluatedAt
                          ? t('journal.planner.lastChecked', {
                              when: formatRelativeUpdated(detail.lastEvaluatedAt),
                            })
                          : t('journal.planner.neverChecked')}
                      </dd>
                    </div>
                    <div className="flex flex-col gap-1 border-t border-border/40 pt-4">
                      <dt className="text-sm font-medium text-foreground">
                        {t('journal.planner.sectionWhenReleased')}
                      </dt>
                      <dd className="text-sm leading-relaxed text-muted">
                        {t('journal.planner.whenReleasedHelp')}
                      </dd>
                    </div>
                  </dl>
                </InspectorCollapsibleSection>
              </aside>
            </>
          )}
        </div>
      )}

      <CreatePublicationModal
        open={isCreateOpen}
        campaignHandle={campaignHandle}
        variant="planner"
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
        onCreated={() => void loadPlanner()}
      />
    </div>
  );
}

export default JournalPlannerTab;
