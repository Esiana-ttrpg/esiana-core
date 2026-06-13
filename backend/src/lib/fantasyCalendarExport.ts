import { normalizeClimateAspect } from './climateAspect.js';
import {
  convertEpochToCalendarState,
  parseMonths,
  parseMoons,
  parseWeekdays,
  type FantasyCalendarLike,
} from './timeEngine.js';

export interface FantasyCalendarExportInput {
  name: string;
  epochOffset: bigint;
  weekdays: unknown;
  months: unknown;
  moons: unknown;
  seasons?: unknown;
  leapDays?: unknown;
  currentEpochMinute: bigint;
}

const MINUTES_PER_DAY = 24 * 60;

function slugifyFilename(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'calendar';
}

export function fantasyCalendarExportFilename(name: string): string {
  return `${slugifyFilename(name)}-fantasy-calendar.json`;
}

export function buildFantasyCalendarExportPayload(
  input: FantasyCalendarExportInput,
): Record<string, unknown> {
  const calendarLike: FantasyCalendarLike = {
    epochOffset: input.epochOffset,
    weekdays: input.weekdays,
    months: input.months,
    seasons: input.seasons ?? [],
    moons: input.moons,
    leapDays: input.leapDays ?? [],
  };

  const state = convertEpochToCalendarState(input.currentEpochMinute, calendarLike);
  const calendarMinute = input.currentEpochMinute - input.epochOffset;
  const dayEpoch = Number(calendarMinute / BigInt(MINUTES_PER_DAY));

  const months = parseMonths(input.months);
  const weekdays = parseWeekdays(input.weekdays);
  const moons = parseMoons(input.moons);

  const timespans = months.map((month) => {
    const row: Record<string, unknown> = {
      name: month.name,
      type: month.type === 'intercalary' ? 'intercalary' : 'month',
      length: month.length,
      interval: 1,
      offset: 0,
    };
    const aspect = normalizeClimateAspect(month.climateAspect);
    if (aspect !== 'NEUTRAL') {
      row.climateAspect = aspect;
    }
    return row;
  });

  const allUnitLength = weekdays.every((weekday) => weekday.length === 1);
  const globalWeek = allUnitLength
    ? weekdays.map((weekday) => weekday.name)
    : weekdays.map((weekday) => ({ name: weekday.name, length: weekday.length }));

  const moonsExport = moons.map((moon) => ({
    name: moon.name,
    cycle: String(Math.round(moon.cycleDays)),
    cycle_rounding: 'round',
    shift: '0',
    granularity: 24,
    color: '#07486c',
    shadow_color: '#292b4a',
    hidden: false,
  }));

  return {
    name: input.name,
    static_data: {
      year_data: {
        calendar_name: input.name,
        first_day: 1,
        overflow: false,
        global_week: globalWeek,
        timespans,
        leap_days: [],
        current_year: state.year,
        current_timespan: state.monthIndex,
        current_day: state.day,
      },
      moons: moonsExport,
      clock: {
        enabled: false,
        render: false,
        hours: 24,
        minutes: 60,
        offset: 0,
        crowding: 0,
      },
      seasons: {
        data: [],
        locations: [],
        global_settings: {
          season_offset: 0,
          weather_offset: 0,
          seed: 812771055,
          temp_sys: 'metric',
          wind_sys: 'metric',
          cinematic: false,
          enable_weather: false,
          periodic_seasons: true,
          color_enabled: false,
        },
      },
      eras: [],
      settings: {
        layout: 'grid',
        comments: 'none',
        show_current_month: false,
        private: false,
        allow_view: true,
        only_backwards: true,
        only_reveal_today: false,
        hide_moons: false,
        hide_clock: false,
        hide_events: false,
        hide_eras: false,
        hide_all_weather: false,
        hide_future_weather: false,
        add_month_number: true,
        add_year_day_number: false,
        default_category: -1,
      },
      cycles: {
        format: 'Transformation',
        data: [],
      },
    },
    dynamic_data: {
      year: state.year,
      timespan: state.monthIndex,
      day: state.day,
      epoch: dayEpoch,
      hour: state.hour,
      minute: state.minute,
      custom_location: false,
      location: null,
      current_era: 0,
    },
    events: [],
    categories: [],
  };
}
