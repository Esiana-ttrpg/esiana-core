import { Link } from 'react-router-dom';
import type { ContinuityIssue } from '@shared/continuityIssue';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import {
  groupIssuesByCategory,
  isNarrativeCycleIssue,
  isNarrativeStructureIssue,
  NARRATIVE_CATEGORY_ORDER,
  NARRATIVE_CONTINUITY_CATEGORY_LABELS,
  resolveContinuityIssueCategory,
} from '@/lib/narrativeContinuity';

function CycleParticipantLinks({
  issue,
  campaignHandle,
}: {
  issue: ContinuityIssue;
  campaignHandle?: string;
}) {
  const { flatPages } = useWiki();
  const pageIds = issue.relatedPageIds ?? (issue.pageId ? [issue.pageId] : []);
  if (pageIds.length === 0) return null;

  if (!campaignHandle) {
    return (
      <p className="mt-1 text-xs text-muted">
        {pageIds.join(' → ')}
      </p>
    );
  }

  return (
    <p className="mt-1 flex flex-wrap items-center gap-1 text-xs">
      {pageIds.map((pageId, index) => (
        <span key={pageId} className="inline-flex items-center gap-1">
          {index > 0 ? <span className="text-muted">→</span> : null}
          <Link
            to={campaignWikiPath(campaignHandle, pageId, flatPages)}
            className="text-primary hover:underline"
          >
            {pageId}
          </Link>
        </span>
      ))}
      {pageIds.length > 1 ? (
        <span className="text-muted">→ {pageIds[0]}</span>
      ) : null}
    </p>
  );
}

function ContinuityIssueRow({
  issue,
  showBlockJump = false,
  campaignHandle,
}: {
  issue: ContinuityIssue;
  showBlockJump?: boolean;
  campaignHandle?: string;
}) {
  return (
    <li className="rounded border border-border/60 px-2 py-1.5 text-foreground">
      <span>{issue.message}</span>
      {isNarrativeCycleIssue(issue) ? (
        <CycleParticipantLinks issue={issue} campaignHandle={campaignHandle} />
      ) : null}
      {showBlockJump && issue.blockId ? (
        <button
          type="button"
          className="mt-1 block text-xs text-primary hover:underline"
          onClick={() => {
            document
              .querySelector(`[data-codex-block-id="${issue.blockId}"]`)
              ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }}
        >
          Jump to block →
        </button>
      ) : null}
    </li>
  );
}

function IssueList({
  issues,
  showBlockJump = false,
  campaignHandle,
}: {
  issues: ContinuityIssue[];
  showBlockJump?: boolean;
  campaignHandle?: string;
}) {
  return (
    <ul className="space-y-1.5">
      {issues.map((issue) => (
        <ContinuityIssueRow
          key={issue.fingerprint}
          issue={issue}
          showBlockJump={showBlockJump}
          campaignHandle={campaignHandle}
        />
      ))}
    </ul>
  );
}

export function ContinuityIssueGroups({
  issues,
  showBlockJump = false,
  campaignHandle,
}: {
  issues: ContinuityIssue[];
  showBlockJump?: boolean;
  campaignHandle?: string;
}) {
  const narrativeIssues = issues.filter(isNarrativeStructureIssue);
  const otherIssues = issues.filter((issue) => !isNarrativeStructureIssue(issue));

  if (narrativeIssues.length === 0) {
    return (
      <IssueList
        issues={issues}
        showBlockJump={showBlockJump}
        campaignHandle={campaignHandle}
      />
    );
  }

  const byCategory = groupIssuesByCategory(narrativeIssues);

  return (
    <div className="space-y-3">
      {otherIssues.length > 0 ? (
        <IssueList
          issues={otherIssues}
          showBlockJump={showBlockJump}
          campaignHandle={campaignHandle}
        />
      ) : null}
      {NARRATIVE_CATEGORY_ORDER.map((category) => {
        const categoryIssues = byCategory.get(category);
        if (!categoryIssues?.length) return null;
        return (
          <div key={category} className="space-y-1.5">
            <h5 className="text-[10px] font-medium uppercase tracking-wider text-muted">
              {NARRATIVE_CONTINUITY_CATEGORY_LABELS[category]}
            </h5>
            <IssueList
              issues={categoryIssues}
              campaignHandle={campaignHandle}
            />
          </div>
        );
      })}
      {narrativeIssues
        .filter((issue) => !resolveContinuityIssueCategory(issue))
        .length > 0 ? (
        <IssueList
          issues={narrativeIssues.filter(
            (issue) => !resolveContinuityIssueCategory(issue),
          )}
          campaignHandle={campaignHandle}
        />
      ) : null}
    </div>
  );
}
