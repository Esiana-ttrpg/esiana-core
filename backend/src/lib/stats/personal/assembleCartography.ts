import {
  CARTOGRAPHY_DOMAINS,
  type CartographyDomain,
  type CartographyDomainStats,
  type PersonalStatisticsVisibility,
} from '../../../../../shared/statsTypes.js';
import {
  metricUnavailable,
  metricValue,
  type MetricValue,
} from '../../../../../shared/metricValue.js';
import {
  classifyWorldbuildingDomain,
  type WorldbuildingPageInput,
} from './assembleWorldbuilding.js';

export type CartographyCreatedRecord = {
  createdAt: Date;
};

export type CartographyPinRecord = CartographyCreatedRecord & {
  targetPage: WorldbuildingPageInput | null;
};

function inRange(at: Date, start: Date | null, end: Date): boolean {
  return at >= (start ?? new Date(0)) && at < end;
}

function periodField(
  value: MetricValue,
  input: {
    skipPeriod: boolean;
    visibility: PersonalStatisticsVisibility;
    tracked: boolean;
  },
): MetricValue {
  if (!input.tracked) return metricUnavailable('not_yet_tracked');
  if (input.skipPeriod) return metricUnavailable('not_yet_tracked');
  if (input.visibility !== 'owner') return metricUnavailable('private');
  return value;
}

function countCreated(rows: CartographyCreatedRecord[]): number {
  return rows.length;
}

function countPeriod(rows: CartographyCreatedRecord[], start: Date | null, end: Date): number {
  return rows.filter((row) => inRange(row.createdAt, start, end)).length;
}

export function isMappedLocationPin(pin: CartographyPinRecord): boolean {
  if (!pin.targetPage) return false;
  return classifyWorldbuildingDomain(pin.targetPage) === 'locations';
}

export function assembleCartographyStats(input: {
  maps: CartographyCreatedRecord[];
  markers: CartographyPinRecord[];
  regions: CartographyCreatedRecord[];
  layers: CartographyCreatedRecord[];
  labels: CartographyCreatedRecord[];
  periodEditsByDomain: Partial<Record<CartographyDomain, number>>;
  hasEditInstrumentation: boolean;
  rangeStart: Date | null;
  rangeEnd: Date;
  skipPeriod: boolean;
  visibility: PersonalStatisticsVisibility;
}): CartographyDomainStats[] {
  const locations = input.markers.filter(isMappedLocationPin);
  const created: Record<CartographyDomain, CartographyCreatedRecord[]> = {
    maps: input.maps,
    markers: input.markers,
    regions: input.regions,
    layers: input.layers,
    labels: input.labels,
    locationsMapped: locations,
  };

  return CARTOGRAPHY_DOMAINS.map((domain) => {
    const rows = created[domain];
    return {
      domain,
      created: metricValue(countCreated(rows)),
      periodCreated: periodField(
        metricValue(countPeriod(rows, input.rangeStart, input.rangeEnd)),
        {
          skipPeriod: input.skipPeriod,
          visibility: input.visibility,
          tracked: true,
        },
      ),
      periodEdited: periodField(metricValue(input.periodEditsByDomain[domain] ?? 0), {
        skipPeriod: input.skipPeriod,
        visibility: input.visibility,
        tracked: domain !== 'locationsMapped' && input.hasEditInstrumentation,
      }),
    };
  });
}
