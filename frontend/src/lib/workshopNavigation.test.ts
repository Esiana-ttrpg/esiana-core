import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildWorkshopSearch,
  campaignWorkshopPath,
  readWorkshopDraftIdFromSearch,
  readWorkshopFromPageId,
  resolveLegacyWorkshopRedirect,
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

  it('redirects legacy progression workshop URLs', () => {
    assert.equal(
      resolveLegacyWorkshopRedirect('camp', '?section=workshop&draft=old'),
      '/campaigns/camp/workshop?draft=old',
    );
    assert.equal(
      resolveLegacyWorkshopRedirect('camp', '?section=authoringWorkshop&anchors=page1'),
      '/campaigns/camp/workshop?from=page1',
    );
    assert.equal(resolveLegacyWorkshopRedirect('camp', '?section=scenes'), null);
  });
});
