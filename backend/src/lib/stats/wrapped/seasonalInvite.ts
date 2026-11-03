import { resolveWrappedInviteAvailability } from '../../../../../shared/wrapped/slideRegistry.js';
import type {
  WrappedCalculationV1,
  WrappedEdition,
  WrappedInviteAvailability,
} from '../../../../../shared/wrappedTypes.js';
import { prisma } from '../../prisma.js';
import { resolveEffectiveTimezone } from '../../timezone.js';
import { getOrCreateSystemSettings } from '../../systemSettings.js';
import { assembleAnnualWrapped } from './assembleAnnualWrapped.js';
import {
  resolveSeasonalWrappedTargetYear,
  resolveWrappedEdition,
  wrappedInviteDismissKey,
} from './editionState.js';
import { getWrappedFeatureFlags } from './wrappedFeatureFlags.js';

function parseStoredCalculation(payload: unknown): WrappedCalculationV1 {
  return payload as WrappedCalculationV1;
}

export type WrappedSeasonalInviteResponse = {
  version: 1;
  active: boolean;
  year: number | null;
  edition: WrappedEdition | null;
  /** Discovery state — does not gate `active` by itself. */
  availability: WrappedInviteAvailability | null;
  /**
   * Path for the CTA. Ready/limited → owner year viewer.
   * Unavailable → public /wrapped introduction (never a personalized 404).
   */
  href: string | null;
  dismissKey: string | null;
  dismissed: boolean;
  timeZone: string;
};

export async function getWrappedSeasonalInvite(input: {
  userId: string;
  now?: Date;
}): Promise<WrappedSeasonalInviteResponse> {
  const now = input.now ?? new Date();
  const [user, settings, flags] = await Promise.all([
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { timezone: true },
    }),
    getOrCreateSystemSettings(),
    getWrappedFeatureFlags(),
  ]);
  const timeZone = resolveEffectiveTimezone({
    userTimezone: user?.timezone ?? null,
    systemDefaultTimezone: settings.defaultTimezone,
  });

  if (!flags.wrappedEnabled) {
    return {
      version: 1,
      active: false,
      year: null,
      edition: null,
      availability: null,
      href: null,
      dismissKey: null,
      dismissed: false,
      timeZone,
    };
  }

  const year = resolveSeasonalWrappedTargetYear({ timeZone, now });
  if (year == null) {
    return {
      version: 1,
      active: false,
      year: null,
      edition: null,
      availability: null,
      href: null,
      dismissKey: null,
      dismissed: false,
      timeZone,
    };
  }

  const dismissKey = wrappedInviteDismissKey(year);
  const dismissal = await prisma.userHubAttentionDismissal.findUnique({
    where: {
      userId_dismissKey: { userId: input.userId, dismissKey },
    },
    select: { dismissKey: true },
  });

  // One dismiss key covers Dec preview and Jan completed for the target year.
  const dismissed = Boolean(dismissal);
  const edition = resolveWrappedEdition({ year, timeZone, now });

  // Match year-page selection: completed freeze when present, else live assembly.
  // Invite never persists — avoid snapshot side effects on banner fetch.
  const existing = await prisma.userWrappedSnapshot.findUnique({
    where: { userId_year: { userId: input.userId, year } },
    select: { edition: true, payload: true },
  });

  let calc: WrappedCalculationV1;
  if (edition === 'completed' && existing?.edition === 'completed') {
    calc = {
      ...parseStoredCalculation(existing.payload),
      edition: 'completed',
    };
  } else {
    calc = await assembleAnnualWrapped({
      userId: input.userId,
      year,
      now,
    });
  }

  const availability = resolveWrappedInviteAvailability(calc.editionTier);
  const href =
    availability === 'unavailable'
      ? '/wrapped'
      : `/users/${input.userId}/wrapped/${year}`;

  return {
    version: 1,
    // Stay active for discovery even when unavailable — CTA goes to /wrapped.
    active: !dismissed,
    year,
    edition,
    availability,
    href,
    dismissKey,
    dismissed,
    timeZone,
  };
}
