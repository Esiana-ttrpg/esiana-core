import { useEffect, useState } from 'react';
import { Plus, Pause, Play, Trash2 } from 'lucide-react';
import type { ScheduledTreasuryScheduleLine } from '@shared/downtimeHub';
import { archiveScheduledEffect, updateScheduledEffect } from '@/lib/downtimeScheduledEffects';
import { AddScheduledTreasuryModal } from '@/components/downtime/AddScheduledTreasuryModal';
import type { ScheduledTreasuryPrefill } from '@/lib/downtimeScheduledEffects';

interface ScheduledTreasuryPanelProps {
  schedules: ScheduledTreasuryScheduleLine[];
  campaignHandle: string;
  canManage: boolean;
  initialPrefill?: ScheduledTreasuryPrefill | null;
  onChanged: () => void | Promise<void>;
}

export function ScheduledTreasuryPanel({
  schedules,
  campaignHandle,
  canManage,
  initialPrefill,
  onChanged,
}: ScheduledTreasuryPanelProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [prefill, setPrefill] = useState<ScheduledTreasuryPrefill | null>(
    initialPrefill ?? null,
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (initialPrefill) {
      setPrefill(initialPrefill);
      setIsAddOpen(true);
    }
  }, [initialPrefill]);

  const activeSchedules = schedules.filter((schedule) => schedule.status !== 'archived');

  function openAddModal(nextPrefill?: ScheduledTreasuryPrefill | null) {
    setPrefill(nextPrefill ?? null);
    setIsAddOpen(true);
  }

  async function togglePause(schedule: ScheduledTreasuryScheduleLine) {
    setBusyId(schedule.id);
    try {
      await updateScheduledEffect(campaignHandle, schedule.id, {
        status: schedule.status === 'paused' ? 'active' : 'paused',
      });
      await onChanged();
    } finally {
      setBusyId(null);
    }
  }

  async function handleArchive(schedule: ScheduledTreasuryScheduleLine) {
    if (!window.confirm(`Archive "${schedule.title}"?`)) return;
    setBusyId(schedule.id);
    try {
      await archiveScheduledEffect(campaignHandle, schedule.id);
      await onChanged();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-background/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">Scheduled treasury</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Recurring upkeep and income become pending suggestions when campaign time advances.
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={() => openAddModal()}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Plus className="size-3.5" />
            Add schedule
          </button>
        ) : null}
      </div>

      {activeSchedules.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No recurring treasury schedules yet.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {activeSchedules.map((schedule) => (
            <li
              key={schedule.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-border/60 bg-background px-3 py-2"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground">{schedule.title}</p>
                <p className="text-xs text-muted-foreground">
                  {schedule.recurrenceLabel}
                  {schedule.amount != null ? ` · ${schedule.amount}` : ''}
                  {schedule.havenTitle ? ` · ${schedule.havenTitle}` : ''}
                </p>
                {schedule.nextFireLabel ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Next due {schedule.nextFireLabel}
                    {schedule.status === 'paused' ? ' (paused)' : ''}
                  </p>
                ) : null}
              </div>
              {canManage && schedule.canManage ? (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    disabled={busyId === schedule.id}
                    onClick={() => void togglePause(schedule)}
                    className="rounded p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50"
                    title={schedule.status === 'paused' ? 'Resume' : 'Pause'}
                  >
                    {schedule.status === 'paused' ? (
                      <Play className="size-3.5" />
                    ) : (
                      <Pause className="size-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === schedule.id}
                    onClick={() => void handleArchive(schedule)}
                    className="rounded p-1.5 text-muted-foreground hover:text-red-300 disabled:opacity-50"
                    title="Archive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <AddScheduledTreasuryModal
        open={isAddOpen}
        campaignHandle={campaignHandle}
        initialPrefill={prefill}
        onClose={() => setIsAddOpen(false)}
        onSaved={onChanged}
      />
    </div>
  );
}
