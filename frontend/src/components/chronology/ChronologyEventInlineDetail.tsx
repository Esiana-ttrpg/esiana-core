import { Link } from 'react-router-dom';
import { VisibilityTierChipFromPage } from '@/components/narrative/VisibilityTierChip';
import { ChronologyEventManagePanel } from '@/components/chronology/ChronologyEventManagePanel';
import { ChronologyLoreLink } from '@/components/chronology/ChronologyLoreLink';
import { ConditionTreeReadOnly } from '@/components/chronology/ConditionTreeReadOnly';
import { campaignEventLorePath } from '@/lib/campaignPaths';
import type { TimelineBaseEventRecord, TimelineCategoryRecord } from '@/lib/chronologyApi';
import type { ChronologyDateParts } from '@/lib/chronologyDates';
import { truncateChronologyDescription } from '@/lib/chronologyText';
import type { FantasyCalendarLike } from '@/lib/timeEngine';

interface ChronologyEventInlineDetailProps {
  campaignHandle: string;
  baseEvent: TimelineBaseEventRecord;
  calendarName?: string;
  showConditions?: boolean;
  canManage?: boolean;
  categories?: TimelineCategoryRecord[];
  editableEvents?: TimelineBaseEventRecord[];
  calendarLike?: FantasyCalendarLike | null;
  dateSeed?: ChronologyDateParts | null;
  onMutated?: () => void | Promise<void>;
  onDeleted?: () => void | Promise<void>;
}

export function ChronologyEventInlineDetail({
  campaignHandle,
  baseEvent,
  calendarName,
  showConditions = true,
  canManage = false,
  categories = [],
  editableEvents = [],
  calendarLike = null,
  dateSeed = null,
  onMutated,
  onDeleted,
}: ChronologyEventInlineDetailProps) {
  const descriptionPreview = truncateChronologyDescription(baseEvent.description);

  return (
    <div className="space-y-3 border-t border-border pt-3" onClick={(event) => event.stopPropagation()}>
      <ChronologyLoreLink
        campaignHandle={campaignHandle}
        baseEventId={baseEvent.id}
        title={baseEvent.title}
        className="w-full"
      />

      {!canManage && descriptionPreview ? (
        <p className="text-xs text-foreground whitespace-pre-wrap">
          {descriptionPreview.text}
          {descriptionPreview.isTruncated ? (
            <>
              {'… '}
              <Link
                to={campaignEventLorePath(campaignHandle, baseEvent.id)}
                className="text-primary underline-offset-2 hover:underline"
              >
                Read Full Chronicle ↗
              </Link>
            </>
          ) : null}
        </p>
      ) : !canManage ? (
        <p className="text-xs text-muted">No description.</p>
      ) : null}

      <p className="text-[11px] text-muted">
        Tags: {baseEvent.tags.length ? baseEvent.tags.join(' ') : '—'}
      </p>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <dt className="text-muted">Visibility</dt>
        <dd className="text-foreground">
          <VisibilityTierChipFromPage pageVisibility={baseEvent.visibility} compact />
        </dd>
        <dt className="text-muted">Duration</dt>
        <dd className="text-foreground">{baseEvent.duration} day(s)</dd>
        {calendarName && (
          <>
            <dt className="text-muted">Calendar</dt>
            <dd className="text-foreground">{calendarName}</dd>
          </>
        )}
        {baseEvent.isRepeating && (
          <>
            <dt className="text-muted">Repeats</dt>
            <dd className="text-foreground">
              every {baseEvent.repeatInterval ?? '?'} {baseEvent.repeatUnit ?? 'DAYS'}
            </dd>
          </>
        )}
      </dl>

      {showConditions && !canManage && <ConditionTreeReadOnly value={baseEvent.conditions} />}

      {canManage && calendarLike ? (
        <ChronologyEventManagePanel
          campaignHandle={campaignHandle}
          baseEvent={baseEvent}
          categories={categories}
          editableEvents={editableEvents}
          calendarLike={calendarLike}
          canManage={canManage}
          dateSeed={dateSeed}
          onMutated={onMutated}
          onDeleted={onDeleted}
          variant="inline"
        />
      ) : null}
    </div>
  );
}
