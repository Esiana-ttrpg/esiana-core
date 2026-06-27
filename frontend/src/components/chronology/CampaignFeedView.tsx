import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type {
  ConvergenceOverlayBundle,
  ConvergenceTimelineEntry,
} from '@/lib/chronologyOverlayApi';
import {
  formatConvergenceFeedTitle,
  formatConvergenceLinkLabel,
  formatWorldEventFeedSummary,
  shouldShowConvergenceVisibilityBadge,
} from '@shared/convergenceFeedDisplay';
import { visibilityTierLabelFromProjection } from '@shared/visibilityTier';
import { VisibilityTierChip } from '@/components/narrative/VisibilityTierChip';
import { ChronologyDomainKind } from '@shared/chronologyDomainKinds';
import { campaignWorldAdvanceBatchPath, readCampaignHandle } from '@/lib/campaignPaths';
import {
  groupDomainFeedItems,
  type FeedListItem,
} from '@/components/chronology/worldAdvanceFeedGrouping';
import {
  DowntimePeriodAffectedList,
  parseDowntimePeriodPayload,
  shouldShowDowntimeAffectedInline,
} from '@/components/chronology/DowntimePeriodAffectedList';
import { DowntimeGapOverlayEditor } from '@/components/chronology/DowntimeGapOverlayEditor';

const DOMAIN_LABELS: Record<string, string> = {
  [ChronologyDomainKind.WORLD_EVENT]: 'World events',
  [ChronologyDomainKind.SESSION_CHRONICLE]: 'Sessions',
  [ChronologyDomainKind.MAP_KEYFRAME]: 'Maps',
  [ChronologyDomainKind.ORG_RELATION]: 'Factions',
  [ChronologyDomainKind.LORE_REFERENCE]: 'Lore',
  [ChronologyDomainKind.QUEST_TRANSITION]: 'Quests',
  [ChronologyDomainKind.FACTION_CONTROL]: 'Territory',
  [ChronologyDomainKind.WORLD_ADVANCE]: 'World advance',
  [ChronologyDomainKind.DOWNTIME_PERIOD]: 'Downtime',
};

const DOMAIN_CHIP_OPTIONS = [
  ChronologyDomainKind.WORLD_EVENT,
  ChronologyDomainKind.SESSION_CHRONICLE,
  ChronologyDomainKind.DOWNTIME_PERIOD,
  ChronologyDomainKind.MAP_KEYFRAME,
  ChronologyDomainKind.ORG_RELATION,
  ChronologyDomainKind.WORLD_ADVANCE,
  ChronologyDomainKind.LORE_REFERENCE,
] as const;

const DEFAULT_COLLAPSED = new Set<string>([
  ChronologyDomainKind.MAP_KEYFRAME,
  ChronologyDomainKind.LORE_REFERENCE,
]);

type DateGroup = {
  dateLabel: string;
  byDomain: Map<string, ConvergenceTimelineEntry[]>;
};

interface CampaignFeedViewProps {
  bundle: ConvergenceOverlayBundle;
  selectedDomains: string[];
  sessionLinkedOnly: boolean;
  onDomainsChange: (domains: string[]) => void;
  onSessionLinkedOnlyChange: (value: boolean) => void;
  canManageChronology?: boolean;
  onOverlaySaved?: () => void;
}

function groupEntries(entries: ConvergenceTimelineEntry[]): DateGroup[] {
  const byDate = new Map<string, DateGroup>();
  for (const entry of entries) {
    const dateLabel = entry.display.dateLabel ?? 'Undated';
    let group = byDate.get(dateLabel);
    if (!group) {
      group = { dateLabel, byDomain: new Map() };
      byDate.set(dateLabel, group);
    }
    const list = group.byDomain.get(entry.domain) ?? [];
    list.push(entry);
    group.byDomain.set(entry.domain, list);
  }
  return [...byDate.values()].sort((a, b) => a.dateLabel.localeCompare(b.dateLabel));
}

