import {
  campaignAdventureHubPath,
  campaignChronologyPath,
  campaignDowntimeHubPath,
  campaignNotesPath,
  campaignPartyPath,
  campaignRelationsPath,
  campaignWorkspaceIndexPath,
} from '@/lib/campaignPaths';

export type CampaignNavigationDestination =
  | 'party'
  | 'adventure'
  | 'downtime'
  | 'journals'
  | 'sessionNotes'
  | 'characters'
  | 'organizations'
  | 'locations'
  | 'maps'
  | 'families'
  | 'relations'
  | 'bestiary'
  | 'timelines'
  | 'events';

export interface CampaignNavigationShortcut {
  key: string;
  destination: CampaignNavigationDestination;
  labelKey: string;
}

export const CAMPAIGN_NAVIGATION_SHORTCUTS = [
  { key: 'p', destination: 'party', labelKey: 'profile.profile.shortcuts.party' },
  { key: 'a', destination: 'adventure', labelKey: 'profile.profile.shortcuts.adventure' },
  { key: 'd', destination: 'downtime', labelKey: 'profile.profile.shortcuts.downtime' },
  { key: 'j', destination: 'journals', labelKey: 'profile.profile.shortcuts.journals' },
  { key: 's', destination: 'sessionNotes', labelKey: 'profile.profile.shortcuts.sessionNotes' },
  { key: 'c', destination: 'characters', labelKey: 'profile.profile.shortcuts.characters' },
  { key: 'o', destination: 'organizations', labelKey: 'profile.profile.shortcuts.organizations' },
  { key: 'l', destination: 'locations', labelKey: 'profile.profile.shortcuts.locations' },
  { key: 'm', destination: 'maps', labelKey: 'profile.profile.shortcuts.maps' },
  { key: 'f', destination: 'families', labelKey: 'profile.profile.shortcuts.families' },
  { key: 'r', destination: 'relations', labelKey: 'profile.profile.shortcuts.relations' },
  { key: 'b', destination: 'bestiary', labelKey: 'profile.profile.shortcuts.bestiary' },
  { key: 't', destination: 'timelines', labelKey: 'profile.profile.shortcuts.timelines' },
  { key: 'e', destination: 'events', labelKey: 'profile.profile.shortcuts.events' },
] as const satisfies readonly CampaignNavigationShortcut[];

const SHORTCUT_BY_KEY = new Map<string, CampaignNavigationShortcut>(
  CAMPAIGN_NAVIGATION_SHORTCUTS.map((shortcut) => [shortcut.key, shortcut]),
);

export function findCampaignNavigationShortcut(
  key: string,
): CampaignNavigationShortcut | undefined {
  return SHORTCUT_BY_KEY.get(key.toLowerCase());
}

export interface CampaignDestinationAvailability {
  isDestinationAvailable?: (destination: CampaignNavigationDestination) => boolean;
}

export function resolveCampaignNavigationDestination(
  campaignHandle: string,
  destination: CampaignNavigationDestination,
  availability: CampaignDestinationAvailability = {},
): string | null {
  if (!campaignHandle || availability.isDestinationAvailable?.(destination) === false) {
    return null;
  }

  switch (destination) {
    case 'party':
      return campaignPartyPath(campaignHandle);
    case 'adventure':
      return campaignAdventureHubPath(campaignHandle);
    case 'downtime':
      return campaignDowntimeHubPath(campaignHandle);
    case 'journals':
    case 'characters':
    case 'organizations':
    case 'locations':
    case 'maps':
    case 'families':
    case 'bestiary':
      return campaignWorkspaceIndexPath(campaignHandle, destination);
    case 'sessionNotes':
      return campaignNotesPath(campaignHandle);
    case 'relations':
      return campaignRelationsPath(campaignHandle);
    case 'timelines':
      return campaignChronologyPath(campaignHandle, 'timeline');
    case 'events':
      return campaignChronologyPath(campaignHandle, 'events');
  }
}

const TYPING_SURFACE_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable]',
  '[role="textbox"]',
  '[role="searchbox"]',
  '[role="combobox"]',
  '.ProseMirror',
  '[data-editor-root]',
  '[data-lexical-editor]',
  '[data-slate-editor]',
].join(',');

function nodeIsWithinTypingSurface(node: EventTarget | null): boolean {
  const candidate = node as Element | null;
  if (
    !candidate ||
    typeof candidate.matches !== 'function' ||
    typeof candidate.closest !== 'function'
  ) {
    return false;
  }
  return (
    candidate.matches(TYPING_SURFACE_SELECTOR) ||
    candidate.closest(TYPING_SURFACE_SELECTOR) != null
  );
}

export function eventOccursWithinTypingSurface(event: KeyboardEvent): boolean {
  if (typeof event.composedPath === 'function') {
    for (const node of event.composedPath()) {
      if (nodeIsWithinTypingSurface(node)) return true;
    }
  }
  if (nodeIsWithinTypingSurface(event.target)) return true;
  return (
    typeof document !== 'undefined' &&
    nodeIsWithinTypingSurface(document.activeElement)
  );
}

export function shouldHandleCampaignNavigationKey(event: KeyboardEvent): boolean {
  return !(
    event.defaultPrevented ||
    event.repeat ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    eventOccursWithinTypingSurface(event)
  );
}
