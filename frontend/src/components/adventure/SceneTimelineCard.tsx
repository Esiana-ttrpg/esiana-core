import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Lock } from 'lucide-react';
import type { SceneTimelineEntry } from '@shared/sceneTimelineProjection';
import { SceneBeatHeading } from '@/components/scene/SceneBeatHeading';
import {
  sceneTimelineCardClasses,
  sessionConfidenceLabel,
} from '@/lib/sceneTimelineVisualTokens';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';

interface SceneTimelineCardProps {
  campaignHandle: string;
  entry: SceneTimelineEntry;
  highlighted?: boolean;
  selected?: boolean;
  dragHandle?: ReactNode;
  onSelect?: () => void;
  /** When true, wiki link is secondary (Progression inline edit). */
  progressionContext?: boolean;
}

export function SceneTimelineCard({
  campaignHandle,
  entry,
  highlighted = false,
  selected = false,
  dragHandle,
  onSelect,
  progressionContext = false,
}: SceneTimelineCardProps) {
  const { flatPages } = useWiki();
  const confidenceLabel = sessionConfidenceLabel(entry.sessionConfidence);
  const waitingOn =
    entry.blockingScenes.length > 0
      ? `Waiting on ${entry.blockingScenes.map((scene) => scene.title).join(', ')}`
      : null;

  const cardBody = (
    <>
      <div className="flex items-start gap-2">
        {dragHandle}
        <div className="min-w-0 flex-1 space-y-1">
          <SceneBeatHeading
            title={entry.title}
            beatType={entry.beatType}
            titleClassName="text-sm font-medium text-foreground truncate"
            meta={
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {entry.sceneStatus}
                </span>
                {confidenceLabel ? (
                  <span className="rounded border border-dashed border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {confidenceLabel}
                  </span>
                ) : null}
                {entry.isBlocked ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                    <Lock className="size-3" aria-hidden />
                    Blocked
                  </span>
                ) : null}
              </div>
            }
          />
          {waitingOn ? (
            <p className="text-[10px] text-amber-700 dark:text-amber-300">{waitingOn}</p>
          ) : null}
          {progressionContext ? (
            <Link
              to={campaignWikiPath(campaignHandle, entry.id, flatPages)}
              className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              Open wiki
              <ExternalLink className="size-3" aria-hidden />
            </Link>
          ) : (
            <Link
              to={campaignWikiPath(campaignHandle, entry.id, flatPages)}
              className="text-[10px] text-primary hover:underline"
            >
              Open scene
            </Link>
          )}
        </div>
      </div>
    </>
  );

  const className = `${sceneTimelineCardClasses({
    sessionConfidence: entry.sessionConfidence,
    isBlocked: entry.isBlocked,
    sceneStatus: entry.sceneStatus,
  })} ${highlighted ? 'ring-2 ring-primary/40' : ''} ${selected ? 'ring-2 ring-primary/50' : ''}`;

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={`${className} w-full text-left transition-colors hover:border-primary/40`}
      >
        {cardBody}
      </button>
    );
  }

  return <article className={className}>{cardBody}</article>;
}
