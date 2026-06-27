import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useEffect, useState } from 'react';
import { AlertTriangle, Save, Trash2 } from 'lucide-react';
import { ChronologyDescriptionEditor } from '@/components/chronology/ChronologyDescriptionEditor';
import { ConditionTreeBuilder } from '@/components/chronology/ConditionTreeBuilder';
import { FantasyDatePicker } from '@/components/chronology/FantasyDatePicker';
import { MoonOverridesEditor } from '@/components/chronology/MoonOverridesEditor';
import { useChronologyEventEditor } from '@/hooks/useChronologyEventEditor';
import { dateSeedDiffersFromAnchor, type ChronologyDateParts } from '@/lib/chronologyDates';
import type {
  TimelineBaseEventRecord,
  TimelineCategoryRecord,
} from '@/lib/chronologyApi';
import type { FantasyCalendarLike } from '@/lib/timeEngine';

interface ChronologyEventManagePanelProps {
  campaignHandle: string;
  baseEvent: TimelineBaseEventRecord;
  categories: TimelineCategoryRecord[];
  editableEvents: TimelineBaseEventRecord[];
  calendarLike: FantasyCalendarLike;
  canManage: boolean;
  dateSeed?: ChronologyDateParts | null;
  onMutated?: () => void | Promise<void>;
  onDeleted?: () => void | Promise<void>;
  variant?: 'inline' | 'sidebar';
}

