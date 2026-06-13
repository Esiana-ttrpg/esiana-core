import type { Prisma } from '@prisma/client';
import {
  parseClimateAspectFromImportRow,
  type ClimateAspect,
} from './climateAspect.js';

export type FantasyCalendarMonthType = 'standard' | 'intercalary';

export interface ParsedFantasyCalendarMonth {
  sourceIndex: number;
  name: string;
  length: number;
  type: FantasyCalendarMonthType;
  climateAspect: ClimateAspect;
}

export interface ParsedFantasyCalendarWeekday {
  name: string;
  length: number;
}

export interface ParsedFantasyCalendarMoon {
  name: string;
  cycleDays: number;
}

export interface ParsedFantasyCalendarResolvedDate {
  year: number;
  monthIndex: number;
  day: number;
  hour: number;
  minute: number;
}

export interface ParsedFantasyCalendarExport {
  calendarName: string;
  months: ParsedFantasyCalendarMonth[];
  weekdays: ParsedFantasyCalendarWeekday[];
  moons: ParsedFantasyCalendarMoon[];
  currentEpochMinute: bigint;
  resolvedDate: ParsedFantasyCalendarResolvedDate;
  warnings: string[];
}

export class FantasyCalendarImportError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message);
    this.name = 'FantasyCalendarImportError';
  }
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function parseCoercedNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseIntradayTime(
  dynamicData: Record<string, unknown> | null,
  staticData: Record<string, unknown> | null,
): { hour: number; minute: number } {
  const dynamicHour = parseCoercedNumber(dynamicData?.hour);
  const dynamicMinute = parseCoercedNumber(dynamicData?.minute);
  if (dynamicHour !== null || dynamicMinute !== null) {
    return {
      hour: Math.max(0, Math.floor(dynamicHour ?? 0)),
      minute: Math.max(0, Math.floor(dynamicMinute ?? 0)),
    };
  }

  const clock = asObject(staticData?.clock);
  if (clock) {
    const offset = parseCoercedNumber(clock.offset) ?? 0;
    const hoursPerDay = parseCoercedNumber(clock.hours) ?? 24;
    const minutesPerHour = parseCoercedNumber(clock.minutes) ?? 60;
    if (hoursPerDay > 0 && minutesPerHour > 0) {
      const totalMinutesPerDay = hoursPerDay * minutesPerHour;
      const normalized = ((offset % totalMinutesPerDay) + totalMinutesPerDay) % totalMinutesPerDay;
      return {
        hour: Math.floor(normalized / minutesPerHour),
        minute: normalized % minutesPerHour,
      };
    }
  }

  return { hour: 0, minute: 0 };
}

function computeEpochMinuteFromDate(
  months: ParsedFantasyCalendarMonth[],
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number,
): bigint {
  const daysPerYear = months.reduce((sum, month) => sum + month.length, 0);
  const safeYear = Math.max(1, year);
  const safeMonthIndex = Math.max(0, Math.min(monthIndex, months.length - 1));
  const daysBeforeSpan = months
    .slice(0, safeMonthIndex)
    .reduce((sum, month) => sum + month.length, 0);
  const dayOfYear = daysBeforeSpan + Math.max(1, day) - 1;
  const daysSinceEpoch = (safeYear - 1) * daysPerYear + dayOfYear;
  return (
    BigInt(daysSinceEpoch) * BigInt(24 * 60) +
    BigInt(hour) * BigInt(60) +
    BigInt(minute)
  );
}

