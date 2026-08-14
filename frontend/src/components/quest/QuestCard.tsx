import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { QuestHubNode } from '@/types/wiki';
import { questStatusBadgeClass } from '@/lib/questHubLayout';
import { campaignChronologyPath, campaignWikiPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import { formatQuestDateLabel } from '@/lib/chronologyCalendar';
import {
  QuestCardPropertySummary,
  QuestCardTags,
} from '@/components/quest/QuestCardPropertySummary';
import { QuestTimePressureBadges } from '@/components/quest/QuestTimePressureBadges';
import { QuestHiddenLifecycleChip } from '@/components/quest/QuestHiddenLifecycleChip';
import { shouldShowQuestHiddenLifecycleChip } from '@/lib/questLifecycleDisplay';
import type { FantasyCalendarLike } from '@/lib/timeEngine';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface QuestCardProps {
  node: QuestHubNode;
  campaignHandle: string;
  tagsPageId: string | null;
  isDMUser?: boolean;
  playerPreview: boolean;
  nested?: boolean;
  defaultExpanded?: boolean;
  /** Kanban column card: hide status badge and nested sidequest tree. */
  boardMode?: boolean;
  calendarLike?: FantasyCalendarLike | null;
}

export function QuestCard({
  node,
  campaignHandle,
  tagsPageId,
  isDMUser: isDMUserProp,
  playerPreview,
  nested = false,
  defaultExpanded = false,
  boardMode = false,
  calendarLike = null,
}: QuestCardProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const { flatPages } = useWiki();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const showDmRewards = isDMUser && !playerPreview && node.quest.dmRewardsText;
  const tags = node.tags ?? [];
  const padding = boardMode ? 'p-3' : 'p-4';
  const listDateLabel =
    !boardMode && calendarLike != null
      ? formatQuestDateLabel(node.quest.questDate, calendarLike)
      : null;
  const showHiddenLifecycleChip = shouldShowQuestHiddenLifecycleChip({
    lifecycleState: node.lifecycleState,
    isDMUser,
    playerPreview,
  });

  return (
    <div
      className={`region-depth-3 rounded-md ${
        nested ? 'ml-4 border-l-2 border-l-primary/30 pl-1' : ''
      }`}
    >
      <div className={`${padding} flex flex-col`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <Link
                to={campaignWikiPath(campaignHandle, node.id, flatPages)}
                className={`font-semibold text-foreground hover:text-primary ${
                  boardMode ? 'text-sm leading-snug' : 'text-base'
                }`}
              >
                {node.title}
              </Link>
              {showHiddenLifecycleChip ? (
                <QuestHiddenLifecycleChip compact={boardMode} />
              ) : null}
              {listDateLabel && (
                <Link
                  to={campaignChronologyPath(campaignHandle, 'calendar')}
                  className="text-sm font-normal text-muted hover:text-primary hover:underline"
                >
                  {listDateLabel}
                </Link>
              )}
            </div>
            {!boardMode && node.snippet && (
              <p className="mt-1 line-clamp-2 text-sm text-muted">{node.snippet}</p>
            )}
            <QuestCardPropertySummary
              quest={node.quest}
              location={node.location}
              progressNote={node.progressNote}
              references={node.references}
              calendarLike={calendarLike}
              compact={boardMode}
              hideDate={Boolean(listDateLabel)}
            />
            {isDMUser && !playerPreview && node.timePressure?.length ? (
              <QuestTimePressureBadges badges={node.timePressure} compact={boardMode} />
            ) : null}
          </div>
          {!boardMode && (
            <span
              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${questStatusBadgeClass(node.quest.questStatus)}`}
            >
              {node.quest.questStatus.replace('_', ' ')}
            </span>
          )}
        </div>

        {node.progress.total > 0 && (
          <div className={boardMode ? 'mt-2' : 'mt-3'}>
            <div className="mb-1 flex justify-between text-[10px] text-muted">
              <span>Checklist</span>
              <span>
                {node.progress.completed}/{node.progress.total}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-elevated">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${node.progress.percent}%` }}
              />
            </div>
          </div>
        )}

        {!boardMode &&
          (node.quest.rewardsText || showDmRewards || node.recentActivity.length > 0) && (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="mt-3 inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
            >
              {expanded ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
              Details
            </button>
          )}

        {tags.length > 0 && (
          <div className="mt-auto flex justify-end pt-1">
            <QuestCardTags
              campaignHandle={campaignHandle}
              tagsPageId={tagsPageId}
              tags={tags}
            />
          </div>
        )}
      </div>

      {expanded && !boardMode && (
        <div className="border-t border-border px-4 py-3 text-sm">
          {node.quest.rewardsText && (
            <div className="mb-3">
              <p className={META_SECTION_LABEL_CLASS}>
                Rewards
              </p>
              <p className="mt-1 whitespace-pre-wrap text-foreground">
                {node.quest.rewardsText}
              </p>
            </div>
          )}
          {showDmRewards && (
            <div className="mb-3 rounded-md border border-amber-500/30 bg-amber-950/20 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/90">
                DM rewards (hidden from players)
              </p>
              <p className="mt-1 whitespace-pre-wrap text-foreground">
                {node.quest.dmRewardsText}
              </p>
            </div>
          )}
          {node.recentActivity.length > 0 && (
            <div>
              <p className={META_SECTION_LABEL_CLASS}>
                Recent activity
              </p>
              <ul className="mt-2 space-y-1.5">
                {node.recentActivity.map((entry) => (
                  <li key={entry.id}>
                    <Link
                      to={entry.href ?? campaignWikiPath(campaignHandle, entry.id, flatPages)}
                      className="block rounded-md border border-border/80 bg-elevated/40 px-2.5 py-2 hover:border-primary/40"
                    >
                      <span className="font-medium text-foreground">{entry.title}</span>
                      {entry.breadcrumbLabel && (
                        <span className="mt-0.5 block truncate text-[10px] text-muted">
                          {entry.breadcrumbLabel}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!boardMode && node.children.length > 0 && (
        <div className="space-y-2 border-t border-border/60 px-2 pb-2 pt-2">
          {node.children.map((child) => (
            <QuestCard
              key={child.id}
              node={child}
              campaignHandle={campaignHandle}
              tagsPageId={tagsPageId}
              playerPreview={playerPreview}
              calendarLike={calendarLike}
              nested
            />
          ))}
        </div>
      )}
    </div>
  );
}
