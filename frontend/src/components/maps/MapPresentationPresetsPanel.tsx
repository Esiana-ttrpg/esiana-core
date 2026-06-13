import { useState } from 'react';
import type { MapLayerDto, MapPresentationPresetDto } from '@/types/maps';
import type { TimeTrackingBundle } from '@/lib/timeTrackingApi';
import {
  createMapPresentationPreset,
  deleteMapPresentationPreset,
} from '@/lib/mapScene';
import {
  calendarLikeFromBundle,
  datePartsForMapViewing,
  epochMinuteFromDateParts,
} from '@/lib/mapViewingChronology';
import { FantasyDatePicker } from '@/components/chronology/FantasyDatePicker';
import type { ChronologyDateParts } from '@/lib/chronologyDates';

interface MapPresentationPresetsPanelProps {
  campaignHandle: string;
  assetId: string;
  presets: MapPresentationPresetDto[];
  layers: MapLayerDto[];
  viewEpochMinute: string | null;
  campaignEpochMinute: string | null;
  timeTracking: TimeTrackingBundle | null;
  onChanged: () => void | Promise<void>;
}

export function MapPresentationPresetsPanel({
  campaignHandle,
  assetId,
  presets,
  layers,
  viewEpochMinute,
  campaignEpochMinute,
  timeTracking,
  onChanged,
}: MapPresentationPresetsPanelProps) {
  const [label, setLabel] = useState('');
  const [draftParts, setDraftParts] = useState<ChronologyDateParts>(() =>
    datePartsForMapViewing(viewEpochMinute, campaignEpochMinute, timeTracking),
  );
  const [selectedLayerIds, setSelectedLayerIds] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const calendar = calendarLikeFromBundle(timeTracking);

  const toggleLayer = (layerId: string) => {
    setSelectedLayerIds((current) => {
      const next = new Set(current);
      if (next.has(layerId)) next.delete(layerId);
      else next.add(layerId);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!label.trim() || !calendar) return;
    const anchorEpochMinute = epochMinuteFromDateParts(draftParts, timeTracking);
    if (!anchorEpochMinute) return;
    setSaving(true);
    try {
      await createMapPresentationPreset(campaignHandle, assetId, {
        label: label.trim(),
        anchorEpochMinute,
        enabledLayerIds: [...selectedLayerIds],
        sortOrder: presets.length,
      });
      setLabel('');
      await onChanged();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (presetId: string) => {
    if (!window.confirm('Delete this era preset?')) return;
    await deleteMapPresentationPreset(campaignHandle, assetId, presetId);
    await onChanged();
  };

  const captureCurrentView = () => {
    setDraftParts(
      datePartsForMapViewing(viewEpochMinute, campaignEpochMinute, timeTracking),
    );
  };

  return (
    <section
      className="rounded-lg border border-border/60 bg-muted/5 px-3 py-2.5 text-sm"
      aria-label="Era presets editor"
    >
      <h2 className="font-medium text-foreground">Era presets</h2>
      <p className="mt-1 text-xs text-muted">
        Shortcuts for chronology scrubbing — anchor date plus optional default layer toggles.
      </p>

      {presets.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {presets.map((preset) => (
            <li
              key={preset.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/50 px-2 py-1"
            >
              <span>
                <span className="font-medium">{preset.label}</span>
                <span className="ml-2 text-xs text-muted">
                  anchor {preset.anchorEpochMinute}
                </span>
              </span>
              <button
                type="button"
                className="text-xs text-destructive hover:underline"
                onClick={() => void handleDelete(preset.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {calendar ? (
        <div className="mt-3 space-y-2 border-t border-border/40 pt-3">
          <label className="block text-xs font-medium text-muted">New preset</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Era name (e.g. Age of Ash)"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted/10"
              onClick={captureCurrentView}
            >
              Use current viewing date
            </button>
          </div>
          <FantasyDatePicker
            calendar={calendar}
            value={draftParts}
            onChange={setDraftParts}
          />
          {layers.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              <span className="w-full text-xs text-muted">Default layers when selected:</span>
              {layers.map((layer) => {
                const on = selectedLayerIds.has(layer.id);
                return (
                  <button
                    key={layer.id}
                    type="button"
                    className={`rounded-full border px-2 py-0.5 text-xs ${
                      on
                        ? 'border-border bg-muted/15'
                        : 'border-transparent text-muted opacity-60'
                    }`}
                    onClick={() => toggleLayer(layer.id)}
                  >
                    {layer.name}
                  </button>
                );
              })}
            </div>
          ) : null}
          <button
            type="button"
            disabled={saving || !label.trim()}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground disabled:opacity-50"
            onClick={() => void handleCreate()}
          >
            Add preset
          </button>
        </div>
      ) : null}
    </section>
  );
}
