import { ArrowRight } from 'lucide-react';
import {
  ROUTE_CHANGE_REASONS,
  ROUTE_CHANGE_SEVERITIES,
  type EventConsequence,
  type EventHavenThreatSeverity,
  type HavenThreatPayload,
  type QuestHookMode,
  type RouteChangePayload,
  type RouteChangeReason,
  type RouteChangeSeverity,
} from '@shared/eventConsequence';
import {
  EVENT_CONSEQUENCE_APPLICATION_GM_LABELS,
  HAVEN_THREAT_SEVERITY_GM_LABELS,
  ROUTE_CHANGE_REASON_GM_LABELS,
  ROUTE_CHANGE_SEVERITY_GM_LABELS,
  formatConsequenceSentenceLabel,
} from '@shared/eventConsequencePresentation';
import { DOWNTIME_HAVEN_TEMPLATE_TYPE, HAVEN_THREAT_SEVERITIES } from '@shared/havenMetadata';
import { IdentityPagePicker } from '@/components/campaign/IdentityPagePicker';
import {
  buildOpportunitySearchOptions,
  extractLoreLinkedPageIds,
  suggestPagesForConsequenceKind,
} from '@/lib/eventConsequenceSuggestions';
import { filterRegionLocationPages } from '@/lib/locationMetadata';
import type { WikiTreeNode } from '@/types/wiki';

const inlineSelectClass =
  'rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus:border-primary/60';
const inlineInputClass =
  'w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-primary/60';

interface WorldImpactRowProps {
  row: EventConsequence;
  flatPages: WikiTreeNode[];
  loreBlocks: unknown[];
  onUpdate: (patch: Partial<EventConsequence>) => void;
  onRemove: () => void;
  inferQuestHookMode: (pageId: string | null) => QuestHookMode;
  onCreateOpportunityPage?: (title: string) => Promise<WikiTreeNode>;
}

function SuggestionChips({
  suggestions,
  loreBlocks,
  flatPages,
  onSelect,
}: {
  suggestions: WikiTreeNode[];
  loreBlocks: unknown[];
  flatPages: WikiTreeNode[];
  onSelect: (pageId: string) => void;
}) {
  const loreIds = new Set(extractLoreLinkedPageIds(loreBlocks, flatPages));
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Suggestions:</span>
      {suggestions.map((page) => (
        <button
          key={page.id}
          type="button"
          className="rounded-full border border-border/80 bg-muted/30 px-2 py-0.5 text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-muted/50"
          onClick={() => onSelect(page.id)}
        >
          {loreIds.has(page.id) ? `From lore: ${page.title}` : page.title}
        </button>
      ))}
    </div>
  );
}

function applicationBadgeClass(state: string | undefined): string {
  switch (state) {
    case 'complete':
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
    case 'partial':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400';
    case 'blocked':
      return 'bg-red-500/10 text-red-700 dark:text-red-400';
    default:
      return 'bg-muted/50 text-muted-foreground';
  }
}

