import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { filterCommands } from './commandFilter.js';
import type { Command } from './types.js';

function cmd(
  partial: Pick<Command, 'id' | 'label' | 'group'> & Partial<Command>,
): Command {
  return {
    keywords: [],
    action: { type: 'navigate', href: '/' },
    ...partial,
  };
}

describe('filterCommands', () => {
  const ordered = [
    cmd({ id: 'p', label: 'Edit Yuna', group: 'page' }),
    cmd({ id: 'c', label: 'Create Character', group: 'create' }),
    cmd({ id: 'n', label: 'Open Timeline', group: 'navigate' }),
    cmd({ id: 'a', label: 'Advance Campaign Time', group: 'campaign' }),
  ];

  it('preserves input order on empty query (page → create → navigate → campaign)', () => {
    const filtered = filterCommands(ordered, '');
    assert.deepEqual(
      filtered.map((c) => c.group),
      ['page', 'create', 'navigate', 'campaign'],
    );
    assert.deepEqual(
      filtered.map((c) => c.id),
      ['p', 'c', 'n', 'a'],
    );
  });

  it('ranks prefix matches above subsequence', () => {
    const filtered = filterCommands(ordered, 'create');
    assert.equal(filtered[0]?.id, 'c');
  });

  it('matches keywords', () => {
    const withKw = [
      cmd({
        id: 'adv',
        label: 'Advance Campaign Time',
        group: 'campaign',
        keywords: ['clock'],
      }),
    ];
    assert.equal(filterCommands(withKw, 'clock')[0]?.id, 'adv');
  });

  it('drops non-matching commands', () => {
    assert.equal(filterCommands(ordered, 'zzzzz').length, 0);
  });
});
