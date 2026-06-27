import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PendingDevelopmentRow, WorldDevelopmentPresentation } from '@shared/worldDevelopmentPresentation';
import type { WorldDevelopmentSettings } from '@shared/worldDevelopmentMetadata';
import {
  fetchPendingDevelopments,
  resolveDevelopmentSuggestion,
  saveWorldDevelopmentSettings,
  suggestOnDemandDevelopments,
  type SuggestDevelopmentsResult,
} from '@/lib/worldDevelopmentApi';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { WorldDevelopmentStatusCard } from './WorldDevelopmentStatusCard';
import { WorldDevelopmentQuickControls } from './WorldDevelopmentQuickControls';
import { DevelopmentReadinessPanel } from './DevelopmentReadinessPanel';

interface DevelopmentsSectionProps {
  campaignHandle: string;
}

function suggestResultMessage(result: SuggestDevelopmentsResult): string | null {
  if (result.suggestionsCreated > 0) {
    return `Queued ${result.suggestionsCreated} development${result.suggestionsCreated === 1 ? '' : 's'}.`;
  }
  switch (result.skipReason) {
    case 'disabled':
      return 'World Development is off for this campaign.';
    case 'paused':
      return 'Development is paused — unpause to generate suggestions.';
    case 'no_pressure_signals':
      return 'No pressure signals yet. Set trajectories or world state on active factions.';
    case 'budget_exhausted':
      return 'World activity limit reached for this campaign month.';
    default:
      return 'No new developments matched current pressure signals (they may already be queued or on cooldown).';
  }
}

function RationalePanel({ lines }: { lines: PendingDevelopmentRow['rationale'] }) {
  if (lines.length === 0) return null;
  return (
    <details className="mt-2 text-xs text-muted-foreground">
      <summary className="cursor-pointer font-medium text-foreground">Why suggested</summary>
      <ul className="mt-1 list-disc space-y-0.5 pl-4">
        {lines.map((line, index) => (
          <li key={`${line.kind}-${index}`}>{line.text}</li>
        ))}
      </ul>
    </details>
  );
}

export function DevelopmentsSection({ campaignHandle }: DevelopmentsSectionProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WorldDevelopmentPresentation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pauseSaving, setPauseSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const presentation = await fetchPendingDevelopments(campaignHandle);
      setData(presentation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load developments');
    } finally {
      setLoading(false);
    }
  }, [campaignHandle]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleResolve(row: PendingDevelopmentRow, action: 'accept' | 'dismiss') {
    setBusyId(row.id);
    try {
      await resolveDevelopmentSuggestion(campaignHandle, row.id, {
        action,
        source: row.source,
        acceptTarget: row.proposedAcceptTarget ?? 'calendar_event',
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  async function handleSuggest() {
    setError(null);
    setInfo(null);
    try {
      const result = await suggestOnDemandDevelopments(campaignHandle);
      setInfo(suggestResultMessage(result));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suggest failed');
    }
  }

  async function handleTogglePause() {
    if (!data) return;
    setPauseSaving(true);
    setError(null);
    try {
      await saveWorldDevelopmentSettings(campaignHandle, {
        worldPressurePaused: !data.settings.paused,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pause toggle failed');
    } finally {
      setPauseSaving(false);
    }
  }

  function handleModeChange(_settings: WorldDevelopmentSettings) {
    void load();
  }

  if (loading) {
    return <LoadingSpinner label="Loading pending developments…" />;
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground">Failed to load developments.</p>;
  }

  const enabled = data.settings.enabled;
  const mode = data.status.mode;

  return (
    <div className="space-y-6">
      <WorldDevelopmentStatusCard campaignHandle={campaignHandle} status={data.status} />

      {mode !== 'off' ? (
        <WorldDevelopmentQuickControls
          campaignHandle={campaignHandle}
          mode={mode}
          onModeChange={handleModeChange}
        />
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={TYPE_DISPLAY_CLASS}>
            Pending Developments ({data.pendingCount})
          </h2>
          {mode !== 'off' ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                disabled={!enabled || pauseSaving}
                onClick={() => void handleSuggest()}
              >
                Suggest developments
              </button>
              <button
                type="button"
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
                disabled={pauseSaving}
                onClick={() => void handleTogglePause()}
              >
                {data.settings.paused ? 'Unpause development' : 'Pause development'}
              </button>
            </div>
          ) : null}
        </div>

        {info ? <p className="text-sm text-muted-foreground">{info}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {data.pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending developments.</p>
        ) : (
          <ul className="space-y-3">
            {data.pending.map((row) => (
              <li
                key={`${row.source}-${row.id}`}
                className={`rounded-lg border border-border bg-card p-4 ${row.parentSuggestionId ? 'ml-4 border-l-2 border-l-primary/40' : ''}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {row.scopeLabel && row.scopeHref ? (
                        <Link to={row.scopeHref} className="hover:text-primary">
                          {row.scopeLabel}
                        </Link>
                      ) : null}
                      {row.scopeLabel ? ' — ' : ''}
                      {row.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{row.kindLabel}</p>
                    {row.chainStageLabel ? (
                      <p className="text-xs text-muted-foreground">Stage: {row.chainStageLabel}</p>
                    ) : null}
                    {row.narrative ? (
                      <p className="mt-1 text-sm text-muted-foreground">{row.narrative}</p>
                    ) : null}
                    <RationalePanel lines={row.rationale} />
                  </div>
                  {row.canResolve ? (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
                        onClick={() => void handleResolve(row, 'accept')}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
                        onClick={() => void handleResolve(row, 'dismiss')}
                      >
                        Reject
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <DevelopmentReadinessPanel campaignHandle={campaignHandle} readiness={data.readiness} />
    </div>
  );
}
