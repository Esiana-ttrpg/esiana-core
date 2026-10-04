import {
  DEFAULT_PROGRESSION_SECTION,
  PROGRESSION_SECTIONS,
  isProgressionSectionId,
  type ProgressionSectionId,
} from '@shared/progressionHub';
import { readCampaignWorkspaceState } from '@/lib/workspacePersistence';

export {
  PROGRESSION_SECTIONS,
  DEFAULT_PROGRESSION_SECTION,
  isProgressionSectionId,
  type ProgressionSectionId,
};

export function readProgressionSectionFromSearch(
  search: string,
  campaignHandle?: string,
): ProgressionSectionId {
  const params = new URLSearchParams(search);
  const section = params.get('section');
  if (isProgressionSectionId(section)) {
    return section;
  }
  if (campaignHandle) {
    const sticky = readCampaignWorkspaceState(campaignHandle).progressionSection;
    if (isProgressionSectionId(sticky)) {
      return sticky;
    }
  }
  return DEFAULT_PROGRESSION_SECTION;
}

export function progressionSectionHref(
  basePath: string,
  section: ProgressionSectionId,
): string {
  const params = new URLSearchParams({ section });
  return `${basePath}?${params.toString()}`;
}
