import { useState } from 'react';
import { CalendarDays, ChevronDown, X } from 'lucide-react';
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
  const asOfLabel = atPresent ? 'Present' : viewingLabel;
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
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted transition-colors hover:bg-muted/10 hover:text-foreground disabled:cursor-default disabled:hover:bg-transparent"
        onClick={openPicker}
        disabled={!canEdit || !calendar}
        aria-label={canEdit ? `Map state as of ${asOfLabel}; change date` : `Map state as of ${asOfLabel}`}
      >
        <CalendarDays className="size-4" aria-hidden />
        <span>As of:</span>
        <span className="font-medium text-foreground">{asOfLabel}</span>
        {canEdit && calendar ? <ChevronDown className="size-3.5" aria-hidden /> : null}
      </button>

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
            {presentationPresets.length > 0 ? (
              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                  Saved eras
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {presentationPresets.map((preset) => {
                    const active = preset.id === activeEraPresetId;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                          active
                            ? 'border-amber-500/50 bg-amber-500/15 font-medium text-amber-900 dark:text-amber-100'
                            : 'border-border hover:bg-muted/10'
                        }`}
                        onClick={() => {
                          if (onSelectPreset) onSelectPreset(preset);
                          else onViewEpochMinuteChange(preset.anchorEpochMinute);
                          setPickerOpen(false);
                        }}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              {!atPresent ? (
                <button
                  type="button"
                  className="mr-auto rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted/10"
                  onClick={() => {
                    onViewEpochMinuteChange(null);
                    setPickerOpen(false);
                  }}
                >
                  Return to present
                </button>
              ) : null}
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
