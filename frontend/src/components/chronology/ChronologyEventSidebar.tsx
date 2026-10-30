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
import type { TimeTrackingBundle } from '@/lib/timeTrackingApi';

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
  calendarName?: string;
  timeBundle?: TimeTrackingBundle;
  comparisonContext?: import('react').ReactNode;
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
  comparisonContext,
  calendarName,
  timeBundle,
}: ChronologyEventSidebarProps) {
  if (!open || !baseEvent) return null;
  return (
    <ChronologyInspector title="Event details" selectionId={occurrence?.occurrenceId ?? baseEvent.id} onClose={onClose}>
      <div className="space-y-3 text-sm">
        {comparisonContext && <div className="space-y-1 text-xs text-muted">{comparisonContext}</div>}
        <p className="text-base font-semibold text-foreground">{baseEvent.title}</p>
        {canManage && onRevealEvent && (
          <button type="button" onClick={() => void onRevealEvent(baseEvent.id)}
            className="min-h-11 rounded border border-border px-3 text-xs text-muted hover:text-foreground">
            Reveal To Party
          </button>
        )}
          <ChronologyEventInlineDetail
            campaignHandle={campaignHandle}
            baseEvent={baseEvent}
            occurrence={occurrence}
            timeBundle={timeBundle}
            calendarName={calendarName}
            categories={categories}
            editableEvents={editableEvents}
            calendarLike={calendarLike}
            canManage={canManage}
            dateSeed={dateSeed}
            onMutated={onMutated}
            onDeleted={onDeleted}
          />
        {!calendarLike && <p className="text-xs text-muted">Calendar profile unavailable.</p>}
      </div>
      {categoryFooter && <div className="mt-4 border-t border-border pt-3">{categoryFooter}</div>}
    </ChronologyInspector>
  );
}
