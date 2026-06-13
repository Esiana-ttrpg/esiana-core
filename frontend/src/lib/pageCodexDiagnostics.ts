import type {
  ContinuityIssue,
  ContinuityIssueCounts,
} from '@shared/continuityIssue';
import type { DiscoveryState, DiscoveryStateProjection } from '@shared/discoveryProjection';
import type { ContentRevelationState } from './contentPresence';
import type { UnresolvedWikilinkRow } from './wikiLoreGraph';

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

function discoveryNeedsRailAttention(
  discovery: DiscoveryStateProjection | null | undefined,
): boolean {
  if (!discovery) return false;
  if (!discovery.available) return true;
  return discovery.state !== 'known';
}

function formatDiscoveryStateLabel(state: DiscoveryState): string {
  if (state === 'hidden') return 'Hidden';
  if (state === 'rumor') return 'Rumor';
  if (state === 'partial') return 'Partial';
  if (state === 'contested') return 'Contested';
  if (state === 'known') return 'Known';
  return state;
}

function hasDiscoveryRailSignal(input: {
  isDMUser: boolean;
  discovery: DiscoveryStateProjection | null | undefined;
  presenceState?: ContentRevelationState | string | null;
}): boolean {
  if (input.isDMUser) {
    const presence = input.presenceState ?? 'REVEALED';
    if (presence !== 'REVEALED') return true;
  }
  return discoveryNeedsRailAttention(input.discovery);
}

export function resolveCodexRailVariant(input: {
  isDMUser: boolean;
  summary: PageContinuitySummary;
  discovery: DiscoveryStateProjection | null | undefined;
  presenceState?: ContentRevelationState | string | null;
}): CodexRailVariant {
  if (input.summary.hasAny) return 'diagnostics';
  if (
    hasDiscoveryRailSignal({
      isDMUser: input.isDMUser,
      discovery: input.discovery,
      presenceState: input.presenceState,
    })
  ) {
    return 'discovery';
  }
  return 'balanced';
}

export function resolveCodexRailHeaderSubtitle(input: {
  railVariant: CodexRailVariant;
  summary: PageContinuitySummary;
  discovery: DiscoveryStateProjection | null | undefined;
  presenceState?: ContentRevelationState | string | null;
  isDMUser: boolean;
}): string {
  const parts: string[] = [];

  if (input.railVariant === 'diagnostics' || input.summary.hasAny) {
    const n = input.summary.totalIssueCount;
    parts.push(`${n} continuity issue${n === 1 ? '' : 's'}`);
  }

  if (
    hasDiscoveryRailSignal({
      isDMUser: input.isDMUser,
      discovery: input.discovery,
      presenceState: input.presenceState,
    })
  ) {
    const label = input.discovery
      ? formatDiscoveryStateLabel(input.discovery.state)
      : 'Discovery';
    parts.push(`Party knowledge: ${label}`);
  }

  if (parts.length === 0) {
    return 'Continuity & relational awareness';
  }

  return parts.join(' · ');
}

export type CodexDiagnosticsChipTone = 'ok' | 'info' | 'warning' | 'critical';

export function resolveCodexDiagnosticsChipTone(
  summary: PageContinuitySummary,
): CodexDiagnosticsChipTone {
  if (!summary.hasAny) return 'ok';
  if (summary.hasCritical) return 'critical';
  if (summary.hasWarnings) return 'warning';
  return 'info';
}

/** Section keys for variant-based rail ordering. */
export type CodexRailSectionKey =
  | 'callout'
  | 'relations'
  | 'provenance'
  | 'timeline'
  | 'threads'
  | 'discovery'
  | 'continuity';

export function resolveCodexRailSectionOrder(
  railVariant: CodexRailVariant,
  isDMUser: boolean,
): CodexRailSectionKey[] {
  const threads: CodexRailSectionKey[] = isDMUser ? ['threads'] : [];

  switch (railVariant) {
    case 'diagnostics':
      return ['callout', 'timeline', 'relations', 'provenance', ...threads];
    case 'discovery':
      return ['callout', 'provenance', 'relations', 'timeline', ...threads];
    default:
      return ['relations', 'provenance', 'timeline', ...threads];
  }
}

export const CODEX_RAIL_CONTINUITY_ANCHOR_ID = 'codex-rail-continuity';
