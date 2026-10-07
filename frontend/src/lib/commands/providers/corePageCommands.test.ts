import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getDefaultSidebarConfig } from '@/lib/sidebarConfig';
import { buildCorePageCommands } from './corePageCommands.js';
import type { ActivePageSnapshot, CommandContext } from '../types.js';

function ctx(activePage: ActivePageSnapshot | null): CommandContext {
  return {
    campaignHandle: 'demo',
    campaignId: 'c1',
    pathname: '/campaigns/demo/characters/yuna',
    workspaceSegment: 'characters',
    can: () => true,
    resolveCategoryPageId: () => undefined,
    activePage,
    sidebarConfig: getDefaultSidebarConfig(),
  };
}

const page: ActivePageSnapshot = {
  pageId: 'p1',
  title: 'Yuna',
  href: '/campaigns/demo/characters/yuna',
  canEdit: true,
  isEditing: false,
};

describe('buildCorePageCommands', () => {
  it('returns nothing when no active page', () => {
    assert.deepEqual(buildCorePageCommands(ctx(null)), []);
  });

  it('emits Edit and Copy link when canEdit and not editing', () => {
    const commands = buildCorePageCommands(ctx(page));
    assert.deepEqual(
      commands.map((c) => c.id),
      ['core.page.edit', 'core.page.copy-link'],
    );
    assert.equal(commands[0]?.label, 'Edit Yuna');
    assert.equal(commands[1]?.label, 'Copy link to Yuna');
  });

  it('omits Edit when canEdit is false', () => {
    const commands = buildCorePageCommands(
      ctx({ ...page, canEdit: false }),
    );
    assert.deepEqual(
      commands.map((c) => c.id),
      ['core.page.copy-link'],
    );
  });

  it('omits Edit when already editing', () => {
    const commands = buildCorePageCommands(
      ctx({ ...page, isEditing: true }),
    );
    assert.deepEqual(
      commands.map((c) => c.id),
      ['core.page.copy-link'],
    );
  });
});
