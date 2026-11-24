import type { CreatorAttributionResponse } from '../../../../shared/statsTypes.js';
import {
  queryPersonalStatistics,
  toCreatorAttributionResponse,
} from './personal/queryPersonalStatistics.js';
export { assembleLifetimeAttributionMetrics } from './assembleLifetimeAttribution.js';

export async function buildUserCreatorAttribution(
  userId: string,
  viewerUserId?: string | null,
  options?: { includeOwnerHabits?: boolean },
): Promise<CreatorAttributionResponse> {
  const owner = options?.includeOwnerHabits === true;
  const payload = await queryPersonalStatistics({
    userId,
    viewerId: viewerUserId,
    visibility: owner ? 'owner' : 'public',
    range: { mode: 'all_time' },
    includeHabits: owner,
    skipPeriod: true,
  });
  return toCreatorAttributionResponse(payload);
}
