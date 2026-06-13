import type { FantasyCalendar } from '@prisma/client';
import type { TimeAdvanceUnit } from '../../../shared/timeAdvanceUnits.js';
import { isTimeAdvanceUnit } from '../../../shared/timeAdvanceUnits.js';
import {
  advanceCalendarByMonths,
  type CalendarShiftResult,
} from './timeEngine.js';
import { prisma } from './prisma.js';

const MINUTES_PER_DAY = 1440n;
const MINUTES_PER_WEEK = MINUTES_PER_DAY * 7n;

const DURATION_MULTIPLIERS: Record<Exclude<TimeAdvanceUnit, 'months'>, bigint> = {
  minutes: 1n,
  hours: 60n,
  days: MINUTES_PER_DAY,
  weeks: MINUTES_PER_WEEK,
};

export class NoMasterCalendarError extends Error {
  constructor() {
    super('NO_MASTER_CALENDAR');
    this.name = 'NoMasterCalendarError';
  }
}

export type TimeAdvanceResult = {
  nextEpochMinute: bigint;
  actualMinuteDelta: bigint;
  calendarShift?: CalendarShiftResult;
};

export async function resolveMasterFantasyCalendar(
  campaignId: string,
): Promise<FantasyCalendar | null> {
  return prisma.fantasyCalendar.findFirst({
    where: { campaignId, isMasterTime: true },
    orderBy: { name: 'asc' },
  });
}

export async function campaignHasMasterCalendar(campaignId: string): Promise<boolean> {
  const row = await prisma.fantasyCalendar.findFirst({
    where: { campaignId, isMasterTime: true },
    select: { id: true },
  });
  return Boolean(row);
}

export async function computeNextEpochMinute(input: {
  campaignId: string;
  currentEpochMinute: bigint;
  amount: number;
  unit: TimeAdvanceUnit;
}): Promise<TimeAdvanceResult> {
  const amount = Math.trunc(input.amount);
  if (amount <= 0) {
    throw new Error('INVALID_ADVANCE_AMOUNT');
  }

  if (input.unit === 'months') {
    const master = await resolveMasterFantasyCalendar(input.campaignId);
    if (!master) {
      throw new NoMasterCalendarError();
    }
    const calendarShift = advanceCalendarByMonths(
      input.currentEpochMinute,
      master,
      amount,
    );
    return {
      nextEpochMinute: calendarShift.nextEpochMinute,
      actualMinuteDelta: calendarShift.actualMinuteDelta,
      calendarShift,
    };
  }

  const multiplier = DURATION_MULTIPLIERS[input.unit];
  const actualMinuteDelta = BigInt(amount) * multiplier;
  return {
    nextEpochMinute: input.currentEpochMinute + actualMinuteDelta,
    actualMinuteDelta,
  };
}

export function parseAdvanceAmountAndUnit(body: unknown): {
  amount: number;
  unit: TimeAdvanceUnit;
} | null {
  if (body === null || typeof body !== 'object') {
    return null;
  }

  const payload = body as Record<string, unknown>;
  if (!isTimeAdvanceUnit(payload.unit)) {
    return null;
  }

  const amountNumber =
    typeof payload.amount === 'number'
      ? payload.amount
      : typeof payload.amount === 'string'
        ? Number(payload.amount)
        : NaN;

  if (!Number.isFinite(amountNumber)) {
    return null;
  }

  const truncated = Math.trunc(amountNumber);
  if (truncated <= 0) {
    return null;
  }

  return {
    amount: truncated,
    unit: payload.unit,
  };
}
