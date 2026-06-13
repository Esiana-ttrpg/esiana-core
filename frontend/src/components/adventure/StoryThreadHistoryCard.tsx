import { Link } from 'react-router-dom';
import type {
  StoryThreadHistoryEntry,
  StoryThreadHistoryMilestone,
} from '@shared/storyThreadHistoryProjection';
import { STORY_THREAD_MILESTONE_KINDS } from '@shared/storyThreadHistoryProjection';
import { ThreadKindBadge } from '@/components/thread/ThreadKindBadge';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import {
  diagnosticRuleLabel,
  formatDormantCopy,
  formatSessionsSinceLastTouch,
  FORESHADOWING_STAGE_LABELS,
  milestoneNodeClasses,
  milestoneUiLabel,
  threadCardEmphasisClasses,
} from '@/lib/storyThreadHistoryVisualTokens';
import { THREAD_NARRATIVE_WEIGHT_LABELS } from '@/lib/threadVisualTokens';

interface StoryThreadHistoryCardProps {
  campaignHandle: string;
  entry: StoryThreadHistoryEntry;
}

function MilestoneStepper({
  campaignHandle,
  entry,
}: {
  campaignHandle: string;
  entry: StoryThreadHistoryEntry;
}) {
  const { flatPages } = useWiki();
  const emphasis = threadCardEmphasisClasses(entry.visualEmphasis);

  return (
    <ol
      className={`mt-4 flex items-start gap-0 ${emphasis.stepper}`}
      aria-label={`${entry.title} progression`}
    >
      {STORY_THREAD_MILESTONE_KINDS.map((kind, index) => {
        const milestone =
          entry.milestones.find((item) => item.kind === kind) ??
          ({
            kind,
            sessionId: null,
            sessionTitle: null,
            sessionSequenceOrder: null,
            reached: false,
          } satisfies StoryThreadHistoryMilestone);

        const styles = milestoneNodeClasses(milestone, entry.visualEmphasis);
        const isLast = index === STORY_THREAD_MILESTONE_KINDS.length - 1;

        return (
          <li key={kind} className="flex min-w-0 flex-1 items-start">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
              <div
                className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold uppercase ${styles.node}`}
                aria-current={milestone.reached ? 'step' : undefined}
              >
                {milestone.reached ? '●' : '○'}
              </div>
              <span className={`text-[10px] font-medium uppercase tracking-wide ${styles.label}`}>
                {milestoneUiLabel(kind)}
              </span>
              <div className="min-h-[2rem] px-1 text-[10px] leading-snug text-muted-foreground">
                {!milestone.reached ? (
                  <span className="text-muted-foreground/60">—</span>
                ) : kind === 'payoff' && milestone.pageId ? (
                  <Link
                    to={campaignWikiPath(campaignHandle, milestone.pageId, flatPages)}
                    className="text-primary hover:underline"
                  >
                    {milestone.pageTitle ?? 'Payoff page'}
                  </Link>
                ) : milestone.sessionTitle ? (
                  <span>{milestone.sessionTitle}</span>
                ) : kind === 'resolved' && entry.stage === 'abandoned' ? (
                  <span>Abandoned</span>
                ) : (
                  <span className="text-muted-foreground/60">Recorded</span>
                )}
              </div>
            </div>
            {!isLast ? (
              <div
                className={`mt-3 h-px w-2 shrink-0 sm:w-4 ${styles.connector}`}
                aria-hidden
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function StoryThreadHistoryCard({ campaignHandle, entry }: StoryThreadHistoryCardProps) {
  const { flatPages } = useWiki();
  const emphasis = threadCardEmphasisClasses(entry.visualEmphasis);
  const sessionGap = formatSessionsSinceLastTouch({
    sessionsSinceLastTouch: entry.sessionsSinceLastTouch,
    lastTouchMilestoneKind: entry.lastTouchMilestoneKind,
  });
  const dormantCopy = formatDormantCopy(entry.sessionsSinceLastTouch);

  return (
    <article className={`rounded-lg border p-4 ${emphasis.card}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            to={campaignWikiPath(campaignHandle, entry.threadPageId, flatPages)}
            className={`block truncate hover:text-primary hover:underline ${emphasis.title}`}
          >
            {entry.title}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ThreadKindBadge kind={entry.threadKind} />
            <span className="rounded border border-border px-1.5 py-0.5 text-[9px] uppercase text-muted-foreground">
              {THREAD_NARRATIVE_WEIGHT_LABELS[entry.narrativeWeight]}
            </span>
            <span className="rounded border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground">
              {FORESHADOWING_STAGE_LABELS[entry.stage]}
            </span>
          </div>
        </div>
      </div>

      <MilestoneStepper campaignHandle={campaignHandle} entry={entry} />

      <div className="mt-3 space-y-1 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
        {sessionGap ? <p>{sessionGap}</p> : null}
        {dormantCopy && dormantCopy !== sessionGap ? <p>{dormantCopy}</p> : null}
        {entry.diagnosticRuleIds.length > 0 ? (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {entry.diagnosticRuleIds.map((ruleId) => (
              <span
                key={ruleId}
                className="rounded border border-amber-500/25 bg-amber-500/5 px-1.5 py-0.5 text-[9px] text-amber-200/90"
              >
                {diagnosticRuleLabel(ruleId)}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
