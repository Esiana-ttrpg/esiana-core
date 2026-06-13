import type {
  EventConsequence,
  EventConsequenceApplicationState,
  EventConsequenceApplyResult,
  EventConsequenceKind,
  EventConsequencePreviewRow,
  EventHavenThreatSeverity,
  HavenThreatPayload,
  QuestHookPayload,
  RouteChangePayload,
  RouteChangeReason,
  RouteChangeSeverity,
} from './eventConsequence.js';

export const EVENT_CONSEQUENCE_KIND_GM_LABELS: Record<EventConsequenceKind, string> = {
  quest_hook: 'Opportunity appears',
  alter_location: 'Location changes',
  route_change: 'Travel disruption',
  haven_threat: 'Haven threatened',
};

export const EVENT_CONSEQUENCE_KIND_SENTENCE_LABELS: Record<EventConsequenceKind, string> = {
  quest_hook: 'Quest or lead appears',
  alter_location: 'A place changes',
  route_change: 'Travel disruption',
  haven_threat: 'A haven faces trouble',
};

export const EVENT_CONSEQUENCE_APPLICATION_GM_LABELS: Record<
  EventConsequenceApplicationState,
  string
> = {
  pending: 'Not yet applied',
  complete: 'Applied',
  partial: 'Needs review',
  blocked: 'Could not apply',
};

export const ROUTE_CHANGE_SEVERITY_GM_LABELS: Record<RouteChangeSeverity, string> = {
  minor: 'Minor disruption',
  major: 'Major disruption',
};

export const ROUTE_CHANGE_REASON_GM_LABELS: Record<RouteChangeReason, string> = {
  war: 'War',
  banditry: 'Banditry',
  disaster: 'Disaster',
  other: 'Other',
};

export const HAVEN_THREAT_SEVERITY_GM_LABELS: Record<EventHavenThreatSeverity, string> = {
  low: 'Low',
  rising: 'Rising',
  critical: 'Critical',
};

export type PageTitleLookup = Map<string, string> | Record<string, string>;

export type FormattedPreviewLine = {
  text: string;
  tone: 'default' | 'warning' | 'blocked';
};

function resolvePageTitle(lookup: PageTitleLookup, pageId: string | undefined): string | null {
  if (!pageId) return null;
  if (lookup instanceof Map) {
    return lookup.get(pageId) ?? null;
  }
  return lookup[pageId] ?? null;
}

function quoteTitle(title: string): string {
  return `"${title}"`;
}

export function collectConsequencePageIds(row: EventConsequence): string[] {
  const ids = new Set<string>();
  for (const id of row.targets?.pageIds ?? []) {
    if (id.trim()) ids.add(id.trim());
  }
  for (const id of row.targets?.locationIds ?? []) {
    if (id.trim()) ids.add(id.trim());
  }
  for (const id of row.targets?.havenIds ?? []) {
    if (id.trim()) ids.add(id.trim());
  }
  return [...ids];
}

export function collectApplyResultPageIds(
  consequences: EventConsequence[],
  previewRows?: EventConsequencePreviewRow[],
): string[] {
  const ids = new Set<string>();
  for (const row of consequences) {
    for (const id of collectConsequencePageIds(row)) {
      ids.add(id);
    }
  }
  return [...ids];
}

export function formatConsequenceCardTitle(row: EventConsequence): string {
  return EVENT_CONSEQUENCE_KIND_GM_LABELS[row.kind];
}

export function formatConsequenceSentenceLabel(row: EventConsequence): string {
  return EVENT_CONSEQUENCE_KIND_SENTENCE_LABELS[row.kind];
}

export function formatApplicationStateLabel(
  state: EventConsequenceApplicationState | undefined,
): string {
  if (!state) return EVENT_CONSEQUENCE_APPLICATION_GM_LABELS.pending;
  return EVENT_CONSEQUENCE_APPLICATION_GM_LABELS[state];
}

export function formatConsequenceDetailLine(
  row: EventConsequence,
  titles: PageTitleLookup,
  options?: { projectedState?: EventConsequencePreviewRow['projectedState'] },
): string {
  const projectedState = options?.projectedState;
  const blocked = projectedState === 'blocked';

  switch (row.kind) {
    case 'quest_hook': {
      const pageId = row.targets?.pageIds?.[0];
      const title = resolvePageTitle(titles, pageId) ?? pageId ?? 'the linked page';
      const payload = row.payload as QuestHookPayload;
      if (blocked) {
        return pageId
          ? `${quoteTitle(title)} could not be made discoverable — check the linked page.`
          : 'Choose a quest or lead page before applying.';
      }
      if (payload.mode === 'discover_quest') {
        return `${quoteTitle(title)} is now discoverable to players.`;
      }
      return `${quoteTitle(title)} is now discoverable as a lead.`;
    }
    case 'alter_location': {
      const locationId =
        row.targets?.locationIds?.[0] ?? row.targets?.pageIds?.[0];
      const title = resolvePageTitle(titles, locationId) ?? locationId ?? 'the location';
      if (blocked) {
        return locationId
          ? `${quoteTitle(title)} could not be updated — location not found.`
          : 'Choose a location before applying.';
      }
      if (row.description?.trim()) {
        return `${quoteTitle(title)} changes: ${row.description.trim()}.`;
      }
      return `${quoteTitle(title)} is marked as changed after this event.`;
    }
    case 'route_change': {
      const locationIds = row.targets?.locationIds ?? [];
      const fromId = locationIds[0];
      const toId = locationIds[1];
      const fromTitle = resolvePageTitle(titles, fromId) ?? fromId ?? '…';
      const toTitle = resolvePageTitle(titles, toId) ?? toId ?? '…';
      const payload = row.payload as RouteChangePayload;
      const severity =
        ROUTE_CHANGE_SEVERITY_GM_LABELS[payload.severity ?? 'minor'] ?? 'Disruption';
      const reason =
        ROUTE_CHANGE_REASON_GM_LABELS[payload.reason ?? 'other'] ?? 'Other';
      if (blocked) {
        if (!fromId || !toId) {
          return 'Choose both ends of the route before applying.';
        }
        return `Travel between ${quoteTitle(fromTitle)} and ${quoteTitle(toTitle)} could not be projected on the current map.`;
      }
      if (row.description?.trim()) {
        return row.description.trim();
      }
      return `Travel between ${quoteTitle(fromTitle)} and ${quoteTitle(toTitle)} becomes dangerous (${severity.toLowerCase()}, ${reason.toLowerCase()}).`;
    }
    case 'haven_threat': {
      const havenId = row.targets?.havenIds?.[0];
      const havenTitle = resolvePageTitle(titles, havenId) ?? havenId ?? 'the haven';
      const payload = row.payload as HavenThreatPayload;
      const label = payload.label?.trim();
      if (blocked) {
        if (!havenId) return 'Choose a haven before applying.';
        if (!label) return 'Describe what is happening at the haven before applying.';
        return `${quoteTitle(havenTitle)} could not be updated — haven not found.`;
      }
      if (label) {
        return `${quoteTitle(havenTitle)}: ${label}.`;
      }
      return `${quoteTitle(havenTitle)} faces new trouble.`;
    }
    default:
      return row.description?.trim() || 'World impact recorded.';
  }
}

