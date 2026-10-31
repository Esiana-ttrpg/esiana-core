import { describe, expect, it } from 'vitest';
import {
  mergeWikiRouteSearch,
  resolveWikiRoutePageId,
  resolveWikiNavigation,
  shouldBlockFreeformRoute,
} from '@/lib/resolveWikiRoutePageId';
import { CampaignWorkspace } from '@shared/campaignWorkspace';
import type { WikiTreeNode } from '@/types/wiki';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { resolveWorkspaceForPage } from '@shared/wikiWorkspaceResolve';

it('merges canonical query defaults with current parameters without extra question marks', () => {
  const url = new URL(mergeWikiRouteSearch('/campaigns/archive/pages/note?view=lore&tag=a&tag=b', '?view=history&focus=title&focus=body'), 'https://example.test');
  expect(url.searchParams.get('view')).toBe('history');
  expect(url.searchParams.getAll('focus')).toEqual(['title', 'body']);
  expect(url.searchParams.getAll('tag')).toEqual(['a', 'b']);
  expect(url.search).not.toContain('?view=lore?');
});

it.each(['Events', 'Eras'])('does not assign chronology ownership through an ordinary %s folder title', title => {
  const folder = { id: 'folder', title, templateType: 'DEFAULT', parentId: null };
  const child = { id: 'child', title: 'Field notes', templateType: 'DEFAULT', parentId: folder.id };
  expect(resolveWorkspaceForPage(child, [folder, child])).toBe(CampaignWorkspace.PAGES);
  expect(resolveWorkspaceForPage(child, [{ ...folder, metadata: { systemCategoryKey: title === 'Events' ? 'chronology_events' : 'chronology_eras' } }, child])).toBe(title === 'Events' ? CampaignWorkspace.EVENTS : CampaignWorkspace.ERAS);
});

const flatPages: WikiTreeNode[] = [
  {
    id: 'cmpvk28ji000ivaxw283kvb86',
    campaignId: 'camp1',
    title: 'Tree Remember',
    parentId: 'chars-root',
    visibility: 'Party',
    templateType: 'DEFAULT',
    workspace: 'CHARACTERS',
    pathKey: 'tree-remember',
    children: [],
    createdAt: '',
    updatedAt: '',
  },
];

describe('authored chronology workspace routing', () => {
  const document = { ...flatPages[0], id: 'event-definition-1', title: 'Moonrise Chronicle', parentId: 'events-root', workspace: 'EVENTS', pathKey: 'moonrise-chronicle', metadata: { chronologyDocument: 'event' } } as WikiTreeNode;
  const handle = 'florence';
  const route = (pathname: string, params: { pageId?: string; pathKey?: string }, pages = [document]) => resolveWikiNavigation({ campaignHandle: handle, pathname: `/campaigns/${handle}/${pathname}`, flatPages: pages, ...params });

  it('generates a wiki destination for existing workspace-less legacy documents', () => {
    const old = { ...document, workspace: null, pathKey: null, metadata: {} };
    expect(campaignWikiPath(handle, old.id, [old])).toBe('/campaigns/florence/event-pages/event-definition-1');
    expect(route(old.id, { pageId: old.id }, [old]).page?.id).toBe(old.id);
  });
  it('resolves existing document ID bookmarks before legacy event links', () => {
    for (const [path, params] of [[document.id, { pageId: document.id }], [`pages/${document.id}`, { pathKey: document.id }], [`wiki/${document.id}`, { pageId: document.id }]] as const) {
      expect(route(path, params).path).toBe('/campaigns/florence/event-pages/moonrise-chronicle');
    }
    expect(route('event-pages/moonrise-chronicle', { pathKey: 'moonrise-chronicle' }).page?.id).toBe(document.id);
  });
  it('uses chronology only for unknown IDs in legacy namespaces', () => {
    expect(route('event-missing', { pageId: 'event-missing' }).path).toBe('/campaigns/florence/events/missing');
    expect(route('pages/event-missing', { pathKey: 'event-missing' }).path).toBe('/campaigns/florence/events/missing');
    expect(route('wiki/event-missing', { pageId: 'event-missing' }).path).toBeUndefined();
    expect(route('event-pages/event-missing', { pathKey: 'event-missing' }).path).toBeUndefined();
  });
  it('keeps era document routing and prior workspace bookmarks separate from chronology', () => {
    const era = { ...document, id: 'era-document', workspace: 'ERAS', pathKey: 'ember-chronicle', metadata: { eraOverview: true, wikiRouteAliases: [{ workspace: 'PAGES', pathKey: 'ember-chronicle' }] } } as WikiTreeNode;
    expect(campaignWikiPath(handle, era.id, [era])).toBe('/campaigns/florence/era-pages/ember-chronicle');
    expect(route('pages/ember-chronicle', { pathKey: 'ember-chronicle' }, [era]).path).toBe('/campaigns/florence/era-pages/ember-chronicle');
    expect(route('pages/present', { pathKey: 'present' }, []).path).toBe('/campaigns/florence/eras');
  });
  it('does not misinterpret authored event-like path keys as chronology links', () => {
    const ordinary = { ...flatPages[0], workspace: 'PAGES', pathKey: 'event-birthday', id: 'ordinary-page' } as WikiTreeNode;
    expect(route('pages/event-birthday', { pathKey: 'event-birthday' }, [ordinary]).page?.id).toBe(ordinary.id);
    expect(route('pages/event-birthday', { pathKey: 'event-birthday' }, [ordinary]).path).toBe('/campaigns/florence/pages/event-birthday');
  });
});

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
