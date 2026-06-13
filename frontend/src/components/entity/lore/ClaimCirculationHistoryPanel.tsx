import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { LoreCirculationEdgeBadge } from '@/components/entity/lore/LoreKnowledgeUi';
import type { CalendarEventRecord } from '@/lib/calendarEventsApi';
import { fetchClaimCirculations, retractRumor } from '@/lib/rumorEngineApi';
import { formatMapViewingLabel } from '@/lib/mapViewingChronology';
import { fetchTimeTracking, type TimeTrackingBundle } from '@/lib/timeTrackingApi';
import type { LorePageLookup } from '@/lib/resolveLoreSourceDisplay';
import {
  CirculationEdgeKinds,
  type RumorCirculationRecord,
} from '@shared/rumorEngine';
import { computeActiveCirculations } from '@shared/rumorProjection';

function formatStance(stance: string, edgeKind: string): string {
  if (edgeKind === CirculationEdgeKinds.RETRACTION) return '—';
  return stance.charAt(0).toUpperCase() + stance.slice(1);
}

function resolveScopeLabel(
  row: RumorCirculationRecord,
  pageTitleById: Map<string, string>,
): string {
  const title = pageTitleById.get(row.targetRef);
  const kind = row.targetKind === 'region' ? 'Region' : 'Faction';
  return title ? `${title} (${kind})` : `${kind} · ${row.targetRef.slice(0, 8)}…`;
}

type ClaimCirculationHistoryPanelProps = {
  campaignHandle: string;
  claimId: string;
  flatPages: LorePageLookup[];
  calendarEvents?: CalendarEventRecord[];
  onChanged?: () => void;
};

export function ClaimCirculationHistoryPanel({
  campaignHandle,
  claimId,
  flatPages,
  calendarEvents = [],
  onChanged,
}: ClaimCirculationHistoryPanelProps) {
  const [circulations, setCirculations] = useState<RumorCirculationRecord[]>([]);
  const [timeTracking, setTimeTracking] = useState<TimeTrackingBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retractBusyId, setRetractBusyId] = useState<string | null>(null);

  const pageTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const page of flatPages) {
      map.set(page.id, page.title);
    }
    return map;
  }, [flatPages]);

  const eventTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const ev of calendarEvents) {
      if (ev.title?.trim()) map.set(ev.id, ev.title.trim());
    }
    return map;
  }, [calendarEvents]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [circRes, tracking] = await Promise.all([
        fetchClaimCirculations(campaignHandle, claimId),
        fetchTimeTracking(campaignHandle).catch(() => null),
      ]);
      setCirculations(circRes.circulations);
      setTimeTracking(tracking);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load circulation history');
      setCirculations([]);
    } finally {
      setLoading(false);
    }
  }, [campaignHandle, claimId]);

  useEffect(() => {
    void load();
  }, [load]);

  const asOfEpoch = timeTracking?.currentEpochMinute ?? '0';
  const activeIds = useMemo(() => {
    const active = computeActiveCirculations(circulations, asOfEpoch);
    return new Set(active.map((c) => c.id));
  }, [circulations, asOfEpoch]);

  async function handleRetract(circulationId: string) {
    setRetractBusyId(circulationId);
    try {
      await retractRumor(campaignHandle, circulationId);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retraction failed');
    } finally {
      setRetractBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-muted">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        Loading circulation history…
      </div>
    );
  }

  if (error) {
    return <p className="mt-2 text-xs text-destructive">{error}</p>;
  }

  if (circulations.length === 0) {
    return (
      <p className="mt-2 text-xs text-muted">
        No circulation events yet. Use Circulate… to record propagation in chronology.
      </p>
    );
  }

  return (
    <div className="mt-2 overflow-x-auto rounded-md border border-border/40">
      <table className="w-full min-w-[28rem] text-left text-xs">
        <thead>
          <tr className="border-b border-border/40 bg-muted/10 text-muted">
            <th className="px-2 py-1.5 font-medium">Time</th>
            <th className="px-2 py-1.5 font-medium">Event</th>
            <th className="px-2 py-1.5 font-medium">Scope</th>
            <th className="px-2 py-1.5 font-medium">Stance</th>
            <th className="px-2 py-1.5 font-medium w-28" />
          </tr>
        </thead>
        <tbody>
          {circulations.map((row) => {
            const timeLabel = formatMapViewingLabel(
              row.circulatedAtEpochMinute,
              timeTracking?.currentEpochMinute ?? null,
              timeTracking,
            );
            const chronologyTitle = eventTitleById.get(row.spreadEventId);
            const canRetract =
              row.edgeKind === CirculationEdgeKinds.CIRCULATION && activeIds.has(row.id);

            return (
              <tr key={row.id} className="border-b border-border/30 last:border-0">
                <td className="px-2 py-1.5 text-foreground whitespace-nowrap">
                  {timeLabel}
                  {chronologyTitle ? (
                    <span className="mt-0.5 block text-[10px] text-muted">{chronologyTitle}</span>
                  ) : null}
                </td>
                <td className="px-2 py-1.5">
                  <LoreCirculationEdgeBadge edgeKind={row.edgeKind} />
                  {row.supersedesCirculationId ? (
                    <p className="mt-0.5 text-[10px] text-muted">
                      corrects circulation {row.supersedesCirculationId.slice(0, 8)}…
                    </p>
                  ) : null}
                </td>
                <td className="px-2 py-1.5 text-foreground">
                  {resolveScopeLabel(row, pageTitleById)}
                </td>
                <td className="px-2 py-1.5 text-muted">
                  {formatStance(row.stance, row.edgeKind)}
                </td>
                <td className="px-2 py-1.5 text-right">
                  {canRetract ? (
                    <button
                      type="button"
                      disabled={retractBusyId === row.id}
                      className="text-[10px] font-medium text-amber-800 hover:underline disabled:opacity-50 dark:text-amber-200"
                      onClick={() => void handleRetract(row.id)}
                    >
                      {retractBusyId === row.id ? 'Retracting…' : 'Retract circulation'}
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
