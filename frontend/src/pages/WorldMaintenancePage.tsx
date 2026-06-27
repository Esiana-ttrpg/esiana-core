import { META_SECTION_LABEL_CLASS, TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { ContinuityIssue } from '@shared/continuityIssue';
import type { NarrativeDensityMetrics } from '@shared/narrativeDensityMetrics';
import {
  fetchGlobalContinuity,
  fetchUnresolvedWikilinks,
  ignoreUnresolvedWikilink,
  mergeUnresolvedWikilinks,
  type UnresolvedWikilinkRow,
} from '@/lib/wikiLoreGraph';
import {
  campaignWikiPath,
  readCampaignHandle,
} from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import { CampaignMemberRoles } from '@/types/domain';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MascotErrorPanel } from '@/components/errors/MascotErrorPanel';
import {
  groupOrphanIssuesByIsolation,
  isNarrativeCycleIssue,
  isNarrativeOrphanIssue,
  isNarrativeStructureIssue,
  NARRATIVE_CATEGORY_ORDER,
  NARRATIVE_CLUE_TYPES,
  NARRATIVE_CONTINUITY_CATEGORY_LABELS,
  NARRATIVE_FORESHADOWING_TYPES,
  NARRATIVE_ISOLATION_LABELS,
  NARRATIVE_ISOLATION_ORDER,
  resolveContinuityIssueCategory,
} from '@/lib/narrativeContinuity';

