import type { WrappedEdition } from '../../../../../shared/wrappedTypes.js';
import { prisma } from '../../prisma.js';
import { resolveEffectiveTimezone } from '../../timezone.js';
import { getOrCreateSystemSettings } from '../../systemSettings.js';
import {
  resolveSeasonalWrappedTargetYear,
  resolveWrappedEdition,
  wrappedInviteDismissKey,
} from './editionState.js';

export type WrappedSeasonalInviteResponse = {
  version: 1;
  active: boolean;
  year: number | null;
  edition: WrappedEdition | null;
  dismissKey: string | null;
  dismissed: boolean;
  timeZone: string;
};

export async function getWrappedSeasonalInvite(input: {
  userId: string;
  now?: Date;
}): Promise<WrappedSeasonalInviteResponse> {
  const now = input.now ?? new Date();
  const [user, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { timezone: true },
    }),
    getOrCreateSystemSettings(),
  ]);
  const timeZone = resolveEffectiveTimezone({
    userTimezone: user?.timezone ?? null,
    systemDefaultTimezone: settings.defaultTimezone,
  });

  const year = resolveSeasonalWrappedTargetYear({ timeZone, now });
  if (year == null) {
    return {
      version: 1,
      active: false,
      year: null,
      edition: null,
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

  return {
    version: 1,
    active: !dismissed,
    year,
    edition,
    dismissKey,
    dismissed,
    timeZone,
  };
}
