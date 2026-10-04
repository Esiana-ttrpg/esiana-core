import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildWorkshopSearch,
  campaignWorkshopPath,
  readWorkshopDraftIdFromSearch,
  readWorkshopFromPageId,
  resolveWorkshopBootstrapOpenIds,
} from './workshopNavigation.js';

describe('workshopNavigation', () => {
  it('builds workshop path with draft and from params', () => {
    assert.equal(
      campaignWorkshopPath('my-campaign', {
        draftId: 'draft-1',
        fromPageId: 'page-1',
      }),
      '/campaigns/my-campaign/workshop?draft=draft-1&from=page-1',
    );
  });

  it('reads draft and from page from search', () => {
    assert.equal(readWorkshopDraftIdFromSearch('?draft=abc'), 'abc');
    assert.equal(readWorkshopFromPageId('?from=page-9'), 'page-9');
  });

  it('builds workshop search string', () => {
    assert.equal(buildWorkshopSearch('draft-1', 'page-1'), '?draft=draft-1&from=page-1');
    assert.equal(buildWorkshopSearch(null), '');
  });

  it('bare bootstrap with no primary draft and empty session yields empty workspace', () => {
    assert.deepEqual(
      resolveWorkshopBootstrapOpenIds({
        primaryDraftId: null,
        sessionOpenDraftIds: [],
      }),
      [],
    );
  });

  it('bootstrap prefers primary draft then session tabs without inventing extras', () => {
    assert.deepEqual(
      resolveWorkshopBootstrapOpenIds({
        primaryDraftId: 'draft-a',
        sessionOpenDraftIds: ['draft-b', 'draft-a'],
      }),
      ['draft-a', 'draft-b'],
    );
    assert.deepEqual(
      resolveWorkshopBootstrapOpenIds({
        primaryDraftId: null,
        sessionOpenDraftIds: ['draft-b', 'draft-c'],
      }),
      ['draft-b', 'draft-c'],
    );
  });
});
