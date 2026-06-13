import { describe, expect, it } from 'vitest';
import { CampaignWorkspace } from './campaignWorkspace.js';
import {
  campaignWorkspaceEntityPath,
  resolveCanonicalPagePath,
  resolveWorkspaceIndexPathForFolderTitle,
  segmentToWorkspace,
  workspaceToSegment,
} from './campaignWorkspaceRoutes.js';

describe('campaignWorkspaceRoutes', () => {
  it('maps workspace enum to URL segments', () => {
    expect(workspaceToSegment(CampaignWorkspace.CHARACTERS)).toBe('characters');
    expect(workspaceToSegment(CampaignWorkspace.PAGES)).toBe('pages');
    expect(segmentToWorkspace('adventures')).toBe(CampaignWorkspace.ADVENTURES);
  });

  it('builds entity paths from pathKey', () => {
    expect(campaignWorkspaceEntityPath('red-sands', 'characters', 'mario')).toBe(
      '/campaigns/red-sands/characters/mario',
    );
  });

  it('builds canonical paths from stored workspace + pathKey', () => {
    expect(
      resolveCanonicalPagePath(
        'red-sands',
        {
          id: 'cuid123',
          title: 'Mario',
          parentId: null,
          templateType: 'CHARACTER',
          workspace: CampaignWorkspace.CHARACTERS,
          pathKey: 'mario',
        },
        [],
      ),
    ).toBe('/campaigns/red-sands/characters/mario');
  });

  it('maps category folder titles to workspace index paths', () => {
    expect(resolveWorkspaceIndexPathForFolderTitle('red-sands', 'Characters')).toBe(
      '/campaigns/red-sands/characters',
    );
    expect(resolveWorkspaceIndexPathForFolderTitle('red-sands', 'Maps')).toBe(
      '/campaigns/red-sands/maps',
    );
    expect(resolveWorkspaceIndexPathForFolderTitle('red-sands', 'Quests')).toBe(
      '/campaigns/red-sands/adventures',
    );
  });

  it('resolves category folder pages to hub paths, not dashboard', () => {
    expect(
      resolveCanonicalPagePath(
        'red-sands',
        {
          id: 'maps-folder-id',
          title: 'Maps',
          parentId: null,
          templateType: 'DEFAULT',
        },
        [],
      ),
    ).toBe('/campaigns/red-sands/maps');
  });

  it('falls back to page id when pathKey is missing on entity pages', () => {
    expect(
      resolveCanonicalPagePath(
        'red-sands',
        {
          id: 'char-cuid',
          title: 'Mario',
          parentId: 'chars-folder',
          templateType: 'CHARACTER',
          workspace: CampaignWorkspace.CHARACTERS,
          pathKey: null,
        },
        [],
      ),
    ).toBe('/campaigns/red-sands/characters/char-cuid');
  });

  it('falls back to transitional page id when workspace cannot be resolved', () => {
    expect(
      resolveCanonicalPagePath(
        'red-sands',
        {
          id: 'orphan-page',
          title: 'Mystery',
          parentId: null,
          templateType: 'DEFAULT',
        },
        [],
      ),
    ).toBe('/campaigns/red-sands/pages/orphan-page');
  });
});
