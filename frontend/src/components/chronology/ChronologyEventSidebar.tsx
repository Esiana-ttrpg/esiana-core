import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { ChronologyEventInlineDetail } from '@/components/chronology/ChronologyEventInlineDetail';
import type {
  TimelineBaseEventRecord,
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
  open,
  onClose,
  onMutated,
  onDeleted,
  categoryFooter,
  onRevealEvent,
}: ChronologyEventSidebarProps) {
  return (
    <aside className="relative h-full border-l border-border bg-surface/20">
      <div
        inert={!open || !baseEvent}
        className={`absolute inset-0 flex flex-col transition-transform duration-300 ${
          open && baseEvent ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {baseEvent ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
              <div className="flex items-center justify-between">
                <h2 className={META_SECTION_LABEL_CLASS}>Event Details</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded border border-border px-2 py-0.5 text-[11px] text-muted hover:text-foreground"
                >
                  Close
                </button>
              </div>

              <p className="text-base font-semibold text-foreground">
                {baseEvent.title}
              </p>
              {canManage ? (
                <button
                  type="button"
                  onClick={() => void onRevealEvent?.(baseEvent.id)}
                  className="rounded border border-border px-2 py-0.5 text-[11px] text-muted hover:text-foreground"
                >
                  Reveal To Party
                </button>
              ) : null}

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
                <p className="text-xs text-muted">
                  Calendar profile unavailable for editing.
                </p>
              )}
            </div>

            {categoryFooter ? (
              <div className="shrink-0 border-t border-border bg-background/90 p-3">
                {categoryFooter}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {!open && (
        <div className="flex h-full items-center justify-center px-3 text-center text-xs text-muted">
          Select an event to open preview.
        </div>
      )}
    </aside>
  );
}
