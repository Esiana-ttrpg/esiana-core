import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { campaignNotePath, campaignWikiPath } from '@/lib/campaignPaths';
import { SESSION_COMBINED_VIEW_ID } from '@/utils/sessionNoteConstants';

type SessionNoteFlatPage = {
  id: string;
  pathKey?: string | null;
  workspace?: string | null;
};

function sessionNoteHref(
  campaignHandle: string,
  page: { id: string; timelinePointId?: string },
  flatPages: SessionNoteFlatPage[] = [],
): string {
  if (page.timelinePointId) {
    return campaignNotePath(campaignHandle, page.timelinePointId);
  }
  return campaignWikiPath(campaignHandle, page.id, flatPages);
}

describe('session note routing helpers', () => {
  it('routes timeline sessions to the notes editor path', () => {
    assert.equal(
      sessionNoteHref('my-campaign', { id: 'anchor-id', timelinePointId: 'tp-1' }),
      '/campaigns/my-campaign/notes/tp-1',
    );
  });

  it('routes legacy uploads via workspace path when flatPages are available', () => {
    assert.equal(
      sessionNoteHref('my-campaign', { id: 'legacy-id' }, [
        { id: 'legacy-id', pathKey: 'session-upload', workspace: 'JOURNALS' },
      ]),
      '/campaigns/my-campaign/journals/session-upload',
    );
  });

  it('uses transitional page id path without flatPages', () => {
    assert.equal(
      sessionNoteHref('my-campaign', { id: 'legacy-id' }),
      '/campaigns/my-campaign/legacy-id',
    );
  });

  it('uses a stable combined-view sentinel id', () => {
    assert.equal(SESSION_COMBINED_VIEW_ID, '__combined__');
  });
});
