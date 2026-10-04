import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getDefaultSidebarConfig,
  toggleSidebarItem,
  type SidebarConfig,
} from '@/lib/sidebarConfig';
import { buildCoreNavigationCommands } from './coreNavigationCommands.js';
import type { CommandContext } from '../types.js';

function withSessionNotesDisabled(
  config: SidebarConfig = getDefaultSidebarConfig(),
): SidebarConfig {
  const notes = config.playOrder.find((row) => row.id === 'sessionNotes');
  if (!notes || !notes.enabled) return config;
  return toggleSidebarItem(config, 'play', 'sessionNotes');
}

function withProgressionDisabled(
  config: SidebarConfig = getDefaultSidebarConfig(),
): SidebarConfig {
  const progression = config.playOrder.find((row) => row.id === 'progression');
  if (!progression || !progression.enabled) return config;
  return toggleSidebarItem(config, 'play', 'progression');
}

function ctx(partial: Partial<CommandContext> = {}): CommandContext {
  return {
    campaignHandle: 'demo',
    campaignId: 'c1',
    pathname: '/campaigns/demo/dashboard',
    workspaceSegment: 'dashboard',
    can: () => true,
    resolveCategoryPageId: () => undefined,
    activePage: null,
    sidebarConfig: getDefaultSidebarConfig(),
    ...partial,
  };
}

describe('buildCoreNavigationCommands', () => {
  it('emits sessions, timeline, progression sections, and settings with sidebar section icons', () => {
    const commands = buildCoreNavigationCommands(ctx());
    assert.deepEqual(
      commands.map((c) => c.id),
      [
        'core.navigate.sessions',
        'core.navigate.timeline',
        'core.navigate.trajectories',
        'core.navigate.developments',
        'core.navigate.history',
        'core.navigate.settings',
      ],
    );
    assert.equal(commands[0]?.sidebarSectionId, 'sessionNotes');
    assert.equal(commands[1]?.sidebarSectionId, 'timeTracking');
    assert.equal(commands[2]?.sidebarSectionId, 'progression');
    assert.equal(commands[3]?.sidebarSectionId, 'progression');
    assert.equal(commands[4]?.sidebarSectionId, 'progression');
    assert.equal(commands[5]?.sidebarSectionId, 'settings');
  });

  it('omits Open Sessions when sessionNotes is hidden', () => {
    const commands = buildCoreNavigationCommands(
      ctx({ sidebarConfig: withSessionNotesDisabled() }),
    );
    assert.ok(!commands.some((c) => c.id === 'core.navigate.sessions'));
    assert.ok(commands.some((c) => c.id === 'core.navigate.timeline'));
  });

  it('omits progression commands when progression is hidden', () => {
    const commands = buildCoreNavigationCommands(
      ctx({ sidebarConfig: withProgressionDisabled() }),
    );
    assert.ok(!commands.some((c) => c.id === 'core.navigate.trajectories'));
    assert.ok(!commands.some((c) => c.id === 'core.navigate.developments'));
    assert.ok(!commands.some((c) => c.id === 'core.navigate.history'));
  });

  it('keeps timeline even when play sections are hidden', () => {
    const commands = buildCoreNavigationCommands(
      ctx({
        sidebarConfig: withProgressionDisabled(withSessionNotesDisabled()),
      }),
    );
    assert.ok(commands.some((c) => c.id === 'core.navigate.timeline'));
  });
});
