import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Calendar, X } from 'lucide-react';
import { FantasyDatePicker } from '@/components/chronology/FantasyDatePicker';
import { WikiPageTagsInput } from '@/components/wiki/WikiPageTagsInput';
import { TagIcon } from '@/components/wiki/TagIcon';
import { tagChipStyle } from '@/lib/resolveTagIcon';
import {
  formatQuestDateLabel,
  type QuestDateParts,
} from '@/lib/chronologyCalendar';
import {
  QUEST_STATUSES,
  QUEST_TYPE_PRESETS,
  type QuestMetadataFields,
  type QuestStatus,
} from '@/lib/questMetadata';
import type { FantasyCalendarLike } from '@/lib/timeEngine';
import type { WikiTag, WikiTagInput } from '@/types/wiki';

const fieldClass =
  'rounded-md border border-border bg-background text-foreground outline-none focus:border-primary/60';

const settingsInputClass = `${fieldClass} h-7 w-full min-w-0 px-2 py-0.5 text-xs`;

const settingsLabelClass =
  'text-[10px] font-medium uppercase tracking-wide text-muted';

interface QuestCardPropertiesProps {
  quest: QuestMetadataFields;
  tags: WikiTagInput[];
  calendarLike: FantasyCalendarLike;
  defaultDate: QuestDateParts;
  allCampaignTags: WikiTag[];
  disabled?: boolean;
  compact?: boolean;
  /** Page settings: single compact toolbar row. */
  horizontal?: boolean;
  questStatus?: QuestStatus;
  onQuestStatusChange?: (status: QuestStatus) => void;
  progressValue?: string;
  onProgressChange?: (value: string) => void;
  onProgressBlur?: () => void;
  fieldsDisabled?: boolean;
  onQuestPatch: (patch: Partial<QuestMetadataFields>) => Promise<void>;
  onTagsChange: (tags: WikiTagInput[]) => Promise<void>;
}

function SettingsField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`flex shrink-0 flex-col gap-0.5 ${className ?? ''}`}>
      <span className={settingsLabelClass}>{label}</span>
      {children}
    </label>
  );
}