export function WorldMaintenancePage() {
  const params = useParams<{ campaignHandle?: string }>();
  const campaignHandle = readCampaignHandle(params);
  const { campaign, flatPages, loading: campaignLoading } = useWiki();
  const isDMUser =
    campaign?.role === CampaignMemberRoles.GAMEMASTER ||
    campaign?.role === CampaignMemberRoles.WRITER;
  const [issues, setIssues] = useState<ContinuityIssue[]>([]);
  const [openUnresolvedCount, setOpenUnresolvedCount] = useState(0);
  const [narrativeDensity, setNarrativeDensity] = useState<
    NarrativeDensityMetrics | undefined
  >();
  const [densityExpanded, setDensityExpanded] = useState(false);
  const [unresolved, setUnresolved] = useState<UnresolvedWikilinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mergeTargetId, setMergeTargetId] = useState('');

  const reload = () => {
    setLoading(true);
    Promise.all([
      fetchGlobalContinuity(campaignHandle),
      fetchUnresolvedWikilinks(campaignHandle, { scope: 'campaign' }),
    ])
      .then(([global, u]) => {
        setIssues(global.issues);
        setOpenUnresolvedCount(global.openUnresolvedCount);
        setNarrativeDensity(global.narrativeDensity);
        setUnresolved(u);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (campaignHandle) reload();
  }, [campaignHandle]);

  const unlinkedIssues = useMemo(
    () => issues.filter((i) => i.type === 'unlinked_entity'),
    [issues],
  );
  const aliasIssues = useMemo(
    () => issues.filter((i) => i.type === 'alias_collision'),
    [issues],
  );
  const orphanIssues = useMemo(
    () => issues.filter(isNarrativeOrphanIssue),
    [issues],
  );
  const orphanByIsolation = useMemo(
    () => groupOrphanIssuesByIsolation(orphanIssues),
    [orphanIssues],
  );
  const clueIssues = useMemo(
    () => issues.filter((i) => NARRATIVE_CLUE_TYPES.has(i.type)),
    [issues],
  );
  const foreshadowingIssues = useMemo(
    () => issues.filter((i) => NARRATIVE_FORESHADOWING_TYPES.has(i.type)),
    [issues],
  );
  const coreNarrativeIssues = useMemo(
    () =>
      issues.filter(
        (i) =>
          isNarrativeStructureIssue(i) &&
          !isNarrativeOrphanIssue(i) &&
          !NARRATIVE_CLUE_TYPES.has(i.type) &&
          !NARRATIVE_FORESHADOWING_TYPES.has(i.type) &&
          !i.type.startsWith('narrative_density_'),
      ),
    [issues],
  );
  const narrativeByCategory = useMemo(() => {
    const map = new Map<
      (typeof NARRATIVE_CATEGORY_ORDER)[number],
      ContinuityIssue[]
    >();
    for (const issue of coreNarrativeIssues) {
      const category = resolveContinuityIssueCategory(issue);
      if (!category) continue;
      const list = map.get(category) ?? [];
      list.push(issue);
      map.set(category, list);
    }
    return map;
  }, [coreNarrativeIssues]);
  if (campaignLoading) {
    return <LoadingSpinner label="Loading campaign…" />;
  }

  if (!isDMUser) {
    return (
      <MascotErrorPanel
        code={403}
        title="DM only"
        description="World maintenance is available to DMs and Co-DMs."
      />
    );
  }

  if (loading) {
    return <LoadingSpinner label="Loading world maintenance…" />;
  }

  return (
    <article className="mx-auto max-w-2xl space-y-8 p-6">
      <header>
        <h1 className={TYPE_DISPLAY_CLASS}>
          World maintenance
        </h1>
        <p className="mt-1 text-sm text-muted">
          {campaign?.name ?? campaignHandle} — campaign-wide continuity and
          unresolved references.
        </p>
        {openUnresolvedCount > 0 ? (
          <p className="mt-2 text-sm text-foreground">
            {openUnresolvedCount} open unresolved reference
            {openUnresolvedCount === 1 ? '' : 's'} across the codex.
          </p>
        ) : null}
        {narrativeDensity ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded border border-border/60 px-3 py-2 text-xs">
              <p className="font-medium text-foreground">Authored complexity</p>
              <p className="mt-1 text-muted">
                Max branch depth{' '}
                {Math.max(
                  0,
                  ...narrativeDensity.authored.branchingDepth.map((b) => b.maxDepth),
                )}
                {' · '}
                {narrativeDensity.authored.bottleneckCount} bottleneck
                {narrativeDensity.authored.bottleneckCount === 1 ? '' : 's'}
                {' · '}
                {narrativeDensity.authored.clueDensity.spofClueCount} clue SPOF
              </p>
            </div>
            <div className="rounded border border-border/60 px-3 py-2 text-xs">
              <p className="font-medium text-foreground">World state</p>
              <p className="mt-1 text-muted">
                {narrativeDensity.worldState.campaignTotals.openAuthoredThreads}{' '}
                open threads ·{' '}
                {narrativeDensity.worldState.campaignTotals.activeQuests} active
                quests · {narrativeDensity.worldState.activeFactionCount} factions
              </p>
            </div>
          </div>
        ) : null}
        {narrativeDensity ? (
          <button
            type="button"
            className="mt-2 text-xs text-primary hover:underline"
            onClick={() => setDensityExpanded((v) => !v)}
          >
            {densityExpanded ? 'Hide density details' : 'Show density details'}
          </button>
        ) : null}
        {densityExpanded && narrativeDensity ? (
          <div className="mt-2 space-y-2 rounded border border-border/60 p-3 text-xs text-muted">
            <p>
              Cluster heuristic (not canonical acts):{' '}
              {narrativeDensity.narrativeClusterComplexity.length} cluster
              {narrativeDensity.narrativeClusterComplexity.length === 1 ? '' : 's'}
            </p>
            <ul className="space-y-1">
              {narrativeDensity.narrativeClusterComplexity.slice(0, 8).map((c) => (
                <li key={c.clusterId}>
                  {c.label}: {c.questCount} quests, depth {c.maxBranchDepth}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </header>

      {unlinkedIssues.length > 0 ? (
        <section className="space-y-2">
          <h2 className={META_SECTION_LABEL_CLASS}>
            Unlinked lore
          </h2>
          <p className="text-xs text-muted">
            Narrative pages not referenced elsewhere in the codex.
          </p>
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {unlinkedIssues.map((issue) => (
              <li key={issue.fingerprint}>
                {issue.pageId ? (
                  <Link
                    to={campaignWikiPath(campaignHandle, issue.pageId, flatPages)}
                    className="text-primary hover:underline"
                  >
                    {issue.message}
                  </Link>
                ) : (
                  <span className="text-foreground">{issue.message}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {aliasIssues.length > 0 ? (
        <section className="space-y-2">
          <h2 className={META_SECTION_LABEL_CLASS}>
            Alias conflicts
          </h2>
          <ul className="space-y-1.5">
            {aliasIssues.map((issue) => (
              <li
                key={issue.fingerprint}
                className="text-sm text-foreground"
              >
                {issue.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {orphanIssues.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h2 className={META_SECTION_LABEL_CLASS}>
              Orphaned content
            </h2>
            <p className="mt-1 text-xs text-muted">
              Structural isolation, narrative disconnection, and temporal
              inactivity — distinct from unlinked wikilinks and creative drift.
            </p>
          </div>
          {NARRATIVE_ISOLATION_ORDER.map((isolation) => {
            const list = orphanByIsolation.get(isolation);
            if (!list?.length) return null;
            return (
              <div key={isolation} className="space-y-2">
                <h3 className={META_SECTION_LABEL_CLASS}>
                  {NARRATIVE_ISOLATION_LABELS[isolation]}
                </h3>
                <ul className="max-h-48 space-y-1 overflow-y-auto">
                  {list.map((issue) => (
                    <li key={issue.fingerprint} className="text-sm text-foreground">
                      {issue.pageId ? (
                        <Link
                          to={campaignWikiPath(campaignHandle, issue.pageId, flatPages)}
                          className="text-primary hover:underline"
                        >
                          {issue.message}
                        </Link>
                      ) : (
                        issue.message
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      ) : null}

      {clueIssues.length > 0 ? (
        <section className="space-y-2">
          <h2 className={META_SECTION_LABEL_CLASS}>
            Clue paths
          </h2>
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {clueIssues.map((issue) => (
              <li key={issue.fingerprint} className="text-sm text-foreground">
                {issue.pageId ? (
                  <Link
                    to={campaignWikiPath(campaignHandle, issue.pageId, flatPages)}
                    className="text-primary hover:underline"
                  >
                    {issue.message}
                  </Link>
                ) : (
                  issue.message
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {foreshadowingIssues.length > 0 ? (
        <section className="space-y-2">
          <h2 className={META_SECTION_LABEL_CLASS}>
            Foreshadowing progression
          </h2>
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {foreshadowingIssues.map((issue) => (
              <li key={issue.fingerprint} className="text-sm text-foreground">
                {issue.pageId ? (
                  <Link
                    to={campaignWikiPath(campaignHandle, issue.pageId, flatPages)}
                    className="text-primary hover:underline"
                  >
                    {issue.message}
                  </Link>
                ) : (
                  issue.message
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {coreNarrativeIssues.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h2 className={META_SECTION_LABEL_CLASS}>
              Narrative structure
            </h2>
            <p className="mt-1 text-xs text-muted">
              Dead ends, unreachable hidden branches, circular dependencies,
              broken chains, and unresolved thread payoffs.
            </p>
          </div>
          {NARRATIVE_CATEGORY_ORDER.map((category) => {
            const categoryIssues = narrativeByCategory.get(category);
            if (!categoryIssues?.length) return null;
            return (
              <div key={category} className="space-y-2">
                <h3 className={META_SECTION_LABEL_CLASS}>
                  {NARRATIVE_CONTINUITY_CATEGORY_LABELS[category]}
                </h3>
                <ul className="max-h-64 space-y-1 overflow-y-auto">
                  {categoryIssues.map((issue) => (
                    <li key={issue.fingerprint} className="text-sm text-foreground">
                      {issue.pageId && !isNarrativeCycleIssue(issue) ? (
                        <Link
                          to={campaignWikiPath(campaignHandle, issue.pageId, flatPages)}
                          className="text-primary hover:underline"
                        >
                          {issue.message}
                        </Link>
                      ) : (
                        <>
                          <span>{issue.message}</span>
                          {isNarrativeCycleIssue(issue) &&
                          issue.relatedPageIds?.length ? (
                            <p className="mt-1 flex flex-wrap items-center gap-1 text-xs">
                              {issue.relatedPageIds.map((pageId, index) => (
                                <span
                                  key={pageId}
                                  className="inline-flex items-center gap-1"
                                >
                                  {index > 0 ? (
                                    <span className="text-muted">→</span>
                                  ) : null}
                                  <Link
                                    to={campaignWikiPath(campaignHandle, pageId, flatPages)}
                                    className="text-primary hover:underline"
                                  >
                                    {pageId}
                                  </Link>
                                </span>
                              ))}
                              {issue.relatedPageIds.length > 1 ? (
                                <span className="text-muted">
                                  → {issue.relatedPageIds[0]}
                                </span>
                              ) : null}
                            </p>
                          ) : issue.pageId ? (
                            <Link
                              to={campaignWikiPath(campaignHandle, issue.pageId, flatPages)}
                              className="mt-1 block text-xs text-primary hover:underline"
                            >
                              Open subject →
                            </Link>
                          ) : null}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className={META_SECTION_LABEL_CLASS}>
          Unresolved references
        </h2>
        {unresolved.length === 0 ? (
          <p className="text-sm text-muted">No open unresolved references.</p>
        ) : (
          <ul className="max-h-96 space-y-2 overflow-y-auto">
            {unresolved.map((row) => (
              <li
                key={row.id}
                className="flex items-start gap-2 rounded border border-border/60 px-2 py-1.5 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selected.has(row.normalizedText)}
                  onChange={(e) => {
                    const next = new Set(selected);
                    if (e.target.checked) next.add(row.normalizedText);
                    else next.delete(row.normalizedText);
                    setSelected(next);
                  }}
                />
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-foreground">
                    {row.rawText.startsWith('[[')
                      ? row.rawText
                      : `[[${row.rawText}]]`}
                  </span>
                  <span className="ml-1 text-xs text-muted">
                    ×{row.occurrenceCount}
                  </span>
                  <div className="truncate text-xs text-muted">
                    <Link
                      to={campaignWikiPath(campaignHandle, row.sourcePageId, flatPages)}
                      className="hover:text-foreground"
                    >
                      {row.sourcePageTitle}
                    </Link>
                  </div>
                </div>
                {isDMUser ? (
                  <button
                    type="button"
                    className="shrink-0 text-xs text-muted hover:text-foreground"
                    onClick={() =>
                      ignoreUnresolvedWikilink(campaignHandle, row.id)
                        .then(reload)
                        .catch((err) =>
                          console.error('Failed to ignore wikilink', err),
                        )
                    }
                  >
                    Ignore
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {isDMUser && selected.size > 0 ? (
          <div className="mt-3 space-y-2">
            <input
              type="text"
              placeholder="Target page ID to link"
              className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
              value={mergeTargetId}
              onChange={(e) => setMergeTargetId(e.target.value)}
            />
            <button
              type="button"
              className="rounded bg-primary/20 px-3 py-1.5 text-sm text-primary"
              onClick={() =>
                mergeUnresolvedWikilinks(
                  campaignHandle,
                  [...selected],
                  mergeTargetId.trim(),
                )
                  .then(() => {
                    setSelected(new Set());
                    setMergeTargetId('');
                    reload();
                  })
                  .catch((err) => console.error('Failed to merge wikilinks', err))
              }
            >
              Bulk-assign {selected.size} to page
            </button>
          </div>
        ) : null}
      </section>
    </article>
  );
}
