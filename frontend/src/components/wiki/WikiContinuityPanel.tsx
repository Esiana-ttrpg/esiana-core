import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  ContinuityIssue,
  ContinuityIssueSeverity,
} from '@shared/continuityIssue';
import {
  fetchPageContinuity,
  fetchUnresolvedWikilinks,
  ignoreUnresolvedWikilink,
  mergeUnresolvedWikilinks,
  type UnresolvedWikilinkRow,
} from '@/lib/wikiLoreGraph';
import { campaignWikiMaintenancePath } from '@/lib/campaignPaths';
import {
  OPERATOR_COMPACT_LIST_CLASS,
  READING_SURFACE_LIST_CLASS,
} from '@/lib/readingSurfaceLayout';
import { ContinuityIssueGroups } from '@/components/wiki/ContinuityIssueGroups';

interface WikiContinuityPanelProps {
  campaignHandle: string;
  currentPageId: string;
  pageTitle: string;
  compact?: boolean;
  /** When provided, panel uses shared diagnostics data instead of fetching. */
  sharedIssues?: ContinuityIssue[];
  sharedUnresolved?: UnresolvedWikilinkRow[];
  sharedLoading?: boolean;
  onSharedReload?: () => void;
}

const SEVERITY_ORDER: ContinuityIssueSeverity[] = [
  'critical',
  'warning',
  'info',
];

const SEVERITY_LABELS: Record<ContinuityIssueSeverity, string> = {
  critical: 'Critical',
  warning: 'Warnings',
  info: 'Info',
};

export function WikiContinuityPanel({
  campaignHandle,
  currentPageId,
  pageTitle,
  compact = false,
  sharedIssues,
  sharedUnresolved,
  sharedLoading,
  onSharedReload,
}: WikiContinuityPanelProps) {
  const usesSharedData = sharedIssues !== undefined && sharedUnresolved !== undefined;

  const [issues, setIssues] = useState<ContinuityIssue[]>([]);
  const [unresolved, setUnresolved] = useState<UnresolvedWikilinkRow[]>([]);
  const [loading, setLoading] = useState(!usesSharedData);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mergeTargetId, setMergeTargetId] = useState('');

  const reload = () => {
    if (usesSharedData) {
      onSharedReload?.();
      return;
    }
    setLoading(true);
    Promise.all([
      fetchPageContinuity(campaignHandle, currentPageId),
      fetchUnresolvedWikilinks(campaignHandle, {
        sourcePageId: currentPageId,
      }),
    ])
      .then(([payload, u]) => {
        setIssues(payload.issues);
        setUnresolved(u);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (usesSharedData) return;
    reload();
  }, [campaignHandle, currentPageId, usesSharedData]);

  const resolvedIssues = usesSharedData ? sharedIssues : issues;
  const resolvedUnresolved = usesSharedData ? sharedUnresolved : unresolved;
  const resolvedLoading = usesSharedData ? (sharedLoading ?? false) : loading;

  const issuesBySeverity = useMemo(() => {
    const map = new Map<ContinuityIssueSeverity, ContinuityIssue[]>();
    for (const severity of SEVERITY_ORDER) {
      map.set(severity, []);
    }
    for (const issue of resolvedIssues) {
      if (issue.type === 'unresolved_wikilink') continue;
      map.get(issue.severity)?.push(issue);
    }
    return map;
  }, [resolvedIssues]);

  const actionableUnresolved = resolvedUnresolved.filter(
    (row) => row.sourcePageId === currentPageId,
  );

  if (resolvedLoading) {
    return (
      <div className="p-4 text-sm text-muted">Loading codex health…</div>
    );
  }

  const hasCritical =
    (issuesBySeverity.get('critical')?.length ?? 0) > 0 ||
    actionableUnresolved.length > 0;
  const hasWarnings = (issuesBySeverity.get('warning')?.length ?? 0) > 0;
  const hasInfo = (issuesBySeverity.get('info')?.length ?? 0) > 0;
  const hasAny = hasCritical || hasWarnings || hasInfo;

  return (
    <div className="space-y-6 p-4 text-sm">
      <header>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Codex health
        </h3>
        <p className="mt-1 font-medium text-foreground">{pageTitle}</p>
        <p className="mt-0.5 text-xs text-muted">
          Continuity issues for this page.
        </p>
      </header>

      {!hasAny ? (
        <p className="text-muted">No continuity issues on this page.</p>
      ) : null}

      {(issuesBySeverity.get('critical')?.length ?? 0) > 0 ? (
        <section className="space-y-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            {SEVERITY_LABELS.critical}
          </h4>
          <ContinuityIssueGroups
            issues={issuesBySeverity.get('critical') ?? []}
            showBlockJump
            campaignHandle={campaignHandle}
          />
        </section>
      ) : null}

      {actionableUnresolved.length > 0 ? (
        <section className="space-y-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Unresolved references
          </h4>
          <ul
            className={
              compact
                ? `${OPERATOR_COMPACT_LIST_CLASS} space-y-2`
                : `${READING_SURFACE_LIST_CLASS} space-y-2`
            }
          >
            {actionableUnresolved.map((row) => (
              <li
                key={row.id}
                className="flex items-start gap-2 rounded border border-border/60 px-2 py-1.5"
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
                </div>
                <button
                  type="button"
                  className="shrink-0 text-xs text-muted hover:text-foreground"
                  onClick={() =>
                    ignoreUnresolvedWikilink(campaignHandle, row.id).then(reload)
                  }
                >
                  Ignore
                </button>
              </li>
            ))}
          </ul>
          {selected.size > 0 ? (
            <div className="mt-3 space-y-2">
              <input
                type="text"
                placeholder="Target page ID to link"
                className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                value={mergeTargetId}
                onChange={(e) => setMergeTargetId(e.target.value)}
              />
              <button
                type="button"
                className="rounded bg-primary/20 px-3 py-1 text-xs text-primary"
                onClick={() =>
                  mergeUnresolvedWikilinks(
                    campaignHandle,
                    [...selected],
                    mergeTargetId.trim(),
                  ).then(() => {
                    setSelected(new Set());
                    setMergeTargetId('');
                    reload();
                  })
                }
              >
                Bulk-assign {selected.size} to page
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {(issuesBySeverity.get('warning')?.length ?? 0) > 0 ? (
        <section className="space-y-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            {SEVERITY_LABELS.warning}
          </h4>
          <ContinuityIssueGroups
            issues={issuesBySeverity.get('warning') ?? []}
            campaignHandle={campaignHandle}
          />
        </section>
      ) : null}

      {(issuesBySeverity.get('info')?.length ?? 0) > 0 ? (
        <section className="space-y-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            {SEVERITY_LABELS.info}
          </h4>
          <ContinuityIssueGroups
            issues={issuesBySeverity.get('info') ?? []}
            campaignHandle={campaignHandle}
          />
        </section>
      ) : null}

      <section className="space-y-1 border-t border-border/60 pt-4">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          Suggestions
        </h4>
        <p className="text-xs text-muted">None yet.</p>
      </section>

      <p className="text-xs">
        <Link
          to={campaignWikiMaintenancePath(campaignHandle)}
          className="text-primary hover:underline"
        >
          Open world maintenance →
        </Link>
      </p>
    </div>
  );
}
