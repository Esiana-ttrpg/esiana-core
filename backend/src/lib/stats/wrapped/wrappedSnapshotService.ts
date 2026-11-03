import type {
  WrappedCalculationV1,
  WrappedYearResponse,
  WrappedYearSummary,
  WrappedYearsResponse,
} from '../../../../../shared/wrappedTypes.js';
import { WRAPPED_SCHEMA_VERSION } from '../../../../../shared/wrappedTypes.js';
import { prisma } from '../../prisma.js';
import { resolveEffectiveTimezone } from '../../timezone.js';
import { getOrCreateSystemSettings } from '../../systemSettings.js';
import {
  assembleAnnualWrapped,
  isWrappedYearEligible,
} from './assembleAnnualWrapped.js';
import { civilYearNow, resolveWrappedEdition } from './editionState.js';
import { reauthorizeWrappedPresentation } from './reauthorizeWrappedPresentation.js';

async function resolveReportingTimezone(userId: string): Promise<string> {
  const [user, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    }),
    getOrCreateSystemSettings(),
  ]);
  return resolveEffectiveTimezone({
    userTimezone: user?.timezone ?? null,
    systemDefaultTimezone: settings.defaultTimezone,
  });
}

function parseCalculation(payload: unknown): WrappedCalculationV1 {
  return payload as WrappedCalculationV1;
}

/**
 * Candidate years: from first plausible instrumentation year through current
 * local year. Eligibility is per-year via assembly / stored snapshots.
 */
export function candidateWrappedYears(timeZone: string, now: Date): number[] {
  const current = civilYearNow(timeZone, now);
  const earliest = 2026;
  const years: number[] = [];
  for (let y = earliest; y <= current; y += 1) years.push(y);
  return years;
}

export async function listWrappedYears(input: {
  userId: string;
  now?: Date;
}): Promise<WrappedYearsResponse> {
  const now = input.now ?? new Date();
  const timeZone = await resolveReportingTimezone(input.userId);
  const years = candidateWrappedYears(timeZone, now);

  const stored = await prisma.userWrappedSnapshot.findMany({
    where: { userId: input.userId, year: { in: years } },
    select: { year: true, edition: true, payload: true },
  });
  const byYear = new Map(stored.map((row) => [row.year, row]));

  const summaries: WrappedYearSummary[] = [];
  for (const year of years) {
    const edition = resolveWrappedEdition({ year, timeZone, now });
    const existing = byYear.get(year);
    if (existing && edition === 'completed') {
      const calc = parseCalculation(existing.payload);
      summaries.push({
        year,
        eligible: isWrappedYearEligible(calc),
        editionTier: calc.editionTier,
        edition,
        coverageDisclosure: calc.coverageDisclosure,
        reasons: isWrappedYearEligible(calc)
          ? []
          : ['insufficient_reliable_activity'],
      });
      continue;
    }

    // Preview years (or missing completed): assemble live for eligibility.
    const calc = await assembleAnnualWrapped({
      userId: input.userId,
      year,
      now,
    });
    summaries.push({
      year,
      eligible: isWrappedYearEligible(calc),
      editionTier: calc.editionTier,
      edition,
      coverageDisclosure: calc.coverageDisclosure,
      reasons: isWrappedYearEligible(calc)
        ? []
        : ['insufficient_reliable_activity'],
    });
  }

  return { version: 1, timeZone, years: summaries };
}

async function persistSnapshot(input: {
  userId: string;
  calc: WrappedCalculationV1;
  regenerated: boolean;
}): Promise<{ generatedAt: Date; regeneratedAt: Date | null }> {
  const now = new Date(input.calc.generatedAt);
  const existing = await prisma.userWrappedSnapshot.findUnique({
    where: {
      userId_year: { userId: input.userId, year: input.calc.year },
    },
  });

  if (!existing) {
    const created = await prisma.userWrappedSnapshot.create({
      data: {
        userId: input.userId,
        year: input.calc.year,
        schemaVersion: WRAPPED_SCHEMA_VERSION,
        edition: input.calc.edition,
        payload: input.calc as object,
        generatedAt: now,
      },
    });
    return { generatedAt: created.generatedAt, regeneratedAt: null };
  }

  const regeneratedAt = input.regenerated || existing.edition !== input.calc.edition
    ? now
    : existing.regeneratedAt;

  const updated = await prisma.userWrappedSnapshot.update({
    where: { id: existing.id },
    data: {
      schemaVersion: WRAPPED_SCHEMA_VERSION,
      edition: input.calc.edition,
      payload: input.calc as object,
      regeneratedAt,
      // Keep original generatedAt for completed unless first create.
      ...(existing.edition === 'preview' && input.calc.edition === 'completed'
        ? { generatedAt: now }
        : {}),
    },
  });
  return {
    generatedAt: updated.generatedAt,
    regeneratedAt: updated.regeneratedAt,
  };
}

