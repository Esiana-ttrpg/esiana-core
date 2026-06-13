import { canViewWikiPage } from './wikiTree.js';
import type { CampaignMemberRole } from '../types/domain.js';

export function canViewMapAsset(
  visibility: string,
  role: CampaignMemberRole | null,
): boolean {
  return canViewWikiPage(visibility, role);
}
