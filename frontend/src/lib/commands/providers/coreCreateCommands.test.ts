import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CampaignCapabilities } from '@shared/campaignPolicy/capabilities';
import { listCreatableCodexPageTypes } from '@/lib/campaignWorkspaceRoutes';
import { createItemLabel } from '@/lib/wikiLabels';
import { buildCoreCreateCommands } from './coreCreateCommands.js';
import type { CommandContext } from '../types.js';

const ALL_TITLES = listCreatableCodexPageTypes().map((t) => t.categoryTitle);

function ctx(
  partial: Partial<CommandContext> & {
    categories?: Partial<Record<string, string>>;
  } = {},
): CommandContext {
  const { categories = {}, ...rest } = partial;
  return {
    campaignHandle: 'demo',
    campaignId: 'c1',
    pathname: '/campaigns/demo/dashboard',
    workspaceSegment: 'dashboard',
    can: () => true,
    resolveCategoryPageId: (title) => categories[title],
    activePage: null,
    ...rest,
  };
}

function allCategoriesResolved(): Record<string, string> {
  return Object.fromEntries(ALL_TITLES.map((title) => [title, `id-${title}`]));
}

describe('buildCoreCreateCommands', () => {
  it('emits typed creates only when category resolves, plus session note', () => {
    const commands = buildCoreCreateCommands(
      ctx({
        categories: {
          Characters: 'char-root',
          Locations: 'loc-root',
        },
      }),
    );
    assert.deepEqual(
      commands.map((c) => c.id),
      [
        'core.create.characters',
        'core.create.locations',
        'core.create.session-note',
      ],
    );
    assert.ok(!commands.some((c) => /wiki|uncategor|freeform|generic/i.test(c.id)));
    assert.ok(!commands.some((c) => /wiki|uncategor|freeform|generic/i.test(c.label)));
  });

  it('emits all creatable codex types when every category resolves', () => {
    const commands = buildCoreCreateCommands(
      ctx({ categories: allCategoriesResolved() }),
    );
    const pageCreates = commands.filter((c) => c.id !== 'core.create.session-note');
    assert.equal(pageCreates.length, ALL_TITLES.length);
    assert.equal(commands.length, ALL_TITLES.length + 1);
    assert.ok(commands.every((c) => c.group === 'create'));
    assert.ok(
      commands.every(
        (c) =>
          c.requires?.length === 1 &&
          c.requires[0] === CampaignCapabilities.PAGE_CREATE,
      ),
    );
    for (const type of listCreatableCodexPageTypes()) {
      const cmd = commands.find((c) => c.id === `core.create.${type.segment}`);
      assert.ok(cmd, `missing command for ${type.segment}`);
      assert.equal(cmd!.label, `Create ${createItemLabel(type.categoryTitle)}`);
    }
  });

  it('never exposes Journals, Pages, or a generic Create Wiki Page command', () => {
    const commands = buildCoreCreateCommands(
      ctx({
        categories: {
          ...allCategoriesResolved(),
          Journals: 'journals-root',
          Pages: 'pages-root',
        },
      }),
    );
    const labels = commands.map((c) => c.label.toLowerCase());
    assert.ok(!labels.some((l) => l === 'create wiki page' || l === 'new page'));
    assert.ok(!labels.some((l) => l.includes('journal')));
    assert.ok(!commands.some((c) => c.id === 'core.create.journals'));
    assert.ok(!commands.some((c) => c.id === 'core.create.pages'));

    const allowedTitles = new Set(ALL_TITLES);
    assert.ok(
      commands.every((c) => {
        if (c.action.type !== 'openDialog') return true;
        if (c.action.dialog.kind === 'create-page') {
          return allowedTitles.has(c.action.dialog.categoryTitle);
        }
        return c.action.dialog.kind === 'session-note';
      }),
    );
  });

  it('still emits create commands when icon map has no entry (generic fallback)', () => {
    // CUSTOM is not in the createVia set; this asserts icons are optional by
    // checking every emitted create has an icon string (fallback included).
    const commands = buildCoreCreateCommands(
      ctx({ categories: allCategoriesResolved() }),
    );
    for (const cmd of commands) {
      if (cmd.id === 'core.create.session-note') continue;
      assert.equal(typeof cmd.icon, 'string');
      assert.ok((cmd.icon?.length ?? 0) > 0);
    }
  });
});
