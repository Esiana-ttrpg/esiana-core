import { useCallback, useEffect, useState } from 'react';
import { deleteCalendarEvent, updateCalendarEvent } from '@/lib/calendarEventsApi';
import type {
  ConditionNode,
  MoonOverride,
  TimelineBaseEventRecord,
} from '@/lib/chronologyApi';
import { clampChronologyDate, type ChronologyDateParts } from '@/lib/chronologyDates';
import { calendarEpochMinuteForDate, type FantasyCalendarLike } from '@/lib/timeEngine';

export interface UseChronologyEventEditorOptions {
  campaignHandle: string;
  baseEvent: TimelineBaseEventRecord;
  calendarLike: FantasyCalendarLike;
  dateSeed?: ChronologyDateParts | null;
  onMutated?: () => void | Promise<void>;
  onDeleted?: () => void | Promise<void>;
}

function initialDateFromEvent(
  baseEvent: TimelineBaseEventRecord,
  calendarLike: FantasyCalendarLike,
  dateSeed?: ChronologyDateParts | null,
): ChronologyDateParts {
  const raw: ChronologyDateParts = dateSeed ?? {
    year: baseEvent.targetYear,
    month: baseEvent.targetMonth,
    day: baseEvent.targetDay,
  };
  return clampChronologyDate(calendarLike, raw);
}

