import { describe, expect, it } from 'vitest';
import {
  resolveWikiRoutePageId,
  shouldBlockFreeformRoute,
} from '@/lib/resolveWikiRoutePageId';
import { CampaignWorkspace } from '@shared/campaignWorkspace';
import type { WikiTreeNode } from '@/types/wiki';

const flatPages: WikiTreeNode[] = [
  {
    id: 'cmpvk28ji000ivaxw283kvb86',
    campaignId: 'camp1',
    title: 'Tree Remember',
    parentId: 'chars-root',
    visibility: 'Party',
    templateType: 'CHARACTER',
    workspace: 'CHARACTERS',
    pathKey: 'tree-remember',
    children: [],
    createdAt: '',
    updatedAt: '',
  },
];

describe('resolveWikiRoutePageId', () => {
  it('resolves by workspace pathKey', () => {
    expect(
      resolveWikiRoutePageId({
        pathname: '/campaigns/mario-party-seven/characters/tree-remember',
        campaignHandle: 'mario-party-seven',
        pathKey: 'tree-remember',
        flatPages,
      }),
    ).toBe('cmpvk28ji000ivaxw283kvb86');
  });

  it('falls back to internal page id in URL segment', () => {
    expect(
      resolveWikiRoutePageId({
        pathname: '/campaigns/mario-party-seven/characters/cmpvk28ji000ivaxw283kvb86',
        campaignHandle: 'mario-party-seven',
        pathKey: 'cmpvk28ji000ivaxw283kvb86',
        flatPages,
      }),
    ).toBe('cmpvk28ji000ivaxw283kvb86');
  });
});

describe('shouldBlockFreeformRoute', () => {
  it('blocks structured workspace pages under /pages', () => {
    expect(
      shouldBlockFreeformRoute(
        '/campaigns/red-sands/pages/tree-remember',
        'red-sands',
        { workspace: CampaignWorkspace.CHARACTERS },
      ),
    ).toBe(true);
  });

  it('allows freeform pages under /pages', () => {
    expect(
      shouldBlockFreeformRoute(
        '/campaigns/red-sands/pages/my-notes',
        'red-sands',
        { workspace: CampaignWorkspace.PAGES },
      ),
    ).toBe(false);
  });
});
