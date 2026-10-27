import type { AuthenticatedRequest } from '../middleware/auth.js';
import { UserRoles } from '../types/domain.js';
import { assertAudio } from './audioCore.js';
import { appendSystemLog } from './systemLogBuffer.js';

/** Explicit disaster-recovery exception, restricted to the two site-admin backup endpoints.
 * Provider administration and ordinary content routes never use this override.
 */
export function authorizeAdminBackup(req: AuthenticatedRequest, campaignId?: string): void {
  assertAudio(req.user?.role === UserRoles.SYSTEM_ADMIN, 403, 'system_admin_required');
  appendSystemLog('warn', `Administrative backup content-access override: actor=${req.user.id} scope=${campaignId ? `campaign:${campaignId}` : 'system'}`);
}
