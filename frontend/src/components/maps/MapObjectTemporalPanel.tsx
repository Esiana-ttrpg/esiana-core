import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useCallback, useEffect, useState } from 'react';
import type { MapSceneObjectDto } from '@/types/maps';
import type { TimeTrackingBundle } from '@/lib/timeTrackingApi';
import { FantasyDatePicker } from '@/components/chronology/FantasyDatePicker';
import type { ChronologyDateParts } from '@/lib/chronologyDates';
import {
  calendarLikeFromBundle,
  datePartsFromEpochMinute,
  epochFromDateParts,
  formatMapViewingLabel,
  temporalWindowHint,
} from '@/lib/mapSceneTemporal';
import {
  createMapObjectKeyframe,
  deleteMapObjectKeyframe,
  fetchMapObjectKeyframes,
  updateMapSceneObject,
  type MapObjectKeyframeSummaryDto,
} from '@/lib/mapScene';
import {
  MapObjectSemanticRole,
  parseMapFlowOverlayStyle,
  parseMapObjectOverlayStyle,
} from '@shared/mapOverlayTypes';
import {
  confirmMapFlowOverlay,
  regenerateMapFlowOverlay,
} from '@/lib/mapScene';

interface MapObjectTemporalPanelProps {
  campaignHandle: string;
  assetId: string;
  object: MapSceneObjectDto;
  viewEpochMinute: string | null;
  campaignEpochMinute: string | null;
  timeTracking: TimeTrackingBundle | null;
  /** Current drawn geometry for capture-at-date (must not PATCH base when recording keyframe). */
  captureGeometry?: unknown;
  onUpdated: () => void | Promise<void>;
}