export function parseFantasyCalendarExport(payload: unknown): ParsedFantasyCalendarExport {
  const warnings: string[] = [];
  let rootPayload = payload;
  if (asObject(payload)?.payload !== undefined) {
    rootPayload = asObject(payload)!.payload;
  }

  const root = asObject(rootPayload);
  if (!root) {
    throw new FantasyCalendarImportError('Expected JSON object payload.');
  }

  const staticData = asObject(root.static_data);
  const yearData = asObject(staticData?.year_data);
  const timespans = asArray(yearData?.timespans);
  const globalWeek = asArray(yearData?.global_week);
  const moonsRaw = asArray(staticData?.moons);
  const dynamicData = asObject(root.dynamic_data);

  if (timespans.length === 0 || globalWeek.length === 0) {
    throw new FantasyCalendarImportError(
      'Invalid Fantasy-Calendar export. Expected static_data.year_data.timespans and global_week arrays.',
    );
  }

  const months: ParsedFantasyCalendarMonth[] = timespans.map((entry, sourceIndex) => {
    const row = asObject(entry);
    const fallbackName = `Timespan ${sourceIndex + 1}`;
    if (!row) {
      warnings.push(`Skipped invalid timespan at index ${sourceIndex}; using placeholder.`);
      return {
        sourceIndex,
        name: fallbackName,
        length: 30,
        type: 'standard' as const,
        climateAspect: parseClimateAspectFromImportRow({}),
      };
    }

    const name = asString(row.name)?.trim() || fallbackName;
    const length =
      parseCoercedNumber(row.length) ?? parseCoercedNumber(row.timespan_length) ?? 0;
    const rawType = String(row.type ?? '').toLowerCase();
    const intercalaryFlag =
      rawType === 'intercalary' ||
      rawType === 'holiday' ||
      row.intercalary === true;
    const resolvedLength = length > 0 ? Math.max(1, Math.floor(length)) : 30;
    if (length <= 0) {
      warnings.push(`Timespan "${name}" at index ${sourceIndex} had invalid length; defaulted to ${resolvedLength}.`);
    }

    return {
      sourceIndex,
      name,
      length: resolvedLength,
      type: intercalaryFlag ? 'intercalary' : 'standard',
      climateAspect: parseClimateAspectFromImportRow(row),
    };
  });

  const weekdays: ParsedFantasyCalendarWeekday[] = globalWeek
    .map((entry, index) => {
      if (typeof entry === 'string') {
        const name = entry.trim();
        if (!name) return null;
        return { name, length: 1 };
      }
      const row = asObject(entry);
      if (!row) return null;
      const name = asString(row.name)?.trim();
      if (!name) return null;
      const length = parseCoercedNumber(row.length) ?? 1;
      return { name, length: Math.max(1, Math.floor(length)) };
    })
    .filter((weekday): weekday is ParsedFantasyCalendarWeekday => weekday !== null);

  const moons: ParsedFantasyCalendarMoon[] = moonsRaw
    .map((entry) => {
      const row = asObject(entry);
      if (!row) return null;
      const name = asString(row.name)?.trim();
      if (!name) return null;
      const cycle =
        parseCoercedNumber(row.cycle) ??
        parseCoercedNumber(row.orbit) ??
        parseCoercedNumber(row.cycle_length) ??
        0;
      if (!cycle || cycle <= 0) {
        warnings.push(`Skipped moon "${name}" due to invalid cycle.`);
        return null;
      }
      return { name, cycleDays: Math.max(1, Math.floor(cycle)) };
    })
    .filter((moon): moon is ParsedFantasyCalendarMoon => moon !== null);

  if (months.length === 0 || weekdays.length === 0) {
    throw new FantasyCalendarImportError(
      'Unable to derive valid months/weekdays from export. Please check that the export contains year_data.timespans and global_week.',
    );
  }

  const currentYear =
    parseCoercedNumber(dynamicData?.year) ??
    parseCoercedNumber(yearData?.current_year) ??
    1;
  const currentSpanIndex =
    parseCoercedNumber(dynamicData?.timespan) ??
    parseCoercedNumber(yearData?.current_timespan) ??
    0;
  const currentDay =
    parseCoercedNumber(dynamicData?.day) ??
    parseCoercedNumber(yearData?.current_day) ??
    1;
  const { hour, minute } = parseIntradayTime(dynamicData, staticData);

  const dynamicEpoch = parseCoercedNumber(dynamicData?.epoch);
  const currentEpochMinute =
    dynamicEpoch !== null
      ? BigInt(Math.floor(dynamicEpoch)) * BigInt(1440) +
        BigInt(hour) * BigInt(60) +
        BigInt(minute)
      : computeEpochMinuteFromDate(
          months,
          currentYear,
          currentSpanIndex,
          currentDay,
          hour,
          minute,
        );

  const calendarName =
    asString(yearData?.calendar_name)?.trim() ??
    asString(root.name)?.trim() ??
    'Imported Calendar';

  return {
    calendarName,
    months,
    weekdays,
    moons,
    currentEpochMinute,
    resolvedDate: {
      year: Math.max(1, Math.floor(currentYear)),
      monthIndex: Math.max(0, Math.floor(currentSpanIndex)),
      day: Math.max(1, Math.floor(currentDay)),
      hour,
      minute,
    },
    warnings,
  };
}