export async function getWrappedYear(input: {
  userId: string;
  year: number;
  now?: Date;
}): Promise<WrappedYearResponse | { unavailable: true; summary: WrappedYearSummary }> {
  const now = input.now ?? new Date();
  const timeZone = await resolveReportingTimezone(input.userId);
  const edition = resolveWrappedEdition({
    year: input.year,
    timeZone,
    now,
  });

  const existing = await prisma.userWrappedSnapshot.findUnique({
    where: {
      userId_year: { userId: input.userId, year: input.year },
    },
  });

  let calc: WrappedCalculationV1;
  let generatedAt: Date;
  let regeneratedAt: Date | null;

  if (edition === 'completed' && existing?.edition === 'completed') {
    calc = parseCalculation(existing.payload);
    // Refresh edition field if stored under old clock, but keep metrics frozen.
    calc = { ...calc, edition: 'completed' };
    generatedAt = existing.generatedAt;
    regeneratedAt = existing.regeneratedAt;
  } else if (edition === 'preview') {
    calc = await assembleAnnualWrapped({
      userId: input.userId,
      year: input.year,
      now,
    });
    const saved = await persistSnapshot({
      userId: input.userId,
      calc,
      regenerated: false,
    });
    generatedAt = saved.generatedAt;
    regeneratedAt = saved.regeneratedAt;
  } else {
    // Year completed but no frozen snapshot yet — assemble once and freeze.
    calc = await assembleAnnualWrapped({
      userId: input.userId,
      year: input.year,
      now,
    });
    calc = { ...calc, edition: 'completed' };
    const saved = await persistSnapshot({
      userId: input.userId,
      calc,
      regenerated: false,
    });
    generatedAt = saved.generatedAt;
    regeneratedAt = saved.regeneratedAt;
  }

  if (!isWrappedYearEligible(calc)) {
    return {
      unavailable: true,
      summary: {
        year: input.year,
        eligible: false,
        editionTier: calc.editionTier,
        edition,
        coverageDisclosure: calc.coverageDisclosure,
        reasons: ['insufficient_reliable_activity'],
      },
    };
  }

  return reauthorizeWrappedPresentation({
    userId: input.userId,
    calculation: calc,
    generatedAt: generatedAt.toISOString(),
    regeneratedAt: regeneratedAt?.toISOString() ?? null,
  });
}

export async function regenerateWrappedYear(input: {
  userId: string;
  year: number;
  now?: Date;
}): Promise<WrappedYearResponse | { unavailable: true; summary: WrappedYearSummary }> {
  const now = input.now ?? new Date();
  const timeZone = await resolveReportingTimezone(input.userId);
  const edition = resolveWrappedEdition({
    year: input.year,
    timeZone,
    now,
  });

  let calc = await assembleAnnualWrapped({
    userId: input.userId,
    year: input.year,
    now,
  });
  calc = { ...calc, edition };

  const saved = await persistSnapshot({
    userId: input.userId,
    calc,
    regenerated: true,
  });

  if (!isWrappedYearEligible(calc)) {
    return {
      unavailable: true,
      summary: {
        year: input.year,
        eligible: false,
        editionTier: calc.editionTier,
        edition,
        coverageDisclosure: calc.coverageDisclosure,
        reasons: ['insufficient_reliable_activity'],
      },
    };
  }

  return reauthorizeWrappedPresentation({
    userId: input.userId,
    calculation: calc,
    generatedAt: saved.generatedAt.toISOString(),
    regeneratedAt: saved.regeneratedAt?.toISOString() ?? null,
  });
}