export function ChronologyEventManagePanel({
  campaignHandle,
  baseEvent,
  categories,
  editableEvents,
  calendarLike,
  canManage,
  dateSeed = null,
  onMutated,
  onDeleted,
  variant = 'inline',
}: ChronologyEventManagePanelProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    setAdvancedOpen(false);
  }, [baseEvent.id, baseEvent.updatedAt]);

  const editor = useChronologyEventEditor({
    campaignHandle,
    baseEvent,
    calendarLike,
    dateSeed,
    onMutated,
    onDeleted,
  });

  if (!canManage) {
    return null;
  }

  const showReanchorBanner = dateSeedDiffersFromAnchor(dateSeed, baseEvent);
  const isSidebar = variant === 'sidebar';

  return (
    <div
      className={`space-y-3 ${isSidebar ? '' : 'mt-3 rounded-lg border border-border bg-surface/30 p-3'}`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className={META_SECTION_LABEL_CLASS}>Manage event</h3>
        {editor.isDirty ? (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-200">
            Unsaved changes
          </span>
        ) : null}
      </div>

      <div className="space-y-2">
        <span className={META_SECTION_LABEL_CLASS}>Date</span>
        {showReanchorBanner ? (
          <div
            role="alert"
            className="flex gap-2 rounded-md border border-amber-500/50 bg-amber-950/40 px-3 py-2 text-xs text-amber-100"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden />
            <p>
              Moving this date re-anchors the <strong>entire</strong> continuous duration block (all
              days shift together).
            </p>
          </div>
        ) : null}
        <FantasyDatePicker
          calendar={calendarLike}
          value={editor.targetDate}
          onChange={editor.setTargetDate}
          disabled={editor.saving || editor.deleting}
        />
      </div>

      <label className="block space-y-1 text-xs">
        <span className="font-semibold text-muted">Category</span>
        <select
          value={editor.categoryId}
          onChange={(event) =>
            editor.setCategoryId(event.target.value === 'none' ? 'none' : event.target.value)
          }
          disabled={editor.saving || editor.deleting}
          className="block w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
        >
          <option value="none">Uncategorized</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-2 md:grid-cols-2">
        <label className="block space-y-1 text-xs">
          <span className="font-semibold text-muted">Duration (days)</span>
          <input
            type="number"
            min={1}
            value={editor.duration}
            onChange={(event) =>
              editor.setDuration(Math.max(1, Number(event.target.value) || 1))
            }
            disabled={editor.saving || editor.deleting}
            className="block w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
          />
        </label>
        <fieldset className="text-xs">
          <legend className="mb-1 font-semibold text-muted">Visibility</legend>
          <div className="flex flex-wrap gap-1">
            {(['PUBLIC', 'PARTY', 'DM_ONLY'] as const).map((value) => (
              <label
                key={value}
                className={`inline-flex cursor-pointer items-center rounded-full border px-2 py-0.5 text-[10px] ${
                  editor.visibility === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted'
                }`}
              >
                <input
                  type="radio"
                  name={`visibility-${baseEvent.id}-${variant}`}
                  value={value}
                  checked={editor.visibility === value}
                  onChange={() => editor.setVisibility(value)}
                  disabled={editor.saving || editor.deleting}
                  className="hidden"
                />
                {value}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <label className="block space-y-1 text-xs">
        <span className="font-semibold text-muted">Description</span>
        <ChronologyDescriptionEditor
          content={editor.description}
          onChange={editor.setDescription}
          minHeight={isSidebar ? 'min-h-[160px]' : 'min-h-[120px]'}
        />
      </label>

      <details
        className="rounded border border-border p-2"
        open={advancedOpen}
        onToggle={(event) => setAdvancedOpen((event.target as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer text-xs font-semibold text-muted">Advanced rules</summary>
        <label className="mt-2 block space-y-1 text-xs">
          <span className="font-semibold text-muted">Prerequisite</span>
          <select
            value={editor.prerequisiteId}
            onChange={(event) =>
              editor.setPrerequisiteId(
                event.target.value === 'none' ? 'none' : event.target.value,
              )
            }
            disabled={editor.saving || editor.deleting}
            className="block w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
          >
            <option value="none">None</option>
            {editableEvents
              .filter((event) => event.id !== baseEvent.id)
              .map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
          </select>
        </label>
        <label className="mt-2 flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={editor.isRepeating}
            onChange={(event) => editor.setIsRepeating(event.target.checked)}
            disabled={editor.saving || editor.deleting}
          />
          Repeating
        </label>
        {editor.isRepeating && (
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <input
              type="number"
              min={1}
              value={editor.repeatInterval}
              onChange={(event) =>
                editor.setRepeatInterval(
                  event.target.value ? Math.max(1, Number(event.target.value)) : '',
                )
              }
              placeholder="Interval"
              disabled={editor.saving || editor.deleting}
              className="rounded border border-border bg-background px-2 py-1 text-xs"
            />
            <select
              value={editor.repeatUnit}
              onChange={(event) =>
                editor.setRepeatUnit(
                  event.target.value as 'DAYS' | 'MONTHS' | 'YEARS' | 'ERAS',
                )
              }
              disabled={editor.saving || editor.deleting}
              className="rounded border border-border bg-background px-2 py-1 text-xs"
            >
              <option value="DAYS">DAYS</option>
              <option value="MONTHS">MONTHS</option>
              <option value="YEARS">YEARS</option>
              <option value="ERAS">ERAS</option>
            </select>
            <input
              type="number"
              min={1}
              value={editor.limitRepetitions}
              onChange={(event) =>
                editor.setLimitRepetitions(
                  event.target.value ? Math.max(1, Number(event.target.value)) : '',
                )
              }
              placeholder="Limit"
              disabled={editor.saving || editor.deleting}
              className="rounded border border-border bg-background px-2 py-1 text-xs"
            />
          </div>
        )}
        <ConditionTreeBuilder
          value={editor.conditions}
          onChange={editor.setConditions}
        />
        <MoonOverridesEditor
          value={editor.moonOverrides}
          onChange={editor.setMoonOverrides}
        />
      </details>

      {editor.error ? (
        <p className="rounded border border-red-900/50 bg-red-950/30 px-2 py-1.5 text-xs text-red-200">
          {editor.error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void editor.save()}
          disabled={editor.saving || editor.deleting}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-background hover:bg-primary-hover disabled:opacity-50"
        >
          <Save className="size-3.5" />
          {editor.saving ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() => void editor.deleteEvent()}
          disabled={editor.saving || editor.deleting}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-800/60 bg-red-950/40 px-3 py-2 text-xs font-medium text-red-200 hover:bg-red-950/70 disabled:opacity-50"
        >
          <Trash2 className="size-3.5" />
          {editor.deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
