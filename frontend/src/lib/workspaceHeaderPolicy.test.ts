import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatWorkspaceCountLabel,
  formatWorkspaceHubCountHint,
  resolveCategoryCountNouns,
  shouldShowHubBreadcrumbs,
} from './workspaceHeaderPolicy.ts';

describe('workspaceHeaderPolicy', () => {
  it('shouldShowHubBreadcrumbs hides single category index root', () => {
    assert.equal(
      shouldShowHubBreadcrumbs([{ id: 'cat-1', title: 'Characters' }]),
      false,
    );
  });

  it('shouldShowHubBreadcrumbs shows nested trails', () => {
    assert.equal(
      shouldShowHubBreadcrumbs([
        { id: 'org-root', title: 'Organizations' },
        { id: 'org-1', title: 'Silver Council' },
      ]),
      true,
    );
  });

  it('shouldShowHubBreadcrumbs hides empty crumbs', () => {
    assert.equal(shouldShowHubBreadcrumbs([]), false);
  });

  it('formatWorkspaceCountLabel pluralizes correctly', () => {
    assert.equal(formatWorkspaceCountLabel(1, 'character'), '1 character');
    assert.equal(formatWorkspaceCountLabel(317, 'character'), '317 characters');
    assert.equal(formatWorkspaceCountLabel(2, 'person', 'people'), '2 people');
  });

  it('formatWorkspaceHubCountHint returns quiet total when browse inactive', () => {
    assert.equal(
      formatWorkspaceHubCountHint({
        total: 1,
        matching: 1,
        singular: 'character',
      }),
      '1 character',
    );
  });

  it('formatWorkspaceHubCountHint returns filtered hint when browse active', () => {
    assert.equal(
      formatWorkspaceHubCountHint({
        total: 317,
        matching: 5,
        singular: 'character',
        searchQuery: 'aria',
      }),
      'Showing 5 of 317',
    );
  });

  it('resolveCategoryCountNouns includes Tier 2 hubs', () => {
    assert.equal(resolveCategoryCountNouns('Tags').singular, 'tag');
    assert.equal(resolveCategoryCountNouns('Ledger').singular, 'entry');
    assert.equal(resolveCategoryCountNouns('Projects').plural, 'operations');
  });
});
