import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { CampaignCapabilities } from '@shared/campaignPolicy/capabilities';
import {
  clearCommandProviders,
  listCommandProviders,
  registerCommandProvider,
  resolveCommands,
} from './commandRegistry.js';
import type { Command, CommandContext, CommandProvider } from './types.js';

function baseCtx(
  partial: Partial<CommandContext> = {},
): CommandContext {
  return {
    campaignHandle: 'demo',
    campaignId: 'c1',
    pathname: '/campaigns/demo/dashboard',
    workspaceSegment: 'dashboard',
    can: () => true,
    resolveCategoryPageId: () => 'cat',
    activePage: null,
    ...partial,
  };
}

function provider(id: string, commands: Command[]): CommandProvider {
  return { id, commands: () => commands };
}

function cmd(
  partial: Pick<Command, 'id' | 'label' | 'group'> & Partial<Command>,
): Command {
  return {
    action: { type: 'navigate', href: '/' },
    ...partial,
  };
}

afterEach(() => {
  clearCommandProviders();
});

describe('commandRegistry', () => {
  it('registers providers idempotently by id', () => {
    registerCommandProvider(
      provider('a', [cmd({ id: '1', label: 'One', group: 'create' })]),
    );
    registerCommandProvider(
      provider('a', [cmd({ id: '2', label: 'Two', group: 'create' })]),
    );
    assert.equal(listCommandProviders().length, 1);
    assert.equal(resolveCommands(baseCtx())[0]?.id, '2');
  });

  it('drops commands whose requires fail', () => {
    registerCommandProvider(
      provider('nav', [
        cmd({
          id: 'settings',
          label: 'Campaign Settings',
          group: 'navigate',
          requires: [CampaignCapabilities.CAMPAIGN_SETTINGS_EDIT],
        }),
        cmd({ id: 'sessions', label: 'Open Sessions', group: 'navigate' }),
      ]),
    );
    const allowed = resolveCommands(
      baseCtx({
        can: (cap) => cap !== CampaignCapabilities.CAMPAIGN_SETTINGS_EDIT,
      }),
    );
    assert.deepEqual(
      allowed.map((c) => c.id),
      ['sessions'],
    );
  });

  it('dedupes by command id (first wins)', () => {
    registerCommandProvider(
      provider('first', [
        cmd({ id: 'dup', label: 'First', group: 'create' }),
      ]),
    );
    registerCommandProvider(
      provider('second', [
        cmd({ id: 'dup', label: 'Second', group: 'create' }),
      ]),
    );
    assert.equal(resolveCommands(baseCtx())[0]?.label, 'First');
  });

  it('sorts by COMMAND_GROUP_ORDER', () => {
    registerCommandProvider(
      provider('mixed', [
        cmd({ id: 'a', label: 'Advance', group: 'campaign' }),
        cmd({ id: 'c', label: 'Create', group: 'create' }),
        cmd({ id: 'p', label: 'Edit', group: 'page' }),
        cmd({ id: 'n', label: 'Open', group: 'navigate' }),
      ]),
    );
    assert.deepEqual(
      resolveCommands(baseCtx()).map((c) => c.group),
      ['page', 'create', 'navigate', 'campaign'],
    );
  });
});