export function WorldImpactRow({
  row,
  flatPages,
  loreBlocks,
  onUpdate,
  onRemove,
  inferQuestHookMode,
  onCreateOpportunityPage,
}: WorldImpactRowProps) {
  const applicationState = row.application?.state ?? 'pending';
  const suggestions = suggestPagesForConsequenceKind(row.kind, flatPages, loreBlocks);

  const opportunitySearchOptions = buildOpportunitySearchOptions(flatPages);
  const opportunityDefaultOptions =
    suggestions.length > 0 ? suggestions : opportunitySearchOptions.slice(0, 8);
  const locationPages = filterRegionLocationPages(flatPages);
  const havenPages = flatPages.filter((page) => page.templateType === DOWNTIME_HAVEN_TEMPLATE_TYPE);

  const routePayload = row.payload as RouteChangePayload;
  const havenPayload = row.payload as HavenThreatPayload;
  const fromId = row.targets?.locationIds?.[0] ?? null;
  const toId = row.targets?.locationIds?.[1] ?? null;
  const fromTitle = flatPages.find((p) => p.id === fromId)?.title;
  const toTitle = flatPages.find((p) => p.id === toId)?.title;

  return (
    <li className="space-y-3 rounded-md border border-border/80 bg-background/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-foreground">{formatConsequenceSentenceLabel(row)}</p>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${applicationBadgeClass(applicationState)}`}
        >
          {EVENT_CONSEQUENCE_APPLICATION_GM_LABELS[applicationState]}
        </span>
        <button
          type="button"
          className="ml-auto text-xs text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          Remove
        </button>
      </div>

      {row.kind === 'quest_hook' ? (
        <div className="space-y-2">
          <IdentityPagePicker
            flatPages={flatPages}
            defaultOptions={opportunityDefaultOptions}
            searchOptions={opportunitySearchOptions}
            value={row.targets?.pageIds?.[0] ?? null}
            placeholder="Search quests, leads, or wiki pages…"
            createLabel="Create new quest or lead"
            onCreatePage={
              onCreateOpportunityPage
                ? (title) => {
                    void onCreateOpportunityPage(title).then((page) =>
                      onUpdate({
                        targets: { pageIds: [page.id] },
                        payload: { mode: inferQuestHookMode(page.id) },
                      }),
                    );
                  }
                : undefined
            }
            onChange={(pageId) =>
              onUpdate({
                targets: { pageIds: pageId ? [pageId] : [] },
                payload: { mode: inferQuestHookMode(pageId) },
              })
            }
          />
          <SuggestionChips
            suggestions={suggestions}
            loreBlocks={loreBlocks}
            flatPages={flatPages}
            onSelect={(pageId) =>
              onUpdate({
                targets: { pageIds: [pageId] },
                payload: { mode: inferQuestHookMode(pageId) },
              })
            }
          />
          <p className="text-xs text-muted-foreground">Players can now discover this lead.</p>
        </div>
      ) : null}

      {row.kind === 'alter_location' ? (
        <div className="space-y-2">
          <IdentityPagePicker
            flatPages={flatPages}
            defaultOptions={suggestions}
            searchOptions={locationPages}
            value={row.targets?.locationIds?.[0] ?? row.targets?.pageIds?.[0] ?? null}
            placeholder="Choose a location"
            onChange={(pageId) =>
              onUpdate({
                targets: { locationIds: pageId ? [pageId] : [] },
              })
            }
          />
          <SuggestionChips
            suggestions={suggestions}
            loreBlocks={loreBlocks}
            flatPages={flatPages}
            onSelect={(pageId) => onUpdate({ targets: { locationIds: [pageId] } })}
          />
          <input
            className={inlineInputClass}
            placeholder="What changed? (optional)"
            value={row.description ?? ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
          />
        </div>
      ) : null}

      {row.kind === 'route_change' ? (
        <div className="space-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="min-w-[10rem] flex-1">
              <IdentityPagePicker
                flatPages={flatPages}
                defaultOptions={suggestions}
                searchOptions={locationPages}
                value={fromId}
                placeholder="From"
                onChange={(pageId) => {
                  const nextFrom = pageId ?? '';
                  const nextTo = toId ?? '';
                  onUpdate({
                    targets: {
                      locationIds:
                        nextFrom || nextTo ? [nextFrom, nextTo].filter(Boolean) : [],
                    },
                  });
                }}
              />
            </div>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-[10rem] flex-1">
              <IdentityPagePicker
                flatPages={flatPages}
                defaultOptions={suggestions}
                searchOptions={locationPages}
                value={toId}
                placeholder="To"
                onChange={(pageId) => {
                  const nextFrom = fromId ?? '';
                  const nextTo = pageId ?? '';
                  onUpdate({
                    targets: {
                      locationIds:
                        nextFrom || nextTo ? [nextFrom, nextTo].filter(Boolean) : [],
                    },
                  });
                }}
              />
            </div>
          </div>
          {fromTitle && toTitle ? (
            <p className="text-xs text-muted-foreground">
              {fromTitle} → {toTitle}
            </p>
          ) : null}
          <SuggestionChips
            suggestions={suggestions}
            loreBlocks={loreBlocks}
            flatPages={flatPages}
            onSelect={(pageId) => {
              if (!fromId) {
                onUpdate({ targets: { locationIds: [pageId] } });
                return;
              }
              if (!toId && pageId !== fromId) {
                onUpdate({ targets: { locationIds: [fromId, pageId] } });
              }
            }}
          />
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <select
              className={inlineSelectClass}
              value={routePayload.severity ?? 'minor'}
              onChange={(e) =>
                onUpdate({
                  payload: {
                    ...routePayload,
                    severity: e.target.value as RouteChangeSeverity,
                  },
                })
              }
            >
              {ROUTE_CHANGE_SEVERITIES.map((severity) => (
                <option key={severity} value={severity}>
                  {ROUTE_CHANGE_SEVERITY_GM_LABELS[severity]}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-muted-foreground">
              Cause:
              <select
                className={inlineSelectClass}
                value={routePayload.reason ?? 'other'}
                onChange={(e) =>
                  onUpdate({
                    payload: {
                      ...routePayload,
                      reason: e.target.value as RouteChangeReason,
                    },
                  })
                }
              >
                {ROUTE_CHANGE_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {ROUTE_CHANGE_REASON_GM_LABELS[reason]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ) : null}

      {row.kind === 'haven_threat' ? (
        <div className="space-y-2">
          <IdentityPagePicker
            flatPages={flatPages}
            defaultOptions={suggestions}
            searchOptions={havenPages}
            value={row.targets?.havenIds?.[0] ?? null}
            placeholder="Choose a haven"
            onChange={(pageId) =>
              onUpdate({
                targets: { havenIds: pageId ? [pageId] : [] },
              })
            }
          />
          <SuggestionChips
            suggestions={suggestions}
            loreBlocks={loreBlocks}
            flatPages={flatPages}
            onSelect={(pageId) => onUpdate({ targets: { havenIds: [pageId] } })}
          />
          <label className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            What&apos;s happening?
            <input
              className={`min-w-[12rem] flex-1 ${inlineInputClass}`}
              placeholder="Refugees arrive, raiders nearby…"
              value={havenPayload.label ?? ''}
              onChange={(e) =>
                onUpdate({
                  payload: {
                    label: e.target.value,
                    severity: havenPayload.severity ?? null,
                    description: havenPayload.description,
                  } satisfies HavenThreatPayload,
                })
              }
            />
          </label>
          <label className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            Severity:
            <select
              className={inlineSelectClass}
              value={havenPayload.severity ?? ''}
              onChange={(e) =>
                onUpdate({
                  payload: {
                    label: havenPayload.label ?? '',
                    severity: (e.target.value || null) as EventHavenThreatSeverity | null,
                    description: havenPayload.description,
                  } satisfies HavenThreatPayload,
                })
              }
            >
              <option value="">Optional</option>
              {HAVEN_THREAT_SEVERITIES.map((severity) => (
                <option key={severity} value={severity}>
                  {HAVEN_THREAT_SEVERITY_GM_LABELS[severity]}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {row.application?.warnings?.length ? (
        <ul className="text-xs text-amber-600 dark:text-amber-400">
          {row.application.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
