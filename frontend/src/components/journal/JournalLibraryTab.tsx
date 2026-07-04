import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Link2, Newspaper } from 'lucide-react';
import { CategoryHubShell } from '@/components/wiki/indexBrowse/CategoryHubShell';
import { CategoryIndexToolbar } from '@/components/wiki/indexBrowse/CategoryIndexToolbar';
import { CategoryIndexViewToggle } from '@/components/wiki/indexBrowse/CategoryIndexViewToggle';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CreatePublicationModal } from '@/components/journal/CreatePublicationModal';
import { useWiki } from '@/contexts/WikiContext';
import type { CategoryIndexViewMode } from '@/lib/categoryIndexBrowseStorage';
import { META_TABLE_HEAD_CLASS } from '@/lib/surfaceLayout';
import { CampaignCapabilities } from '@shared/campaignPolicy/capabilities';
import {
  JOURNAL_PUBLICATION_TYPES,
  type JournalLibrarySort,
  type JournalPublicationType,
} from '@shared/journalPublication';
import { translatePublicationType } from '@/i18n/journalRelease';
import {
  fetchJournalLibrary,
  fetchJournalPublication,
  type JournalLibraryItemDTO,
  type JournalPublicationDTO,
} from '@/lib/journals';

interface JournalLibraryTabProps {
  campaignHandle: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function JournalLibraryTab({ campaignHandle }: JournalLibraryTabProps) {
  const { t } = useTranslation();
  const { can } = useWiki();
  const [, setSearchParams] = useSearchParams();
  const canCreate = can(CampaignCapabilities.PAGE_CREATE);
  const canPlan = can(CampaignCapabilities.JOURNAL_PLANNER_ACCESS);

  const [items, setItems] = useState<JournalLibraryItemDTO[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<CategoryIndexViewMode>('table');

  const [typeFilter, setTypeFilter] = useState<JournalPublicationType | ''>('');
  const [seriesFilter, setSeriesFilter] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [sort, setSort] = useState<JournalLibrarySort>('newest');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<JournalPublicationDTO | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);

  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const page = await fetchJournalLibrary(campaignHandle, {
        type: typeFilter || undefined,
        seriesId: seriesFilter || undefined,
        linkedPageId: originFilter || undefined,
        sort,
      });
      if (requestRef.current !== requestId) return;
      setItems(page.items);
      setNextCursor(page.nextCursor);
    } catch (err) {
      if (requestRef.current !== requestId) return;
      setError(err instanceof Error ? err.message : 'Failed to load publications');
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
  }, [campaignHandle, typeFilter, seriesFilter, originFilter, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const page = await fetchJournalLibrary(campaignHandle, {
        type: typeFilter || undefined,
        seriesId: seriesFilter || undefined,
        linkedPageId: originFilter || undefined,
        sort,
        cursor: nextCursor,
      });
      setItems((prev) => [...prev, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  }, [campaignHandle, nextCursor, typeFilter, seriesFilter, originFilter, sort]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    let active = true;
    setSelectedLoading(true);
    fetchJournalPublication(campaignHandle, selectedId)
      .then((dto) => {
        if (active) setSelected(dto);
      })
      .catch(() => {
        if (active) setSelected(null);
      })
      .finally(() => {
        if (active) setSelectedLoading(false);
      });
    return () => {
      active = false;
    };
  }, [campaignHandle, selectedId]);