export function formatConsequenceFeedSummary(
  row: EventConsequence,
  titles: PageTitleLookup,
): string {
  const state = row.application?.state ?? 'pending';
  const detail = formatConsequenceDetailLine(row, titles);
  if (state === 'pending') {
    return detail;
  }
  const stateLabel = formatApplicationStateLabel(state);
  return `${detail} (${stateLabel})`;
}

export function shouldShowApplyCountHeadline(result: EventConsequenceApplyResult): boolean {
  const rows = result.previewRows ?? [];
  if (rows.length >= 2) return true;
  if (rows.length === 0) return false;

  const hasApplied = result.appliedCount > 0;
  const hasPartial = result.partialCount > 0;
  const hasBlocked = result.blockedCount > 0;
  const outcomeKinds = [hasApplied, hasPartial, hasBlocked].filter(Boolean).length;
  return outcomeKinds >= 2;
}

export function formatApplyResultHeadline(result: EventConsequenceApplyResult): string | null {
  if (!shouldShowApplyCountHeadline(result)) return null;

  const parts: string[] = [];
  if (result.appliedCount > 0) {
    parts.push(
      `${result.appliedCount} change${result.appliedCount === 1 ? '' : 's'} applied`,
    );
  }
  if (result.partialCount > 0) {
    parts.push(
      `${result.partialCount} need${result.partialCount === 1 ? 's' : ''} review`,
    );
  }
  if (result.blockedCount > 0) {
    parts.push(
      `${result.blockedCount} could not be applied`,
    );
  }
  return parts.join(' · ');
}

export function formatPreviewRows(
  result: EventConsequenceApplyResult,
  consequences: EventConsequence[],
  titles: PageTitleLookup,
): FormattedPreviewLine[] {
  const byId = new Map(consequences.map((row) => [row.id, row]));
  const lines: FormattedPreviewLine[] = [];

  for (const previewRow of result.previewRows ?? []) {
    const consequence = byId.get(previewRow.consequenceId);
    const text = consequence
      ? formatConsequenceDetailLine(consequence, titles, {
          projectedState: previewRow.projectedState,
        })
      : previewRow.summary;
    const tone =
      previewRow.projectedState === 'blocked'
        ? 'blocked'
        : previewRow.projectedState === 'partial' ||
            previewRow.pendingConfirmations.length > 0
          ? 'warning'
          : 'default';
    lines.push({ text, tone });
  }

  for (const confirmation of result.pendingConfirmations) {
    lines.push({
      text: formatPendingConfirmation(confirmation, titles),
      tone: 'warning',
    });
  }

  return lines;
}

export function formatPendingConfirmation(
  line: string,
  titles: PageTitleLookup,
): string {
  const overlayMatch = line.match(
    /Trade route overlay ([^ ]+) projected \(DRAFT\) — confirm in map editor/i,
  );
  if (overlayMatch) {
    return 'Confirm the new travel route on the map editor.';
  }
  if (/confirm in map editor/i.test(line)) {
    return 'Confirm the new travel route on the map editor after applying.';
  }
  if (/DRAFT/i.test(line) && /overlay/i.test(line)) {
    return 'A draft travel route will appear on the map — confirm it after applying.';
  }
  return line;
}

export const WORLD_IMPACT_TEMPLATE_CARDS: Array<{
  kind: EventConsequenceKind;
  label: string;
  description: string;
}> = [
  {
    kind: 'quest_hook',
    label: EVENT_CONSEQUENCE_KIND_GM_LABELS.quest_hook,
    description: 'Players can discover a quest or lead',
  },
  {
    kind: 'alter_location',
    label: EVENT_CONSEQUENCE_KIND_GM_LABELS.alter_location,
    description: 'A place is altered after the event',
  },
  {
    kind: 'route_change',
    label: EVENT_CONSEQUENCE_KIND_GM_LABELS.route_change,
    description: 'A route becomes dangerous or blocked',
  },
  {
    kind: 'haven_threat',
    label: EVENT_CONSEQUENCE_KIND_GM_LABELS.haven_threat,
    description: 'A haven faces new trouble',
  },
];
