import { CLIMATE_LABELS } from '@/lib/calendarPresentation';
import type { ClimateAspect } from '@/lib/climateAspect';
import type { CalendarState } from '@/lib/timeEngine';

/** Configuration context only: never daily conditions or a forecast. */
export function CalendarClimateContext({
  climateAspect,
  days,
}: {
  climateAspect?: ClimateAspect;
  days?: Map<number, CalendarState>;
}) {
  const transitions = [...(days?.values() ?? [])].filter(
    (day, index, all) =>
      day.seasonName &&
      (index === 0 || all[index - 1].seasonName !== day.seasonName),
  );
  return (
    <div className="text-center text-xs text-muted">
      {climateAspect && (
        <details className="mb-2">
          <summary className="cursor-pointer">
            Monthly climate: {CLIMATE_LABELS[climateAspect].split(' / ')[0]}
          </summary>
          <p className="mt-1">{CLIMATE_LABELS[climateAspect]}</p>
        </details>
      )}
      {transitions.length > 0 && (
        <p className="mb-2">
          Season:{' '}
          {transitions
            .map((day) =>
              day.day === 1
                ? day.seasonName
                : `${day.seasonName} from day ${day.day}`,
            )
            .join(' · ')}
        </p>
      )}
    </div>
  );
}