export function buildFantasyCalendarImportPreview(parsed: ParsedFantasyCalendarExport) {
  const intercalaryCount = parsed.months.filter((month) => month.type === 'intercalary').length;
  return {
    ok: true as const,
    calendarName: parsed.calendarName,
    monthCount: parsed.months.length,
    weekdayCount: parsed.weekdays.length,
    moonCount: parsed.moons.length,
    intercalaryCount,
    resolvedDate: parsed.resolvedDate,
    currentEpochMinute: parsed.currentEpochMinute.toString(),
    warnings: parsed.warnings,
  };
}

type FantasyCalendarImportTx = Pick<
  Prisma.TransactionClient,
  'fantasyCalendar' | 'campaign'
>;

export interface ApplyFantasyCalendarImportResult {
  calendarId: string;
  calendarName: string;
  isMasterTime: boolean;
  createdNewTimeline: boolean;
  currentEpochMinute: bigint;
}

export async function applyFantasyCalendarImport(
  tx: FantasyCalendarImportTx,
  campaignId: string,
  parsed: ParsedFantasyCalendarExport,
): Promise<ApplyFantasyCalendarImportResult> {
  const monthsForDb = parsed.months.map(({ name, length, type, climateAspect }) => ({
    name,
    length,
    type,
    climateAspect,
  }));

  const calendarJson = {
    weekdays: parsed.weekdays,
    months: monthsForDb,
    seasons: [] as const,
    moons: parsed.moons,
    leapDays: [] as const,
  };

  const existingCount = await tx.fantasyCalendar.count({ where: { campaignId } });
  const createAsMaster = existingCount === 0;

  const created = await tx.fantasyCalendar.create({
    data: {
      campaignId,
      name: parsed.calendarName,
      isMasterTime: createAsMaster,
      epochOffset: 0n,
      weekdays: calendarJson.weekdays as unknown as Prisma.InputJsonValue,
      months: calendarJson.months as unknown as Prisma.InputJsonValue,
      seasons: calendarJson.seasons as unknown as Prisma.InputJsonValue,
      moons: calendarJson.moons as unknown as Prisma.InputJsonValue,
      leapDays: calendarJson.leapDays as unknown as Prisma.InputJsonValue,
    },
  });

  let currentEpochMinute = parsed.currentEpochMinute;
  if (createAsMaster) {
    const updatedCampaign = await tx.campaign.update({
      where: { id: campaignId },
      data: { currentEpochMinute: parsed.currentEpochMinute },
      select: { currentEpochMinute: true },
    });
    currentEpochMinute = updatedCampaign.currentEpochMinute;
  } else {
    const campaign = await tx.campaign.findUniqueOrThrow({
      where: { id: campaignId },
      select: { currentEpochMinute: true },
    });
    currentEpochMinute = campaign.currentEpochMinute;
  }

  return {
    calendarId: created.id,
    calendarName: created.name,
    isMasterTime: createAsMaster,
    createdNewTimeline: !createAsMaster,
    currentEpochMinute,
  };
}
