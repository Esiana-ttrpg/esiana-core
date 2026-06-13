import type { StoryViewId } from '@/lib/adventureLayout';
import type { ProgressionSectionId } from '@/lib/progressionLayout';

export type StoryVisibilityFilter = 'all' | 'party' | 'dm' | 'hidden';

export interface StoryFilterState {
  search?: string;
  visibility?: StoryVisibilityFilter;
  recent?: boolean;
}

export interface CampaignWorkspaceState {
  adventureStoryView?: StoryViewId;
  progressionSection?: ProgressionSectionId;
  progressionScenesView?: import('@shared/progressionHub').ScenesViewId;
  storyFilters?: StoryFilterState;
  threadsLens?: 'all' | 'activity';
}

const STORAGE_PREFIX = 'esiana:workspace:';

function storageKey(campaignHandle: string): string {
  return `${STORAGE_PREFIX}${campaignHandle}`;
}

export function readCampaignWorkspaceState(
  campaignHandle: string,
): CampaignWorkspaceState {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey(campaignHandle));
    if (!raw) return {};
    return JSON.parse(raw) as CampaignWorkspaceState;
  } catch {
    return {};
  }
}

export function writeCampaignWorkspaceState(
  campaignHandle: string,
  patch: Partial<CampaignWorkspaceState>,
): void {
  if (typeof window === 'undefined') return;
  try {
    const current = readCampaignWorkspaceState(campaignHandle);
    window.localStorage.setItem(
      storageKey(campaignHandle),
      JSON.stringify({ ...current, ...patch }),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function patchStoryView(campaignHandle: string, view: StoryViewId): void {
  writeCampaignWorkspaceState(campaignHandle, { adventureStoryView: view });
}

export function patchProgressionSection(
  campaignHandle: string,
  section: ProgressionSectionId,
): void {
  writeCampaignWorkspaceState(campaignHandle, { progressionSection: section });
}

export function patchProgressionScenesView(
  campaignHandle: string,
  view: import('@shared/progressionHub').ScenesViewId,
): void {
  writeCampaignWorkspaceState(campaignHandle, { progressionScenesView: view });
}

export function patchStoryFilters(
  campaignHandle: string,
  storyFilters: StoryFilterState,
): void {
  writeCampaignWorkspaceState(campaignHandle, { storyFilters });
}

export function patchThreadsLens(
  campaignHandle: string,
  threadsLens: 'all' | 'activity',
): void {
  writeCampaignWorkspaceState(campaignHandle, { threadsLens });
}
