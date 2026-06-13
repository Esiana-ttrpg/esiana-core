import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CampaignMomentumState } from '@shared/factionMomentumMetadata';
import type { WorldPressureProjection } from '@shared/worldPressureProjection';
import {
  CAMPAIGN_PACING_PANEL_TITLE,
  PAUSE_FORECASTING_HINT,
  PAUSE_FORECASTING_LABEL,
  PREVIEW_AT_EPOCH_DISCLAIMER,
  PREVIEW_AT_EPOCH_LABEL,
  SIMULATION_RECEIPTS_CHRONOLOGY_LINK,
  SIMULATION_RECEIPTS_EMPTY_MESSAGE,
  SIMULATION_RECEIPTS_LABEL,
  WORLD_PRESSURE_PAUSED_MESSAGE,
} from '@shared/worldPressurePresentation';
import {
  fetchPacingSimulationRuns,
  fetchWorldPressurePreview,
  updateCampaignMomentum,
  type PacingSimulationRunSummary,
} from '@/lib/progressionApi';
import { fetchTimeTracking } from '@/lib/timeTrackingApi';
import {
  campaignChronologyPath,
  campaignWorldAdvanceBatchPath,
  campaignWorldAdvancePath,
} from '@/lib/campaignPaths';
import { buildWorldPressurePreviewFromProjection } from '@/lib/worldPressurePreview';

interface CampaignPacingPanelProps {
  campaignHandle: string;
  momentumState: CampaignMomentumState;
  onMomentumChange: (state: CampaignMomentumState) => void;
  onProjectionReload: () => Promise<void>;
}

function formatEpochRange(previous: string, next: string): string {
  return `${previous} → ${next}`;
}

function sourceLabel(source: string): string {
  if (source === 'world_advance') return 'World advance';
  if (source === 'time_tracking') return 'Time tracking';
  return source;
}

