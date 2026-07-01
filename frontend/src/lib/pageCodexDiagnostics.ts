import type {
  ContinuityIssue,
  ContinuityIssueCounts,
} from '@shared/continuityIssue';
import type { DiscoveryStateProjection } from '@shared/discoveryProjection';
import type { ContentRevelationState } from './contentPresence';
import type { UnresolvedWikilinkRow } from './wikiLoreGraph';
import type { WikiPageSubview } from './wikiPageSubviews';

export type CodexRailVariant = 'balanced' | 'diagnostics' | 'discovery';

export interface PageContinuitySummary {
  counts: ContinuityIssueCounts;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  unresolvedCount: number;
  totalIssueCount: number;
  hasCritical: boolean;
  hasWarnings: boolean;
  hasAny: boolean;
}

export function summarizePageContinuity(
  issues: ContinuityIssue[],
  unresolvedRows: UnresolvedWikilinkRow[],
  pageId: string,
): PageContinuitySummary {
  const counts: ContinuityIssueCounts = { critical: 0, warning: 0, info: 0 };

  for (const issue of issues) {
    if (issue.type === 'unresolved_wikilink') continue;
    counts[issue.severity] += 1;
  }

  const unresolvedCount = unresolvedRows.filter(
    (row) => row.sourcePageId === pageId,
  ).length;

  const hasCritical = counts.critical > 0 || unresolvedCount > 0;
  const hasWarnings = counts.warning > 0;
  const hasInfo = counts.info > 0;
  const hasAny = hasCritical || hasWarnings || hasInfo;

  return {
    counts,
    criticalCount: counts.critical,
    warningCount: counts.warning,
    infoCount: counts.info,
    unresolvedCount,
    totalIssueCount: counts.critical + counts.warning + counts.info + unresolvedCount,
    hasCritical,
    hasWarnings,
    hasAny,
  };
}

function discoveryNeedsAttention(
  discovery: DiscoveryStateProjection | null | undefined,
): boolean {
  if (!discovery) return false;
  if (!discovery.available) return true;
  return discovery.state !== 'known';
}

function hasDiscoverySignal(input: {
  isDMUser: boolean;
  discovery: DiscoveryStateProjection | null | undefined;
  presenceState?: ContentRevelationState | string | null;
}): boolean {
  if (input.isDMUser) {
    const presence = input.presenceState ?? 'REVEALED';
    if (presence !== 'REVEALED') return true;
  }
  return discoveryNeedsAttention(input.discovery);
}

export function resolveCodexRailVariant(input: {
  isDMUser: boolean;
  summary: PageContinuitySummary;
  discovery: DiscoveryStateProjection | null | undefined;
  presenceState?: ContentRevelationState | string | null;
}): CodexRailVariant {
  if (input.summary.hasAny) return 'diagnostics';
  if (
    hasDiscoverySignal({
      isDMUser: input.isDMUser,
      discovery: input.discovery,
      presenceState: input.presenceState,
    })
  ) {
    return 'discovery';
  }
  return 'balanced';
}

/** Map legacy ?openCodex / ?openInspector deep links to a subview tab. */
export function resolveSubviewFromCodexDeepLink(
  railVariant: CodexRailVariant,
  isDMUser: boolean,
): WikiPageSubview {
  if (!isDMUser) return 'relationships';
  if (railVariant === 'diagnostics') return 'continuity';
  if (railVariant === 'discovery') return 'discovery';
  return 'relationships';
}
