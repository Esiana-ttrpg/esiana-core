import type { Prisma } from './prismaClient.js';

export type ChronologyEventVisibility = 'PUBLIC' | 'PARTY' | 'DM_ONLY';

export function chronologyVisibilityFilter(
  elevatedNarrativeView: boolean,
): Prisma.CalendarEventWhereInput {
  if (elevatedNarrativeView) {
    return {};
  }

  return {
    visibility: {
      in: ['PUBLIC', 'PARTY'],
    },
  };
}
