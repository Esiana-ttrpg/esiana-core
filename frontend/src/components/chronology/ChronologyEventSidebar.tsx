import { ChronologyInspector } from './ChronologyInspector';
import { formatOccurrenceDateLabel } from '@/lib/chronologyDates';
import { ChronologyEventInlineDetail } from '@/components/chronology/ChronologyEventInlineDetail';
import type {
  TimelineBaseEventRecord,
  TimelineOccurrenceRecord,
  TimelineCategoryRecord,
} from '@/lib/chronologyApi';
import type { ChronologyDateParts } from '@/lib/chronologyDates';
import type { FantasyCalendarLike } from '@/lib/timeEngine';

interface ChronologyEventSidebarProps {
  campaignHandle: string;
  baseEvent: TimelineBaseEventRecord | null;
  categories: TimelineCategoryRecord[];
  editableEvents: TimelineBaseEventRecord[];
  calendarLike: FantasyCalendarLike | null;
  canManage: boolean;
  dateSeed?: ChronologyDateParts | null;
  occurrence?: TimelineOccurrenceRecord | null;
  open: boolean;
  onClose: () => void;
  onMutated?: () => void | Promise<void>;
  onDeleted?: () => void | Promise<void>;
  categoryFooter?: import('react').ReactNode;
  onRevealEvent?: (baseEventId: string) => void | Promise<void>;
}

export function ChronologyEventSidebar({
  campaignHandle,
  baseEvent,
  categories,
  editableEvents,
  calendarLike,
  canManage,
  dateSeed = null,
  occurrence = null,
  open,
  onClose,
  onMutated,
  onDeleted,
  categoryFooter,
  onRevealEvent,
}: ChronologyEventSidebarProps) {
  if (!open || !baseEvent) return null;
  return (
    <ChronologyInspector title="Event details" selectionId={occurrence?.occurrenceId ?? baseEvent.id} onClose={onClose}>
      <div className="space-y-3 text-sm">
        {occurrence && (
          <p className="text-xs text-muted">
            {formatOccurrenceDateLabel(occurrence.start)} to {formatOccurrenceDateLabel(occurrence.end)};
            {' '}{occurrence.duration} day(s)
          </p>
        )}
        <p className="text-base font-semibold text-foreground">{baseEvent.title}</p>
        {canManage && onRevealEvent && (
          <button type="button" onClick={() => void onRevealEvent(baseEvent.id)}
            className="min-h-11 rounded border border-border px-3 text-xs text-muted hover:text-foreground">
            Reveal To Party
          </button>
        )}
        {calendarLike ? (
          <ChronologyEventInlineDetail
            campaignHandle={campaignHandle}
            baseEvent={baseEvent}
            categories={categories}
            editableEvents={editableEvents}
            calendarLike={calendarLike}
            canManage={canManage}
            dateSeed={dateSeed}
            onMutated={onMutated}
            onDeleted={onDeleted}
          />
        ) : (
          <p className="text-xs text-muted">Calendar profile unavailable.</p>
        )}
      </div>
      {categoryFooter && <div className="mt-4 border-t border-border pt-3">{categoryFooter}</div>}
    </ChronologyInspector>
  );
}
