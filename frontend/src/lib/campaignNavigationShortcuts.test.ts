import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CAMPAIGN_NAVIGATION_SHORTCUTS,
  eventOccursWithinTypingSurface,
  findCampaignNavigationShortcut,
  resolveCampaignNavigationDestination,
  shouldHandleCampaignNavigationKey,
} from './campaignNavigationShortcuts.js';

function keyboardEvent(overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    key: 'p', defaultPrevented: false, repeat: false, ctrlKey: false,
    metaKey: false, altKey: false, target: null, composedPath: () => [],
    ...overrides,
  } as KeyboardEvent;
}

describe('campaign navigation shortcut registry', () => {
  it('uses unique normalized keys and semantic destinations', () => {
    const keys = CAMPAIGN_NAVIGATION_SHORTCUTS.map((entry) => entry.key);
    const destinations = CAMPAIGN_NAVIGATION_SHORTCUTS.map((entry) => entry.destination);
    assert.equal(new Set(keys).size, keys.length);
    assert.equal(new Set(destinations).size, destinations.length);
    assert.ok(keys.every((key) => key === key.toLowerCase()));
    assert.ok(CAMPAIGN_NAVIGATION_SHORTCUTS.every((entry) => !('href' in entry)));
    assert.equal(findCampaignNavigationShortcut('P')?.destination, 'party');
  });

  it('resolves semantic destinations separately from presentation', () => {
    const expected = {
      party: '/campaigns/moon-tide/party', adventure: '/campaigns/moon-tide/adventures',
      downtime: '/campaigns/moon-tide/downtime', journals: '/campaigns/moon-tide/journals',
      sessionNotes: '/campaigns/moon-tide/notes', characters: '/campaigns/moon-tide/characters',
      organizations: '/campaigns/moon-tide/organizations', locations: '/campaigns/moon-tide/locations',
      maps: '/campaigns/moon-tide/maps', families: '/campaigns/moon-tide/families',
      relations: '/campaigns/moon-tide/relations', bestiary: '/campaigns/moon-tide/bestiary',
      timelines: '/campaigns/moon-tide/chronology?view=timeline',
      events: '/campaigns/moon-tide/chronology?view=events',
    } as const;
    for (const shortcut of CAMPAIGN_NAVIGATION_SHORTCUTS) {
      assert.equal(resolveCampaignNavigationDestination('moon-tide', shortcut.destination), expected[shortcut.destination]);
    }
  });

  it('returns null only for unavailable destinations or a missing campaign', () => {
    assert.equal(resolveCampaignNavigationDestination('', 'party'), null);
    assert.equal(resolveCampaignNavigationDestination('moon-tide', 'maps', {
      isDestinationAvailable: (destination) => destination !== 'maps',
    }), null);
    assert.equal(resolveCampaignNavigationDestination('moon-tide', 'maps'), '/campaigns/moon-tide/maps');
  });
});

describe('campaign navigation typing suppression', () => {
  it('detects a nested target through its closest typing surface', () => {
    const nested = {
      matches: () => false,
      closest: (selector: string) => selector.includes('[contenteditable]') ? ({} as Element) : null,
    } as unknown as Element;
    const event = keyboardEvent({ target: nested, composedPath: () => [nested] });
    assert.equal(eventOccursWithinTypingSurface(event), true);
    assert.equal(shouldHandleCampaignNavigationKey(event), false);
  });

  it('detects an editor ancestor from the composed path', () => {
    const child = { matches: () => false, closest: () => null } as unknown as Element;
    const editor = {
      matches: (selector: string) => selector.includes('.ProseMirror'), closest: () => null,
    } as unknown as Element;
    assert.equal(eventOccursWithinTypingSurface(keyboardEvent({ target: child, composedPath: () => [child, editor] })), true);
  });

  it('allows Shift but suppresses modifiers, repeats, and handled events', () => {
    assert.equal(shouldHandleCampaignNavigationKey(keyboardEvent({ shiftKey: true })), true);
    assert.equal(shouldHandleCampaignNavigationKey(keyboardEvent({ ctrlKey: true })), false);
    assert.equal(shouldHandleCampaignNavigationKey(keyboardEvent({ metaKey: true })), false);
    assert.equal(shouldHandleCampaignNavigationKey(keyboardEvent({ altKey: true })), false);
    assert.equal(shouldHandleCampaignNavigationKey(keyboardEvent({ repeat: true })), false);
    assert.equal(shouldHandleCampaignNavigationKey(keyboardEvent({ defaultPrevented: true })), false);
  });
});