function DowntimePeriodRow({
  entry,
  campaignHandle,
  canManageChronology,
  onOverlaySaved,
}: {
  entry: ConvergenceTimelineEntry;
  campaignHandle: string;
  canManageChronology: boolean;
  onOverlaySaved?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const payload = parseDowntimePeriodPayload(entry);
  const showAffectedInline =
    payload != null && shouldShowDowntimeAffectedInline(payload, expanded);

  return (
    <li className="text-sm">
      <div className="flex flex-wrap items-baseline gap-2">
        <button
          type="button"
          className="font-medium text-foreground hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {formatConvergenceFeedTitle(entry.display.title)}
        </button>
        {payload?.isOpen ? (
          <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            Current
          </span>
        ) : null}
      </div>
      {entry.display.summary ? (
        <p className="text-xs text-muted line-clamp-2">{entry.display.summary}</p>
      ) : null}
      {showAffectedInline && payload ? (
        <DowntimePeriodAffectedList
          campaignHandle={campaignHandle}
          payload={payload}
          compact
        />
      ) : null}
      {expanded && payload ? (
        <ul className="mt-1 space-y-0.5 border-l border-border pl-3 text-xs text-muted">
          {payload.advanceRunCount > 0 ? (
            <li>
              {payload.advanceRunCount} time advance
              {payload.advanceRunCount === 1 ? '' : 's'}
            </li>
          ) : null}
          {payload.projectCompletions > 0 ? (
            <li>
              {payload.projectCompletions} project
              {payload.projectCompletions === 1 ? '' : 's'} completed
            </li>
          ) : null}
          {payload.projectFailures > 0 ? (
            <li>
              {payload.projectFailures} project
              {payload.projectFailures === 1 ? '' : 's'} failed
            </li>
          ) : null}
          {payload.advanceRunCount === 0 &&
          payload.projectCompletions === 0 &&
          payload.projectFailures === 0 ? (
            <li>Quiet stretch — no recorded simulation activity.</li>
          ) : null}
        </ul>
      ) : null}
      {expanded && payload && !showAffectedInline ? (
        <DowntimePeriodAffectedList campaignHandle={campaignHandle} payload={payload} />
      ) : null}
      {expanded && canManageChronology && payload ? (
        <DowntimeGapOverlayEditor
          campaignHandle={campaignHandle}
          gapId={payload.gapId}
          onSaved={onOverlaySaved}
        />
      ) : null}
      {entry.links.length > 0 && (
        <div className="mt-0.5 flex flex-wrap gap-2">
          {entry.links.map((link) => (
            <Link
              key={`${entry.entryId}-${link.hrefKind}`}
              to={link.path}
              className="text-xs text-primary hover:underline"
            >
              {formatConvergenceLinkLabel(link.hrefKind)}
            </Link>
          ))}
        </div>
      )}
    </li>
  );
}

function WorldAdvanceBatchRow({
  item,
  campaignHandle,
}: {
  item: Extract<FeedListItem, { kind: 'world_advance_batch' }>;
  campaignHandle: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const effectCount = item.entries.length;
  return (
    <li className="text-sm">
      <div className="flex flex-wrap items-baseline gap-2">
        <button
          type="button"
          className="font-medium text-foreground hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {item.headline}
        </button>
        <span className="text-xs text-muted">
          {effectCount} effect{effectCount === 1 ? '' : 's'}
        </span>
        <Link
          to={campaignWorldAdvanceBatchPath(campaignHandle, item.batchEventId)}
          className="text-xs text-primary hover:underline"
        >
          Provenance
        </Link>
      </div>
      {expanded ? (
        <ul className="mt-1 space-y-0.5 border-l border-border pl-3 text-xs text-muted">
          {item.entries.map((entry) => (
            <li key={entry.entryId}>{entry.display.title}</li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function CampaignFeedView({
  bundle,
  selectedDomains,
  sessionLinkedOnly,
  onDomainsChange,
  onSessionLinkedOnlyChange,
  canManageChronology = false,
  onOverlaySaved,
}: CampaignFeedViewProps) {
  const params = useParams<{ campaignHandle?: string }>();
  const campaignHandle = readCampaignHandle(params);
  const [collapsedDomains, setCollapsedDomains] = useState<Set<string>>(
    () => new Set(DEFAULT_COLLAPSED),
  );
  const visibleEntries = useMemo(
    () => bundle.entries.filter((e) => e.projection.visible),
    [bundle.entries],
  );

  const dateGroups = useMemo(() => groupEntries(visibleEntries), [visibleEntries]);

  function toggleDomainChip(domain: string) {
    const all = [...DOMAIN_CHIP_OPTIONS];
    let next: string[];
    if (selectedDomains.length === 0) {
      next = all.filter((d) => d !== domain);
    } else if (selectedDomains.includes(domain)) {
      next = selectedDomains.filter((d) => d !== domain);
    } else {
      next = [...selectedDomains, domain];
      if (next.length >= all.length) next = [];
    }
    onDomainsChange(next);
  }

  function toggleDomainSection(domain: string) {
    setCollapsedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 space-y-2 border-b border-border px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted">Domains</span>
          {DOMAIN_CHIP_OPTIONS.map((domain) => {
            const active =
              selectedDomains.length === 0 || selectedDomains.includes(domain);
            return (
              <button
                key={domain}
                type="button"
                onClick={() => toggleDomainChip(domain)}
                className={`rounded-full border px-2.5 py-0.5 text-xs ${
                  active
                    ? 'border-primary bg-primary/15 text-foreground'
                    : 'border-border text-muted hover:text-foreground'
                }`}
              >
                {DOMAIN_LABELS[domain] ?? domain}
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={sessionLinkedOnly}
            onChange={(e) => onSessionLinkedOnlyChange(e.target.checked)}
            className="rounded border-border"
          />
          Session-linked only
        </label>
        {bundle.truncation.capped && (
          <p className="text-xs text-amber-200/90">
            Showing first {bundle.truncation.maxEntries} of {bundle.truncation.totalCollected}{' '}
            entries. Narrow the chronology window or domain filters.
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {visibleEntries.length === 0 ? (
          <p className="text-sm text-muted">No entries match the current filters.</p>
        ) : (
          <div className="space-y-4">
            {dateGroups.map((group) => (
              <section key={group.dateLabel}>
                <h3 className="sticky top-0 z-10 bg-background/95 py-1 META_SECTION_LABEL_CLASS">
                  {group.dateLabel}
                </h3>
                <div className="space-y-2 pl-1">
                  {[...group.byDomain.entries()].map(([domain, entries]) => {
                    const collapsed = collapsedDomains.has(domain);
                    return (
                      <div key={`${group.dateLabel}-${domain}`}>
                        <button
                          type="button"
                          onClick={() => toggleDomainSection(domain)}
                          className="flex w-full items-center gap-1 text-left text-xs font-medium text-foreground"
                        >
                          {collapsed ? (
                            <ChevronRight className="size-3.5 shrink-0" />
                          ) : (
                            <ChevronDown className="size-3.5 shrink-0" />
                          )}
                          {DOMAIN_LABELS[domain] ?? domain}
                          <span className="text-muted">({entries.length})</span>
                        </button>
                        {!collapsed && (
                          <ul className="mt-1 space-y-1 border-l border-border pl-3">
                            {groupDomainFeedItems(domain, entries).map((item) =>
                              item.kind === 'world_advance_batch' ? (
                                <WorldAdvanceBatchRow
                                  key={item.batchEventId}
                                  item={item}
                                  campaignHandle={campaignHandle}
                                />
                              ) : item.entry.domain === ChronologyDomainKind.DOWNTIME_PERIOD ? (
                                <DowntimePeriodRow
                                  key={item.entry.entryId}
                                  entry={item.entry}
                                  campaignHandle={campaignHandle}
                                  canManageChronology={canManageChronology}
                                  onOverlaySaved={onOverlaySaved}
                                />
                              ) : (
                                <li key={item.entry.entryId} className="text-sm">
                                  <div className="flex flex-wrap items-baseline gap-2">
                                    <span className="font-medium text-foreground">
                                      {formatConvergenceFeedTitle(item.entry.display.title)}
                                    </span>
                                    {shouldShowConvergenceVisibilityBadge(
                                      item.entry.projection.visibilityTier,
                                    ) ? (
                                      <VisibilityTierChip
                                        tier={visibilityTierLabelFromProjection(
                                          item.entry.projection.visibilityTier,
                                        )}
                                        compact
                                      />
                                    ) : null}
                                  </div>
                                  {(() => {
                                    const summary = formatWorldEventFeedSummary(
                                      item.entry.display.summary,
                                    );
                                    return summary ? (
                                      <p className="text-xs text-muted line-clamp-2">{summary}</p>
                                    ) : null;
                                  })()}
                                  {item.entry.links.length > 0 && (
                                    <div className="mt-0.5 flex flex-wrap gap-2">
                                      {item.entry.links.map((link) => (
                                        <Link
                                          key={`${item.entry.entryId}-${link.hrefKind}`}
                                          to={link.path}
                                          className="text-xs text-primary hover:underline"
                                        >
                                          {formatConvergenceLinkLabel(link.hrefKind)}
                                        </Link>
                                      ))}
                                    </div>
                                  )}
                                </li>
                              ),
                            )}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
