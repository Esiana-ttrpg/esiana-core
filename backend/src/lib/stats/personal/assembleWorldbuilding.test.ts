import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readMetricAmount, type MetricValue } from '../../../../../shared/metricValue.js';
import { CampaignWorkspace } from '../../../../../shared/campaignWorkspace.js';
import {
  assembleWorldbuildingStats,
  classifyWorldbuildingDomain,
  type WorldbuildingPageInput,
} from './assembleWorldbuilding.js';

function unavailableReason(value: MetricValue | undefined): string | null {
  return value?.status === 'unavailable' ? value.reason : null;
}

function page(
  id: string,
  input: Partial<WorldbuildingPageInput> & { entityCategory?: string } = {},
): WorldbuildingPageInput {
  const { entityCategory, metadata, ...rest } = input;
  return {
    id,
    title: rest.title ?? id,
    parentId: rest.parentId ?? null,
    workspace: rest.workspace ?? null,
    templateType: rest.templateType ?? 'DEFAULT',
    metadata:
      metadata ??
      (entityCategory ? { entityCategory } : {}),
  };
}

describe('classifyWorldbuildingDomain', () => {
  it('classifies typed workspaces without using page id for codex fallback', () => {
    assert.equal(
      classifyWorldbuildingDomain(page('c1', { workspace: CampaignWorkspace.CHARACTERS })),
      'characters',
    );
    assert.equal(
      classifyWorldbuildingDomain(page('l1', { workspace: CampaignWorkspace.LOCATIONS })),
      'locations',
    );
    assert.equal(
      classifyWorldbuildingDomain(page('o1', { workspace: CampaignWorkspace.ORGANIZATIONS })),
      'organizations',
    );
    assert.equal(
      classifyWorldbuildingDomain(page('f1', { workspace: CampaignWorkspace.FAMILIES })),
      'families',
    );
    assert.equal(
      classifyWorldbuildingDomain(page('b1', { workspace: CampaignWorkspace.BESTIARY })),
      'creatures',
    );
    assert.equal(
      classifyWorldbuildingDomain(page('x1', { workspace: CampaignWorkspace.CUSTOM })),
      'custom',
    );
  });

  it('lets chronology kind win over workspace and metadata', () => {
    assert.equal(
      classifyWorldbuildingDomain(
        page('event-harbor', {
          workspace: CampaignWorkspace.ORGANIZATIONS,
          entityCategory: 'organizations',
        }),
      ),
      'events',
    );
    assert.equal(
      classifyWorldbuildingDomain(
        page('era-1', {
          workspace: CampaignWorkspace.ERAS,
          entityCategory: 'characters',
        }),
      ),
      'eras',
    );
  });

  it('does not double-count custom pages that also have character metadata', () => {
    assert.equal(
      classifyWorldbuildingDomain(
        page('custom-1', {
          workspace: CampaignWorkspace.CUSTOM,
          entityCategory: 'characters',
        }),
      ),
      'custom',
    );
  });

  it('falls back to metadata-only codex for untyped pages', () => {
    assert.equal(
      classifyWorldbuildingDomain(page('p1', { entityCategory: 'characters' })),
      'characters',
    );
    assert.equal(classifyWorldbuildingDomain(page('p2')), null);
  });

  it('skips structural templates such as session notes and quests', () => {
    assert.equal(
      classifyWorldbuildingDomain(
        page('note-1', {
          workspace: CampaignWorkspace.CUSTOM,
          templateType: 'SESSION_NOTE',
        }),
      ),
      null,
    );
    assert.equal(
      classifyWorldbuildingDomain(page('quest-1', { templateType: 'QUEST' })),
      null,
    );
  });
});