export function MapObjectTemporalPanel({
  campaignHandle,
  assetId,
  object,
  viewEpochMinute,
  campaignEpochMinute,
  timeTracking,
  captureGeometry,
  onUpdated,
}: MapObjectTemporalPanelProps) {
  const [visibleFromParts, setVisibleFromParts] = useState<ChronologyDateParts | null>(null);
  const [visibleUntilParts, setVisibleUntilParts] = useState<ChronologyDateParts | null>(null);
  const [keyframes, setKeyframes] = useState<MapObjectKeyframeSummaryDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [semanticRole, setSemanticRole] = useState<string>(MapObjectSemanticRole.REGION);

  const calendar = calendarLikeFromBundle(timeTracking);
  const effectiveEpoch =
    viewEpochMinute ?? campaignEpochMinute ?? null;

  const loadKeyframes = useCallback(async () => {
    try {
      const list = await fetchMapObjectKeyframes(campaignHandle, object.id);
      setKeyframes(list);
    } catch {
      setKeyframes([]);
    }
  }, [campaignHandle, object.id]);

  useEffect(() => {
    const overlay = parseMapObjectOverlayStyle(object.style);
    setSemanticRole(overlay.semanticRole ?? MapObjectSemanticRole.REGION);
    setVisibleFromParts(
      object.visibleFromEpochMinute
        ? datePartsFromEpochMinute(
            object.visibleFromEpochMinute,
            timeTracking,
            campaignEpochMinute,
          )
        : null,
    );
    setVisibleUntilParts(
      object.visibleUntilEpochMinute
        ? datePartsFromEpochMinute(
            object.visibleUntilEpochMinute,
            timeTracking,
            campaignEpochMinute,
          )
        : null,
    );
    void loadKeyframes();
  }, [object, timeTracking, campaignEpochMinute, loadKeyframes]);

  const saveTemporalBounds = async () => {
    setBusy(true);
    setError(null);
    try {
      const visibleFromEpochMinute = visibleFromParts
        ? epochFromDateParts(visibleFromParts, timeTracking)
        : null;
      const visibleUntilEpochMinute = visibleUntilParts
        ? epochFromDateParts(visibleUntilParts, timeTracking)
        : null;
      const baseStyle = parseMapObjectOverlayStyle(object.style);
      await updateMapSceneObject(campaignHandle, assetId, object.id, {
        visibleFromEpochMinute,
        visibleUntilEpochMinute,
        style: {
          ...(typeof object.style === 'object' && object.style
            ? (object.style as Record<string, unknown>)
            : {}),
          ...baseStyle,
          semanticRole,
        },
      });
      await onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save temporal bounds');
    } finally {
      setBusy(false);
    }
  };

  const recordKeyframeAtViewDate = async () => {
    if (!effectiveEpoch) {
      setError('Set a viewing date on the map chronology bar first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body: {
        effectiveEpochMinute: string;
        geometryOverride?: unknown;
      } = { effectiveEpochMinute: effectiveEpoch };
      if (captureGeometry !== undefined) {
        body.geometryOverride = captureGeometry;
      }
      await createMapObjectKeyframe(campaignHandle, object.id, body);
      await loadKeyframes();
      await onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record keyframe');
    } finally {
      setBusy(false);
    }
  };

  const removeKeyframe = async (keyframeId: string) => {
    setBusy(true);
    setError(null);
    try {
      await deleteMapObjectKeyframe(campaignHandle, object.id, keyframeId);
      await loadKeyframes();
      await onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete keyframe');
    } finally {
      setBusy(false);
    }
  };

  const hint = temporalWindowHint(
    viewEpochMinute ?? campaignEpochMinute,
    object.visibleFromEpochMinute,
    object.visibleUntilEpochMinute,
    timeTracking,
    campaignEpochMinute,
  );

  const supportsKeyframes =
    object.kind === 'region' || object.kind === 'path';

  const territorySuggestion = parseMapObjectOverlayStyle(object.style).territorySuggestion;
  const flowOverlay = parseMapFlowOverlayStyle(object.style);
  const isDerivedFlow = Boolean(flowOverlay.flowKind || flowOverlay.weatherOverlay);

  const confirmOverlay = async () => {
    setBusy(true);
    setError(null);
    try {
      await confirmMapFlowOverlay(campaignHandle, assetId, object.id);
      await onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to confirm overlay');
    } finally {
      setBusy(false);
    }
  };

  const regenerateOverlay = async () => {
    setBusy(true);
    setError(null);
    try {
      await regenerateMapFlowOverlay(campaignHandle, assetId, object.id);
      await onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to regenerate overlay');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-border/80 bg-muted/5 p-3">
      <h3 className="text-sm font-semibold text-foreground">Temporal overlay</h3>
      <p className="text-xs text-muted">{hint}</p>
      {territorySuggestion ? (
        <p className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-1.5 text-xs text-cyan-100">
          Consequence suggested a territory update ({territorySuggestion.stance}) at{' '}
          {formatMapViewingLabel(
            territorySuggestion.atEpochMinute,
            campaignEpochMinute,
            timeTracking,
          )}
          . Use &quot;Record border at viewing date&quot; to confirm — geometry is not auto-changed.
        </p>
      ) : null}

      {isDerivedFlow ? (
        <div className="space-y-2 rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-2 text-xs">
          <p>
            <strong>Derivation:</strong>{' '}
            {flowOverlay.derivedFrom?.type ?? 'unknown'}
            {flowOverlay.derivationStatus ? ` · ${flowOverlay.derivationStatus}` : ''}
          </p>
          {flowOverlay.overlayTemporal ? (
            <p className="text-muted">
              Generated at{' '}
              {formatMapViewingLabel(
                flowOverlay.overlayTemporal.generatedAtEpoch,
                campaignEpochMinute,
                timeTracking,
              )}
              ; represents{' '}
              {formatMapViewingLabel(
                flowOverlay.overlayTemporal.representsEpoch,
                campaignEpochMinute,
                timeTracking,
              )}
            </p>
          ) : null}
          {flowOverlay.overlayLifecycle ? (
            <p className="text-muted">Lifecycle: {flowOverlay.overlayLifecycle}</p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            {object.revelation === 'DRAFT' ? (
              <button
                type="button"
                className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground disabled:opacity-50"
                disabled={busy}
                onClick={() => void confirmOverlay()}
              >
                Confirm overlay (DRAFT → REVEALED)
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted/10 disabled:opacity-50"
              disabled={busy}
              onClick={() => void regenerateOverlay()}
            >
              Regenerate
            </button>
          </div>
        </div>
      ) : null}

      {object.kind === 'region' || object.kind === 'path' ? (
        <label className="block text-sm">
          <span className="text-muted">Overlay role</span>
          <select
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            value={semanticRole}
            onChange={(e) => setSemanticRole(e.target.value)}
          >
            <option value={MapObjectSemanticRole.REGION}>Geographic region</option>
            <option value={MapObjectSemanticRole.POLITICAL_BORDER}>Political border</option>
            <option value={MapObjectSemanticRole.FRONTLINE}>Frontline</option>
            <option value={MapObjectSemanticRole.CLAIM}>Claim / occupation</option>
            <option value={MapObjectSemanticRole.MIGRATION_CORRIDOR}>Migration corridor</option>
            <option value={MapObjectSemanticRole.TRADE_ROUTE}>Trade route</option>
            <option value={MapObjectSemanticRole.TRAVEL_ROUTE}>Travel route</option>
            <option value={MapObjectSemanticRole.WEATHER_BAND}>Weather band</option>
          </select>
        </label>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <span className="text-xs font-medium text-muted">Visible from</span>
          {calendar ? (
            <div className="mt-1">
              <FantasyDatePicker
                calendar={calendar}
                value={visibleFromParts ?? { year: null, month: null, day: null }}
                onChange={setVisibleFromParts}
              />
            </div>
          ) : null}
          <button
            type="button"
            className="mt-1 text-xs text-primary hover:underline"
            onClick={() => setVisibleFromParts(null)}
          >
            Clear (always from start)
          </button>
        </div>
        <div>
          <span className="text-xs font-medium text-muted">Visible until</span>
          {calendar ? (
            <div className="mt-1">
              <FantasyDatePicker
                calendar={calendar}
                value={visibleUntilParts ?? { year: null, month: null, day: null }}
                onChange={setVisibleUntilParts}
              />
            </div>
          ) : null}
          <button
            type="button"
            className="mt-1 text-xs text-primary hover:underline"
            onClick={() => setVisibleUntilParts(null)}
          >
            Clear (no end)
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted/10 disabled:opacity-50"
          disabled={busy || !campaignEpochMinute}
          onClick={() => {
            if (campaignEpochMinute) {
              setVisibleUntilParts(
                datePartsFromEpochMinute(
                  campaignEpochMinute,
                  timeTracking,
                  campaignEpochMinute,
                ),
              );
            }
          }}
        >
          Until campaign present
        </button>
        <button
          type="button"
          className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground disabled:opacity-50"
          disabled={busy}
          onClick={() => void saveTemporalBounds()}
        >
          Save visibility window
        </button>
      </div>

      {supportsKeyframes ? (
        <div className="space-y-2 border-t border-border/60 pt-3">
          <h4 className={META_SECTION_LABEL_CLASS}>
            Keyframes (sparse overrides)
          </h4>
          <p className="text-xs text-muted">
            Record state as of{' '}
            <strong>
              {formatMapViewingLabel(
                viewEpochMinute,
                campaignEpochMinute,
                timeTracking,
              )}
            </strong>
            . For flow overlays, prefer style overrides (width/intensity) — spine geometry changes require supersession.
          </p>
          <button
            type="button"
            className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-100 disabled:opacity-50"
            disabled={busy || !effectiveEpoch}
            onClick={() => void recordKeyframeAtViewDate()}
          >
            Record at viewing date
            {captureGeometry !== undefined ? ' (current draw)' : ''}
          </button>
          {keyframes.length === 0 ? (
            <p className="text-xs text-muted">No keyframes yet.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {keyframes.map((kf) => (
                <li
                  key={kf.id}
                  className="flex items-center justify-between gap-2 rounded border border-border/60 px-2 py-1"
                >
                  <span>
                    {formatMapViewingLabel(
                      kf.effectiveEpochMinute,
                      campaignEpochMinute,
                      timeTracking,
                    )}
                    {kf.hasGeometryOverride ? ' · shape' : ''}
                    {kf.hasStyleOverride ? ' · style' : ''}
                  </span>
                  <button
                    type="button"
                    className="text-destructive hover:underline disabled:opacity-50"
                    disabled={busy}
                    onClick={() => void removeKeyframe(kf.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
