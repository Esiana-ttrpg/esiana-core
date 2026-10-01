import type { Prisma } from './prismaClient.js';

export type ChronologyEventVisibility = 'PUBLIC' | 'PARTY' | 'DM_ONLY';

export function chronologyVisibilityFilter(
  canManage: boolean,
): Prisma.CalendarEventWhereInput {
  if (canManage) {
    return {};
  }

  return {
    visibility: {
      in: ['PUBLIC', 'PARTY'],
    },
  };
}
