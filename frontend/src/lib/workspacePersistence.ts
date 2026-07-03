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
  workshopSession?: WorkshopSessionState;
}

export type WorkshopRailMode = 'guide' | 'fields';

export type WorkshopLaneSaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface WorkshopTabSaveState {
  prose: WorkshopLaneSaveState;
  fields: WorkshopLaneSaveState;
}

export interface WorkshopSessionState {
  openDraftIds: string[];
  activeDraftId?: string;
  lastFromPageId?: string;
  railMode?: WorkshopRailMode;
  tabSaveStates?: Record<string, WorkshopTabSaveState>;
}

const MAX_OPEN_WORKSHOP_TABS = 8;

export function patchWorkshopSession(
  campaignHandle: string,
  workshopSession: WorkshopSessionState,
): void {
  writeCampaignWorkspaceState(campaignHandle, { workshopSession });
}

export function readWorkshopSession(campaignHandle: string): WorkshopSessionState {
  return readCampaignWorkspaceState(campaignHandle).workshopSession ?? {
    openDraftIds: [],
  };
}

export function addDraftToWorkshopSession(
  campaignHandle: string,
  draftId: string,
): WorkshopSessionState {
  const current = readWorkshopSession(campaignHandle);
  const openDraftIds = [
    draftId,
    ...current.openDraftIds.filter((id) => id !== draftId),
  ].slice(0, MAX_OPEN_WORKSHOP_TABS);
  const next = { ...current, openDraftIds, activeDraftId: draftId };
  patchWorkshopSession(campaignHandle, next);
  return next;
}

export function removeDraftFromWorkshopSession(
  campaignHandle: string,
  draftId: string,
): WorkshopSessionState {
  const current = readWorkshopSession(campaignHandle);
  const openDraftIds = current.openDraftIds.filter((id) => id !== draftId);
  const activeDraftId =
    current.activeDraftId === draftId ? openDraftIds[0] : current.activeDraftId;
  const next = { ...current, openDraftIds, activeDraftId };
  patchWorkshopSession(campaignHandle, next);
  return next;
}

export function patchWorkshopTabSaveState(
  campaignHandle: string,
  draftId: string,
  lane: 'prose' | 'fields',
  state: WorkshopLaneSaveState,
): void {
  const current = readWorkshopSession(campaignHandle);
  const tabSaveStates = { ...(current.tabSaveStates ?? {}) };
  const prev = tabSaveStates[draftId] ?? { prose: 'idle' as const, fields: 'idle' as const };
  tabSaveStates[draftId] = { ...prev, [lane]: state };
  patchWorkshopSession(campaignHandle, { ...current, tabSaveStates });
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
