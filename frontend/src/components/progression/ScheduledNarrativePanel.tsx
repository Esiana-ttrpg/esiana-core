import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pause, Play, Trash2 } from 'lucide-react';
import type { NarrativeScheduledEffectDetail } from '@/lib/downtimeScheduledEffects';
import {
  archiveScheduledEffect,
  formatLastOutcomeLabel,
  listNarrativeScheduledEffects,
  updateScheduledEffect,
} from '@/lib/downtimeScheduledEffects';
import { SCHEDULED_EFFECT_KIND_LABELS } from '@shared/scheduledEffectMetadata';
import { campaignDowntimeHubPath, campaignProgressionPath, campaignSettingsPath } from '@/lib/campaignPaths';
import { AddScheduledNarrativeModal } from '@/components/progression/AddScheduledNarrativeModal';
import type { WikiTreeNode } from '@/types/wiki';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface ScheduledNarrativePanelProps {
  campaignHandle: string;
  organizationPages: WikiTreeNode[];
  canManage: boolean;
}

export function ScheduledNarrativePanel({
  campaignHandle,
  organizationPages,
  canManage,
}: ScheduledNarrativePanelProps) {
  const [schedules, setSchedules] = useState<NarrativeScheduledEffectDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listNarrativeScheduledEffects(campaignHandle);
      setSchedules(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load schedules.');
    } finally {
      setLoading(false);
    }
  }, [campaignHandle]);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  const activeSchedules = schedules.filter((schedule) => schedule.status !== 'archived');

  async function togglePause(schedule: NarrativeScheduledEffectDetail) {
    setBusyId(schedule.id);
    try {
      await updateScheduledEffect(campaignHandle, schedule.id, {
        status: schedule.status === 'paused' ? 'active' : 'paused',
      });
      await loadSchedules();
    } finally {
      setBusyId(null);
    }
  }

  async function handleArchive(schedule: NarrativeScheduledEffectDetail) {
    if (!window.confirm(`Archive "${schedule.title}"?`)) return;
    setBusyId(schedule.id);
    try {
      await archiveScheduledEffect(campaignHandle, schedule.id);
      await loadSchedules();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={TYPE_DISPLAY_CLASS}>Narrative schedules</h2>
          <p className="text-sm text-muted-foreground">
            Seasonal world-event and haven-threat prompts that fire when campaign time advances.
            Requires{' '}
            <Link
              to={campaignSettingsPath(campaignHandle, 'world-development')}
              className="text-primary hover:underline"
            >
              World Development
            </Link>{' '}
            to be enabled for suggestions to generate.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Treasury schedules live in{' '}
            <Link
              to={`${campaignDowntimeHubPath(campaignHandle)}?section=ledger`}
              className="text-primary hover:underline"
            >
              Downtime › Ledger
            </Link>
            .
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Plus className="size-3.5" />
            Add schedule
          </button>
        ) : null}
      </header>

      {loading ? (
        <LoadingSpinner label="Loading schedules…" />
      ) : error ? (
        <p className="text-sm text-red-300">{error}</p>
      ) : activeSchedules.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No narrative schedules yet. Add a seasonal prompt or recurring haven threat, then advance
          campaign time to see suggestions in{' '}
          <Link
            to={campaignProgressionPath(campaignHandle, 'developments')}
            className="text-primary hover:underline"
          >
            Developments
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-3">
          {activeSchedules.map((schedule) => {
            const lastOutcome = formatLastOutcomeLabel(
              schedule.lastOutcome,
              schedule.lastSuppressionReasonLabel,
            );

            return (
              <li
                key={schedule.id}
                className="rounded-lg border border-border/60 bg-background/60 px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{schedule.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {SCHEDULED_EFFECT_KIND_LABELS[schedule.effectKind]} ·{' '}
                      {schedule.recurrenceLabel}
                      {schedule.havenTitle ? ` · ${schedule.havenTitle}` : ''}
                    </p>
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
                </div>

                <dl className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                  <div>
                    <dt className="font-medium text-foreground/80">Last fired</dt>
                    <dd>{schedule.lastFiredAtLabel ?? 'Never'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground/80">Last outcome</dt>
                    <dd>{lastOutcome ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground/80">Next due</dt>
                    <dd>
                      {schedule.nextFireLabel ?? '—'}
                      {schedule.status === 'paused' ? ' (paused)' : ''}
                    </dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      )}

      <AddScheduledNarrativeModal
        open={isAddOpen}
        campaignHandle={campaignHandle}
        organizationPages={organizationPages}
        onClose={() => setIsAddOpen(false)}
        onSaved={loadSchedules}
      />
    </div>
  );
}