describe('assembleWorldbuildingStats', () => {
  const character = page('char-1', { workspace: CampaignWorkspace.CHARACTERS });
  const custom = page('custom-1', {
    workspace: CampaignWorkspace.CUSTOM,
    entityCategory: 'characters',
  });
  const pagesById = new Map([
    [character.id, character],
    [custom.id, custom],
  ]);

  it('separates creations, edits, and word contributions without double-counting', () => {
    const stats = assembleWorldbuildingStats({
      createdPages: [character, custom],
      pagesById,
      periodEvents: [
        { type: 'PAGE_CREATED', pageId: 'char-1' },
        { type: 'PAGE_EDITED', pageId: 'char-1' },
        { type: 'PAGE_EDITED', pageId: 'custom-1' },
        { type: 'LINK_CREATED', pageId: 'char-1' },
      ],
      wordRows: [
        {
          kind: 'stored',
          row: {
            narrativeEventId: 'e1',
            occurredAt: new Date('2026-06-02T12:00:00.000Z'),
            wordsAdded: 12,
            wordsRemoved: 2,
            netChange: 10,
            availability: 'measured',
            origin: 'human',
            documentId: 'char-1',
          },
        },
      ],
      lifetimeLinkCount: 4,
      skipPeriod: false,
      visibility: 'owner',
    });

    const byDomain = Object.fromEntries(stats.map((row) => [row.domain, row]));
    assert.equal(readMetricAmount(byDomain.characters?.created), 1);
    assert.equal(readMetricAmount(byDomain.custom?.created), 1);
    assert.equal(readMetricAmount(byDomain.characters?.periodCreated), 1);
    assert.equal(readMetricAmount(byDomain.characters?.periodEdited), 1);
    assert.equal(readMetricAmount(byDomain.custom?.periodEdited), 1);
    assert.equal(readMetricAmount(byDomain.characters?.periodContributed), 12);
    assert.equal(readMetricAmount(byDomain.custom?.periodContributed), 0);
    assert.equal(readMetricAmount(byDomain.relationships?.created), 4);
    assert.equal(readMetricAmount(byDomain.relationships?.periodCreated), 1);
    assert.equal(unavailableReason(byDomain.relationships?.periodEdited), 'not_yet_tracked');
    assert.equal(unavailableReason(byDomain.factions?.created), 'not_yet_tracked');
  });

  it('marks reconstructed word contributions partial', () => {
    const stats = assembleWorldbuildingStats({
      createdPages: [character],
      pagesById,
      periodEvents: [],
      wordRows: [
        {
          kind: 'reconstructed',
          event: {
            id: 'old',
            type: 'PAGE_EDITED',
            createdAt: new Date('2026-06-03T12:00:00.000Z'),
            metadata: { wordDelta: 20 },
            pageId: 'char-1',
          },
          row: {
            narrativeEventId: 'old',
            occurredAt: new Date('2026-06-03T12:00:00.000Z'),
            wordsAdded: 20,
            wordsRemoved: 0,
            netChange: 20,
            availability: 'reconstructed',
            origin: 'human',
            documentId: 'char-1',
          },
        },
      ],
      lifetimeLinkCount: 0,
      skipPeriod: false,
      visibility: 'owner',
    });
    const characters = stats.find((row) => row.domain === 'characters');
    assert.equal(characters?.periodContributed.status, 'partial');
    assert.equal(readMetricAmount(characters?.periodContributed), 20);
  });

  it('hides period edits and contributions from public visibility', () => {
    const stats = assembleWorldbuildingStats({
      createdPages: [character],
      pagesById,
      periodEvents: [{ type: 'PAGE_CREATED', pageId: 'char-1' }],
      wordRows: [],
      lifetimeLinkCount: 0,
      skipPeriod: false,
      visibility: 'public',
    });
    const characters = stats.find((row) => row.domain === 'characters');
    assert.equal(readMetricAmount(characters?.created), 1);
    assert.equal(unavailableReason(characters?.periodCreated), 'private');
    assert.equal(unavailableReason(characters?.periodEdited), 'private');
    assert.equal(unavailableReason(characters?.periodContributed), 'private');
  });

  it('leaves period fields untracked when skipPeriod is set', () => {
    const stats = assembleWorldbuildingStats({
      createdPages: [character],
      pagesById,
      periodEvents: [{ type: 'PAGE_CREATED', pageId: 'char-1' }],
      wordRows: [],
      lifetimeLinkCount: 2,
      skipPeriod: true,
      visibility: 'owner',
    });
    const characters = stats.find((row) => row.domain === 'characters');
    assert.equal(readMetricAmount(characters?.created), 1);
    assert.equal(unavailableReason(characters?.periodCreated), 'not_yet_tracked');
    const relationships = stats.find((row) => row.domain === 'relationships');
    assert.equal(readMetricAmount(relationships?.created), 2);
    assert.equal(unavailableReason(relationships?.periodCreated), 'not_yet_tracked');
  });
});
