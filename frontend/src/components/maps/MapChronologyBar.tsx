import { useState } from 'react';
import { Calendar, X } from 'lucide-react';
import type { MapPresentationPresetDto } from '@/types/maps';
import type { TimeTrackingBundle } from '@/lib/timeTrackingApi';
import {
  calendarLikeFromBundle,
  datePartsForMapViewing,
  epochMinuteFromDateParts,
  formatMapViewingLabel,
  isViewingCampaignPresent,
} from '@/lib/mapViewingChronology';
import { FantasyDatePicker } from '@/components/chronology/FantasyDatePicker';
import type { ChronologyDateParts } from '@/lib/chronologyDates';

interface MapChronologyBarProps {
  viewEpochMinute: string | null;
  campaignEpochMinute: string | null;
  timeTracking: TimeTrackingBundle | null;
  canEdit: boolean;
  presentationPresets?: MapPresentationPresetDto[];
  activeEraPresetId?: string | null;
  onViewEpochMinuteChange: (value: string | null) => void;
  onSelectPreset?: (preset: MapPresentationPresetDto) => void;
}

export function MapChronologyBar({
  viewEpochMinute,
  campaignEpochMinute,
  timeTracking,
  canEdit,
  presentationPresets = [],
  activeEraPresetId = null,
  onViewEpochMinuteChange,
  onSelectPreset,
}: MapChronologyBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftParts, setDraftParts] = useState<ChronologyDateParts>(() =>
    datePartsForMapViewing(viewEpochMinute, campaignEpochMinute, timeTracking),
  );

  const viewingLabel = formatMapViewingLabel(
    viewEpochMinute,
    campaignEpochMinute,
    timeTracking,
  );
  const atPresent = isViewingCampaignPresent(viewEpochMinute, campaignEpochMinute);
  const calendar = calendarLikeFromBundle(timeTracking);

  const openPicker = () => {
    setDraftParts(
      datePartsForMapViewing(viewEpochMinute, campaignEpochMinute, timeTracking),
    );
    setPickerOpen(true);
  };

  const applyPicker = () => {
    const epoch = epochMinuteFromDateParts(draftParts, timeTracking);
    if (epoch) {
      onViewEpochMinuteChange(epoch);
    }
    setPickerOpen(false);
  };

  return (
    <>
      <section
        className="flex flex-col gap-2 border-y border-border/60 bg-muted/5 px-1 py-2.5"
        aria-label="Map chronology"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Calendar className="size-4 shrink-0 text-muted" aria-hidden />
            <span className="text-sm text-muted">Viewing</span>
            <span className="text-sm font-medium text-foreground">{viewingLabel}</span>
            {!atPresent ? (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                Historical
              </span>
            ) : null}
          </div>
          {canEdit ? (
            <div className="flex flex-wrap items-center gap-2">
              {!atPresent ? (
                <button
                  type="button"
                  className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted/10"
                  onClick={() => onViewEpochMinuteChange(null)}
                >
                  Return to present
                </button>
              ) : null}
              <button
                type="button"
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted/10"
                onClick={openPicker}
              >
                Change date
              </button>
            </div>
          ) : null}
        </div>

        {presentationPresets.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-muted">Eras</span>
            {presentationPresets.map((preset) => {
              const active = preset.id === activeEraPresetId;
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                    active
                      ? 'border-amber-500/50 bg-amber-500/15 font-medium text-amber-900 dark:text-amber-100'
                      : 'border-border bg-background hover:bg-muted/10'
                  }`}
                  onClick={() => {
                    if (onSelectPreset) {
                      onSelectPreset(preset);
                    } else {
                      onViewEpochMinuteChange(preset.anchorEpochMinute);
                    }
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      {pickerOpen && calendar ? (
        <div
          className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-surface p-4 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="map-date-picker-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h2 id="map-date-picker-title" className="text-lg font-semibold">
                  Map viewing date
                </h2>
                <p className="text-sm text-muted">
                  Show the map as it would appear at this point in your campaign chronology.
                </p>
              </div>
              <button
                type="button"
                className="rounded p-1 text-muted hover:bg-muted/10"
                onClick={() => setPickerOpen(false)}
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
            <FantasyDatePicker
              calendar={calendar}
              value={draftParts}
              onChange={setDraftParts}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted/10"
                onClick={() => setPickerOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground"
                onClick={applyPicker}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