export function QuestCardProperties({
  quest,
  tags,
  calendarLike,
  defaultDate,
  allCampaignTags,
  disabled = false,
  compact = false,
  horizontal = false,
  questStatus,
  onQuestStatusChange,
  progressValue = '',
  onProgressChange,
  onProgressBlur,
  fieldsDisabled = false,
  onQuestPatch,
  onTagsChange,
}: QuestCardPropertiesProps) {
  const listId = useId();
  const [typeDraft, setTypeDraft] = useState(quest.questType ?? '');
  const [dateOpen, setDateOpen] = useState(false);
  const [fieldSaving, setFieldSaving] = useState<'type' | 'date' | 'tags' | null>(
    null,
  );
  const datePopoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setTypeDraft(quest.questType ?? '');
  }, [quest.questType]);

  useEffect(() => {
    if (!dateOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!datePopoverRef.current || !target) return;
      if (!datePopoverRef.current.contains(target)) {
        setDateOpen(false);
      }
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [dateOpen]);

  const pickerValue = quest.questDate ?? defaultDate;
  const dateLabel = formatQuestDateLabel(quest.questDate, calendarLike);

  const tagInputs = useMemo(() => tags, [tags]);

  async function commitType() {
    const next = typeDraft.trim() || null;
    if (next === quest.questType) return;
    setFieldSaving('type');
    try {
      await onQuestPatch({ questType: next });
    } finally {
      setFieldSaving(null);
    }
  }

  async function commitDate(parts: QuestDateParts | null) {
    setFieldSaving('date');
    try {
      await onQuestPatch({ questDate: parts });
    } finally {
      setFieldSaving(null);
    }
  }

  async function handleTagsChange(next: WikiTagInput[]) {
    setFieldSaving('tags');
    try {
      await onTagsChange(next);
    } finally {
      setFieldSaving(null);
    }
  }

  if (disabled) {
    return (
      <div
        className={
          compact
            ? 'mt-2 flex flex-wrap items-center gap-1.5 text-[11px]'
            : 'mt-3 space-y-2 text-sm'
        }
      >
        {quest.questType && (
          <span className="rounded-md border border-border bg-elevated/60 px-2 py-0.5 text-muted">
            {quest.questType}
          </span>
        )}
        {dateLabel && (
          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-elevated/60 px-2 py-0.5 text-muted">
            <Calendar className="size-3" />
            {dateLabel}
          </span>
        )}
        {tagInputs.map((tag) => {
          const existing = allCampaignTags.find((t) => t.id === tag.id);
          const name = tag.name ?? existing?.name ?? '';
          const label = tag.label ?? existing?.label ?? name;
          return (
            <span
              key={tag.id ?? tag.name ?? label}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-elevated/60 px-2 py-0.5"
              style={tagChipStyle(existing?.color ?? null)}
            >
              <TagIcon
                name={name}
                icon={existing?.icon}
                iconAssetUrl={existing?.iconAssetUrl}
                className="size-3"
              />
              {label}
            </span>
          );
        })}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="mt-2 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            type="text"
            list={listId}
            value={typeDraft}
            disabled={fieldSaving === 'type'}
            onChange={(event) => setTypeDraft(event.target.value)}
            onBlur={() => void commitType()}
            placeholder="Type"
            className={`${fieldClass} h-7 min-w-[4.5rem] max-w-[6rem] px-1.5 text-[11px]`}
            aria-label="Quest type"
          />
          <datalist id={listId}>
            {QUEST_TYPE_PRESETS.map((preset) => (
              <option key={preset} value={preset} />
            ))}
          </datalist>

          <div className="relative" ref={datePopoverRef}>
            <button
              type="button"
              onClick={() => setDateOpen((open) => !open)}
              className={`inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-[11px] hover:border-primary/50 ${
                dateLabel ? 'text-foreground' : 'text-muted'
              }`}
            >
              <Calendar className="size-3 shrink-0" />
              {dateLabel ?? 'Date'}
            </button>
            {dateOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-border bg-background p-2 shadow-xl">
                <FantasyDatePicker
                  calendar={calendarLike}
                  value={pickerValue}
                  onChange={(parts) => void commitDate(parts)}
                />
                {quest.questDate && (
                  <button
                    type="button"
                    onClick={() => {
                      setDateOpen(false);
                      void commitDate(null);
                    }}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted hover:text-red-300"
                  >
                    <X className="size-3" />
                    Clear date
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <WikiPageTagsInput
          assignedTags={tagInputs}
          allCampaignTags={allCampaignTags}
          onChange={(next) => void handleTagsChange(next)}
          disabled={fieldSaving === 'tags'}
        />
      </div>
    );
  }

  if (horizontal) {
    const rowDisabled = disabled || fieldsDisabled;

    return (
      <div className="flex flex-wrap items-end gap-x-2 gap-y-1.5 border-b border-border pb-2">
        <SettingsField label="Type" className="w-[5.25rem]">
          <input
            type="text"
            list={listId}
            value={typeDraft}
            disabled={rowDisabled || fieldSaving === 'type'}
            onChange={(event) => setTypeDraft(event.target.value)}
            onBlur={() => void commitType()}
            placeholder="Main…"
            className={settingsInputClass}
          />
          <datalist id={listId}>
            {QUEST_TYPE_PRESETS.map((preset) => (
              <option key={preset} value={preset} />
            ))}
          </datalist>
        </SettingsField>

        {onQuestStatusChange && questStatus != null && (
          <SettingsField label="Status" className="w-[6.75rem]">
            <select
              className={settingsInputClass}
              value={questStatus}
              disabled={rowDisabled}
              onChange={(event) =>
                onQuestStatusChange(event.target.value as QuestStatus)
              }
            >
              {QUEST_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.replace('_', ' ')}
                </option>
              ))}
            </select>
          </SettingsField>
        )}

        {onProgressChange && (
          <SettingsField label="Progress" className="w-[7.5rem] sm:w-[9rem]">
            <input
              type="text"
              className={settingsInputClass}
              disabled={rowDisabled}
              value={progressValue}
              onChange={(event) => onProgressChange(event.target.value)}
              onBlur={() => onProgressBlur?.()}
              placeholder="Act II…"
            />
          </SettingsField>
        )}

        <SettingsField label="Date" className="w-[8.5rem] sm:w-[9.5rem]">
          <div className="relative" ref={datePopoverRef}>
            <button
              type="button"
              onClick={() => setDateOpen((open) => !open)}
              disabled={rowDisabled || fieldSaving === 'date'}
              title={
                quest.questDate
                  ? undefined
                  : 'Defaults to master calendar until changed'
              }
              className={`inline-flex h-7 w-full min-w-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-xs hover:border-primary/50 ${
                dateLabel ? 'text-foreground' : 'text-muted'
              }`}
            >
              <Calendar className="size-3 shrink-0" />
              <span className="truncate">{dateLabel ?? 'Date…'}</span>
            </button>
            {dateOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-border bg-background p-2 shadow-xl">
                <FantasyDatePicker
                  calendar={calendarLike}
                  value={pickerValue}
                  onChange={(parts) => void commitDate(parts)}
                />
                {quest.questDate && (
                  <button
                    type="button"
                    onClick={() => {
                      setDateOpen(false);
                      void commitDate(null);
                    }}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted hover:text-red-300"
                  >
                    <X className="size-3" />
                    Clear date
                  </button>
                )}
              </div>
            )}
          </div>
        </SettingsField>

        <SettingsField label="Tags" className="min-w-[8rem] flex-1">
          <WikiPageTagsInput
            assignedTags={tagInputs}
            allCampaignTags={allCampaignTags}
            onChange={(next) => void handleTagsChange(next)}
            disabled={rowDisabled || fieldSaving === 'tags'}
            compact
          />
        </SettingsField>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-b border-border pb-4">
      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted">Type</span>
        <input
          type="text"
          list={listId}
          value={typeDraft}
          disabled={fieldSaving === 'type'}
          onChange={(event) => setTypeDraft(event.target.value)}
          onBlur={() => void commitType()}
          placeholder="Main, Side, Character…"
          className={`${fieldClass} w-full px-2.5 py-1.5 text-sm`}
        />
        <datalist id={listId}>
          {QUEST_TYPE_PRESETS.map((preset) => (
            <option key={preset} value={preset} />
          ))}
        </datalist>
      </label>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted">Date</span>
          {quest.questDate && (
            <button
              type="button"
              onClick={() => void commitDate(null)}
              className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-red-300"
            >
              <X className="size-3" />
              Clear date
            </button>
          )}
        </div>
        <FantasyDatePicker
          calendar={calendarLike}
          value={pickerValue}
          disabled={fieldSaving === 'date'}
          onChange={(parts) => void commitDate(parts)}
        />
        {!quest.questDate && (
          <p className="text-[10px] text-muted">
            Showing master calendar current date until you change it.
          </p>
        )}
      </div>

      <div className="space-y-1">
        <span className="text-xs font-medium text-muted">Tags</span>
        <WikiPageTagsInput
          assignedTags={tagInputs}
          allCampaignTags={allCampaignTags}
          onChange={(next) => void handleTagsChange(next)}
          disabled={fieldSaving === 'tags'}
        />
      </div>
    </div>
  );
}