export function useChronologyEventEditor({
  campaignHandle,
  baseEvent,
  calendarLike,
  dateSeed = null,
  onMutated,
  onDeleted,
}: UseChronologyEventEditorOptions) {
  const [categoryId, setCategoryId] = useState<string | 'none'>('none');
  const [description, setDescription] = useState('');
  const [prerequisiteId, setPrerequisiteId] = useState<string | 'none'>('none');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PARTY' | 'DM_ONLY'>('PARTY');
  const [duration, setDuration] = useState(1);
  const [isRepeating, setIsRepeating] = useState(false);
  const [repeatInterval, setRepeatInterval] = useState<number | ''>('');
  const [repeatUnit, setRepeatUnit] = useState<'DAYS' | 'MONTHS' | 'YEARS' | 'ERAS'>('DAYS');
  const [limitRepetitions, setLimitRepetitions] = useState<number | ''>('');
  const [conditions, setConditions] = useState<ConditionNode | null>(null);
  const [moonOverrides, setMoonOverrides] = useState<MoonOverride[] | null>(null);
  const [targetDate, setTargetDate] = useState<ChronologyDateParts>({
    year: 1,
    month: 0,
    day: 1,
  });
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetFromEvent = useCallback(() => {
    setCategoryId(baseEvent.categoryId ?? 'none');
    setDescription(baseEvent.description ?? '');
    setPrerequisiteId(baseEvent.prerequisiteId ?? 'none');
    setVisibility(baseEvent.visibility);
    setDuration(baseEvent.duration);
    setIsRepeating(baseEvent.isRepeating);
    setRepeatInterval(baseEvent.repeatInterval ?? '');
    setRepeatUnit(baseEvent.repeatUnit ?? 'DAYS');
    setLimitRepetitions(baseEvent.limitRepetitions ?? '');
    setConditions(baseEvent.conditions ?? null);
    setMoonOverrides((baseEvent.moonOverrides as MoonOverride[] | null) ?? null);
    setTargetDate(initialDateFromEvent(baseEvent, calendarLike, dateSeed));
    setError(null);
  }, [baseEvent, calendarLike, dateSeed]);

  useEffect(() => {
    resetFromEvent();
    setIsDirty(false);
  }, [
    baseEvent.id,
    baseEvent.updatedAt,
    dateSeed?.year,
    dateSeed?.month,
    dateSeed?.day,
    resetFromEvent,
  ]);

  useEffect(() => {
    setTargetDate((previous) => clampChronologyDate(calendarLike, previous));
  }, [calendarLike]);

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  const updateTargetDate = useCallback(
    (parts: ChronologyDateParts) => {
      setTargetDate(clampChronologyDate(calendarLike, parts));
      markDirty();
    },
    [calendarLike, markDirty],
  );

  const save = useCallback(async () => {
    const clamped = clampChronologyDate(calendarLike, targetDate);
    if (clamped.year === null || clamped.month === null || clamped.day === null) {
      setError('Please choose a valid event date.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateCalendarEvent(campaignHandle, baseEvent.calendarId, baseEvent.id, {
        categoryId: categoryId === 'none' ? null : categoryId,
        prerequisiteId:
          prerequisiteId === 'none' || prerequisiteId === baseEvent.id ? null : prerequisiteId,
        visibility,
        duration: Math.max(1, duration),
        isRepeating,
        repeatInterval: isRepeating ? (repeatInterval === '' ? null : repeatInterval) : null,
        repeatUnit: isRepeating ? repeatUnit : null,
        limitRepetitions: limitRepetitions === '' ? null : Math.max(1, Number(limitRepetitions)),
        conditions,
        moonOverrides,
        description: description.trim() || '',
        targetYear: clamped.year,
        targetMonth: clamped.month,
        targetDay: clamped.day,
        targetEpochMinute: calendarEpochMinuteForDate(
          calendarLike,
          clamped.year,
          clamped.month,
          clamped.day,
        ).toString(),
      });
      setIsDirty(false);
      await onMutated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save event changes.');
    } finally {
      setSaving(false);
    }
  }, [
    baseEvent,
    calendarLike,
    campaignHandle,
    categoryId,
    conditions,
    description,
    duration,
    isRepeating,
    limitRepetitions,
    moonOverrides,
    onMutated,
    prerequisiteId,
    repeatInterval,
    repeatUnit,
    targetDate,
    visibility,
  ]);

  const deleteEvent = useCallback(async () => {
    if (
      !window.confirm(
        `Delete "${baseEvent.title}"? This removes the event from all chronology views.`,
      )
    ) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await deleteCalendarEvent(campaignHandle, baseEvent.calendarId, baseEvent.id);
      await onDeleted?.();
      await onMutated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event.');
    } finally {
      setDeleting(false);
    }
  }, [baseEvent, campaignHandle, onDeleted, onMutated]);

  return {
    categoryId,
    setCategoryId: (value: string | 'none') => {
      setCategoryId(value);
      markDirty();
    },
    description,
    setDescription: (value: string) => {
      setDescription(value);
      markDirty();
    },
    prerequisiteId,
    setPrerequisiteId: (value: string | 'none') => {
      setPrerequisiteId(value);
      markDirty();
    },
    visibility,
    setVisibility: (value: 'PUBLIC' | 'PARTY' | 'DM_ONLY') => {
      setVisibility(value);
      markDirty();
    },
    duration,
    setDuration: (value: number) => {
      setDuration(value);
      markDirty();
    },
    isRepeating,
    setIsRepeating: (value: boolean) => {
      setIsRepeating(value);
      markDirty();
    },
    repeatInterval,
    setRepeatInterval: (value: number | '') => {
      setRepeatInterval(value);
      markDirty();
    },
    repeatUnit,
    setRepeatUnit: (value: 'DAYS' | 'MONTHS' | 'YEARS' | 'ERAS') => {
      setRepeatUnit(value);
      markDirty();
    },
    limitRepetitions,
    setLimitRepetitions: (value: number | '') => {
      setLimitRepetitions(value);
      markDirty();
    },
    conditions,
    setConditions: (value: ConditionNode | null) => {
      setConditions(value);
      markDirty();
    },
    moonOverrides,
    setMoonOverrides: (value: MoonOverride[] | null) => {
      setMoonOverrides(value);
      markDirty();
    },
    targetDate,
    setTargetDate: updateTargetDate,
    isDirty,
    saving,
    deleting,
    error,
    save,
    deleteEvent,
    resetFromEvent,
  };
}