  const seriesOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      if (item.seriesId && item.seriesName) map.set(item.seriesId, item.seriesName);
    }
    return [...map.entries()];
  }, [items]);

  const originOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      if (item.linkedPage) map.set(item.linkedPage.pageId, item.linkedPage.title);
    }
    return [...map.entries()];
  }, [items]);

  const handleCreated = useCallback(
    (created: JournalPublicationDTO) => {
      if (canPlan) {
        setSearchParams({ tab: 'planner', pub: created.id }, { replace: false });
      } else {
        setNotice(t('journal.library.createdNotice'));
      }
    },
    [canPlan, setSearchParams, t],
  );

  const selectClass =
    'rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground';

  const refineControl = (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label={t('journal.library.filterType')}
        className={selectClass}
        value={typeFilter}
        onChange={(event) => setTypeFilter(event.target.value as JournalPublicationType | '')}
      >
        <option value="">{`${t('journal.library.filterType')}: ${t('journal.library.filterAll')}`}</option>
        {JOURNAL_PUBLICATION_TYPES.map((type) => (
          <option key={type} value={type}>
            {translatePublicationType(type, t)}
          </option>
        ))}
      </select>
      {seriesOptions.length > 0 && (
        <select
          aria-label={t('journal.library.filterSeries')}
          className={selectClass}
          value={seriesFilter}
          onChange={(event) => setSeriesFilter(event.target.value)}
        >
          <option value="">{`${t('journal.library.filterSeries')}: ${t('journal.library.filterAll')}`}</option>
          {seriesOptions.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      )}
      {originOptions.length > 0 && (
        <select
          aria-label={t('journal.library.filterOrigin')}
          className={selectClass}
          value={originFilter}
          onChange={(event) => setOriginFilter(event.target.value)}
        >
          <option value="">{`${t('journal.library.filterOrigin')}: ${t('journal.library.filterAll')}`}</option>
          {originOptions.map(([id, title]) => (
            <option key={id} value={id}>
              {title}
            </option>
          ))}
        </select>
      )}
    </div>
  );

  const sortControl = (
    <select
      aria-label={t('journal.library.sortLabel')}
      className={selectClass}
      value={sort}
      onChange={(event) => setSort(event.target.value as JournalLibrarySort)}
    >
      <option value="newest">{t('journal.library.sortNewest')}</option>
      <option value="oldest">{t('journal.library.sortOldest')}</option>
      <option value="type">{t('journal.library.sortType')}</option>
    </select>
  );

  const contextual = selectedId ? (
    <aside className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      {selectedLoading || !selected ? (
        <LoadingSpinner label={t('journal.library.title')} />
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold text-foreground">{selected.title}</h3>
            <button
              type="button"
              className="text-xs text-muted hover:text-foreground"
              onClick={() => setSelectedId(null)}
            >
              ✕
            </button>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted">
            <span className="rounded-full bg-elevated px-2 py-0.5">
              {translatePublicationType(selected.type, t)}
            </span>
            {selected.issueNumber != null && (
              <span>{t('journal.library.issueLabel', { n: selected.issueNumber })}</span>
            )}
            {selected.releasedAt && (
              <span>{t('journal.library.releasedOn', { when: formatDate(selected.releasedAt) })}</span>
            )}
          </div>
          {selected.linkedPage && (
            <div className="flex items-center gap-1 text-xs text-muted">
              <Link2 className="size-3.5" aria-hidden />
              {selected.linkedPage.title}
            </div>
          )}
          {selected.contentMarkdown ? (
            <div className="whitespace-pre-wrap text-sm text-foreground/90">
              {selected.contentMarkdown}
            </div>
          ) : (
            <p className="text-sm text-muted">{t('journal.states.empty')}</p>
          )}
        </>
      )}
    </aside>
  ) : undefined;

  return (
    <>
      <CategoryHubShell
      composition="hub"
      title={
        <span className="inline-flex items-center gap-2">
          <BookOpen className="size-6 text-primary" aria-hidden />
          {t('journal.library.title')}
        </span>
      }
      subtitle={t('journal.library.subtitle')}
      actions={
        <CategoryIndexToolbar
          createLabel={t('journal.library.newPublication')}
          onCreate={() => setIsCreateOpen(true)}
          createAction={canCreate ? undefined : null}
          resultCountLabel={loading ? null : String(items.length)}
          refineControl={refineControl}
          sortControl={sortControl}
          viewControl={
            <CategoryIndexViewToggle
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              showHierarchy={false}
            />
          }
        />
      }
      contextual={contextual}
    >
      {notice && (
        <div className="mb-3 rounded-lg border border-border bg-elevated/40 px-3 py-2 text-sm text-muted">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}
      {loading ? (
        <LoadingSpinner label={t('journal.library.title')} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title={t('journal.library.empty')}
          description={t('journal.library.emptyHint')}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {viewMode === 'table' ? (
            <div className="rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b border-border/60 text-left ${META_TABLE_HEAD_CLASS}`}>
                    <th className="px-3 py-2.5">{t('journal.library.colTitle')}</th>
                    <th className="hidden px-3 py-2.5 md:table-cell">
                      {t('journal.library.colType')}
                    </th>
                    <th className="hidden px-3 py-2.5 lg:table-cell">
                      {t('journal.library.colSeries')}
                    </th>
                    <th className="hidden px-3 py-2.5 lg:table-cell">
                      {t('journal.library.colOrigin')}
                    </th>
                    <th className="hidden px-3 py-2.5 xl:table-cell">
                      {t('journal.library.colIssue')}
                    </th>
                    <th className="hidden px-3 py-2.5 text-right md:table-cell">
                      {t('journal.library.colReleased')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedId(item.id);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={item.title || t('journal.states.empty')}
                      className={[
                        'cursor-pointer border-b border-border/60 outline-none transition-colors last:border-b-0',
                        'focus-visible:bg-elevated/50',
                        item.id === selectedId ? 'bg-elevated/60' : 'hover:bg-elevated/40',
                      ].join(' ')}
                    >
                      <td className="px-3 py-2.5">
                        <div className="min-w-0">
                          <span className="block truncate font-medium text-foreground">
                            {item.title || t('journal.states.empty')}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted md:hidden">
                            {translatePublicationType(item.type, t)}
                            {item.releasedAt ? ` · ${formatDate(item.releasedAt)}` : ''}
                          </span>
                        </div>
                      </td>
                      <td className="hidden px-3 py-2.5 text-muted md:table-cell">
                        {translatePublicationType(item.type, t)}
                      </td>
                      <td className="hidden max-w-[12rem] px-3 py-2.5 lg:table-cell">
                        <span className="block truncate text-muted">{item.seriesName ?? '—'}</span>
                      </td>
                      <td className="hidden max-w-[12rem] px-3 py-2.5 lg:table-cell">
                        {item.linkedPage ? (
                          <span className="flex min-w-0 items-center gap-1 text-muted">
                            <Link2 className="size-3.5 shrink-0" aria-hidden />
                            <span className="truncate">{item.linkedPage.title}</span>
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-2.5 text-muted xl:table-cell">
                        {item.issueNumber != null
                          ? t('journal.library.issueLabel', { n: item.issueNumber })
                          : '—'}
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-2.5 text-right text-muted md:table-cell">
                        {formatDate(item.releasedAt) || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={[
                    'flex flex-col gap-2 rounded-xl border bg-surface p-4 text-left transition-colors',
                    item.id === selectedId
                      ? 'border-primary'
                      : 'border-border/60 hover:border-primary/40',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-elevated px-2 py-0.5 text-xs text-muted">
                      {translatePublicationType(item.type, t)}
                    </span>
                    {item.seriesName && (
                      <span className="truncate text-xs text-muted">{item.seriesName}</span>
                    )}
                  </div>
                  <h3 className="line-clamp-2 text-sm font-semibold text-foreground">
                    {item.title || t('journal.states.empty')}
                  </h3>
                  <div className="mt-auto flex items-center justify-between text-xs text-muted">
                    {item.issueNumber != null ? (
                      <span>{t('journal.library.issueLabel', { n: item.issueNumber })}</span>
                    ) : (
                      <span />
                    )}
                    <span>{formatDate(item.releasedAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
          {nextCursor && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 disabled:opacity-50"
              >
                {t('journal.library.loadMore')}
              </button>
            </div>
          )}
        </div>
      )}
      </CategoryHubShell>
      <CreatePublicationModal
        open={isCreateOpen}
        campaignHandle={campaignHandle}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />
    </>
  );
}

export default JournalLibraryTab;