export function CampaignPacingPanel({
  campaignHandle,
  momentumState,
  onMomentumChange,
  onProjectionReload,
}: CampaignPacingPanelProps) {
  const [pauseSaving, setPauseSaving] = useState(false);
  const [pauseError, setPauseError] = useState<string | null>(null);

  const [epochInput, setEpochInput] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewProjection, setPreviewProjection] = useState<WorldPressureProjection | null>(
    null,
  );

  const [runs, setRuns] = useState<PacingSimulationRunSummary[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [runsError, setRunsError] = useState<string | null>(null);

  const loadEpochDefault = useCallback(async () => {
    try {
      const tracking = await fetchTimeTracking(campaignHandle);
      setEpochInput(tracking.currentEpochMinute);
    } catch {
      /* optional default */
    }
  }, [campaignHandle]);

  const loadRuns = useCallback(async () => {
    setRunsLoading(true);
    setRunsError(null);
    try {
      const result = await fetchPacingSimulationRuns(campaignHandle);
      setRuns(result.runs);
    } catch (err) {
      setRunsError(err instanceof Error ? err.message : 'Failed to load simulation receipts');
    } finally {
      setRunsLoading(false);
    }
  }, [campaignHandle]);

  useEffect(() => {
    void loadEpochDefault();
    void loadRuns();
  }, [loadEpochDefault, loadRuns]);

  async function handlePauseToggle(checked: boolean) {
    setPauseSaving(true);
    setPauseError(null);
    try {
      const result = await updateCampaignMomentum(campaignHandle, {
        worldPressurePaused: checked,
      });
      onMomentumChange(result.state);
      await onProjectionReload();
      setPreviewProjection(null);
    } catch (err) {
      setPauseError(err instanceof Error ? err.message : 'Failed to update pacing');
    } finally {
      setPauseSaving(false);
    }
  }

  async function handlePreview() {
    const trimmed = epochInput.trim();
    if (!/^\d+$/.test(trimmed)) {
      setPreviewError('Enter a non-negative epoch minute.');
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const result = await fetchWorldPressurePreview(campaignHandle, trimmed);
      setPreviewProjection(result.projection);
    } catch (err) {
      setPreviewProjection(null);
      setPreviewError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setPreviewLoading(false);
    }
  }

  const previewPaused = momentumState.worldPressurePaused === true;
  const previewSummary =
    previewProjection != null
      ? buildWorldPressurePreviewFromProjection(previewProjection, {
          paused: previewPaused,
        })
      : null;

  return (
    <section className="space-y-6 rounded-md border border-border/60 bg-background/40 px-4 py-4">
      <h2 className="text-sm font-medium text-foreground">{CAMPAIGN_PACING_PANEL_TITLE}</h2>

      <div className="space-y-2">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={momentumState.worldPressurePaused === true}
            disabled={pauseSaving}
            onChange={(event) => void handlePauseToggle(event.target.checked)}
          />
          <span>
            <span className="text-sm font-medium text-foreground">{PAUSE_FORECASTING_LABEL}</span>
            <p className="mt-0.5 text-xs text-muted-foreground">{PAUSE_FORECASTING_HINT}</p>
          </span>
        </label>
        {pauseError ? <p className="text-xs text-red-400">{pauseError}</p> : null}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">{PREVIEW_AT_EPOCH_LABEL}</h3>
        <p className="text-xs text-muted-foreground">{PREVIEW_AT_EPOCH_DISCLAIMER}</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={epochInput}
            onChange={(event) => setEpochInput(event.target.value)}
            className="w-40 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            placeholder="Epoch minute"
          />
          <button
            type="button"
            onClick={() => void handlePreview()}
            disabled={previewLoading || previewPaused}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:border-primary/40 disabled:opacity-50"
          >
            {previewLoading ? 'Previewing…' : 'Preview'}
          </button>
        </div>
        {previewPaused ? (
          <p className="text-xs text-muted-foreground">{WORLD_PRESSURE_PAUSED_MESSAGE}</p>
        ) : null}
        {previewError ? <p className="text-xs text-red-400">{previewError}</p> : null}
        {previewProjection && !previewPaused ? (
          <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Era:{' '}
              <span className="font-medium text-foreground">
                {previewProjection.currentEra.name}
              </span>
            </p>
            {previewSummary ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {(previewSummary.projectedByNextSession?.bullets ??
                  previewSummary.nearFutureBullets ??
                  previewSummary.eraTrends).map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No forecast bullets at this epoch with current trajectories.
              </p>
            )}
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">{SIMULATION_RECEIPTS_LABEL}</h3>
        {runsLoading ? (
          <p className="text-xs text-muted-foreground">Loading receipts…</p>
        ) : runsError ? (
          <p className="text-xs text-red-400">{runsError}</p>
        ) : runs.length === 0 ? (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>{SIMULATION_RECEIPTS_EMPTY_MESSAGE}</p>
            <Link to={campaignWorldAdvancePath(campaignHandle)} className="text-primary hover:underline">
              Open World Advance
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {runs.map((run) => (
              <li
                key={run.id}
                className="rounded-md border border-border/60 bg-background/50 px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground">
                    {formatEpochRange(run.previousEpochMinute, run.nextEpochMinute)}
                  </span>
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {sourceLabel(run.source)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(run.createdAt))}
                  {run.advanceMagnitude ? ` · ${run.advanceMagnitude} advance` : ''}
                  {run.nearbySnapshotCount > 0
                    ? ` · ${run.nearbySnapshotCount} nearby snapshot${
                        run.nearbySnapshotCount === 1 ? '' : 's'
                      }`
                    : ''}
                </p>
                {run.hookSummaries.length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {run.hookSummaries.map((hook) => (
                      <li
                        key={`${run.id}-${hook.hookId}`}
                        className="rounded border border-border/80 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        title={hook.summary ?? undefined}
                      >
                        {hook.hookId.replace(/_/g, ' ')} · {hook.status}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {run.worldAdvanceChronologyEventId ? (
                  <Link
                    to={campaignWorldAdvanceBatchPath(
                      campaignHandle,
                      run.worldAdvanceChronologyEventId,
                    )}
                    className="mt-2 inline-block text-xs text-primary hover:underline"
                  >
                    View world advance batch
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <Link
          to={campaignChronologyPath(campaignHandle, 'feed')}
          className="text-xs text-primary hover:underline"
        >
          {SIMULATION_RECEIPTS_CHRONOLOGY_LINK}
        </Link>
      </div>
    </section>
  );
}
