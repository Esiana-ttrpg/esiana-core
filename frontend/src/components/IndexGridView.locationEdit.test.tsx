import { afterEach, expect, test, vi } from 'vitest';
import { act } from 'react';
import { parseHTML } from 'linkedom';
import { MemoryRouter } from 'react-router-dom';
import { IndexGridView } from './IndexGridView';

const update = vi.hoisted(() => vi.fn(async () => ({ metadata: { Region: 'South' } })));
vi.mock('@/contexts/WikiContext', () => ({ useWiki: () => ({ flatPages: [] }) }));
vi.mock('@/hooks/useWikiCampaignPolicy', () => ({ useElevatedNarrativeView: () => true }));
vi.mock('@/lib/metadataConfig', () => ({ getCategoryColumnDefs: () => [{ key: 'Region' }],
  getCategoryColumnHeaderLabel: (key: string) => key, LOCATION_DERIVED_READONLY_COLUMNS: new Set() }));
vi.mock('@/lib/contentPriorityCollapse', () => ({ visibleColumnsForViewport: (columns: unknown[]) => columns,
  countHiddenColumnsForViewport: () => 0, formatIndexCellDisplay: (value: string) => value }));
vi.mock('@/lib/locationBrowseProjection', () => ({ buildLocationBrowseRowMap: () => new Map(), readLocationBrowseCell: () => null }));
vi.mock('@/lib/wikiMetadata', () => ({ getDisplayMetadata: () => [{ key: 'Region', value: 'North' }] }));
vi.mock('@/lib/wiki', () => ({ formatIndexLocationTrail: () => '', updateWikiPageMetadataField: update }));
vi.mock('@/lib/campaignPaths', () => ({ campaignCategoryChildPath: () => '/page' }));
vi.mock('@/lib/characterMetadata', () => ({ parseCharacterMetadata: () => null, readCharacterIndexIds: () => null, resolveCharacterStatus: () => null }));
vi.mock('@/lib/characterLineageMetadata', () => ({ parseCharacterLineageMetadata: () => null }));
vi.mock('@/components/wiki/indexBrowse/CharacterIndexTitleCell', () => ({ CharacterIndexTitleCell: () => null }));
vi.mock('@/components/bestiary/BestiaryIndexTitleCell', () => ({ BestiaryIndexTitleCell: () => null }));
vi.mock('@/components/entity/CharacterLifeStatusBadge', () => ({ CharacterLifeStatusBadge: () => null, getCharacterLifeStatusRowClass: () => '' }));
vi.mock('@/components/wiki/NarrativeStatusBadge', () => ({ NarrativeStatusBadge: () => null }));
vi.mock('@/components/wiki/indexBrowse/CategoryIndexDiscoveryBanner', () => ({ DiscoveryStateBadge: () => null }));
vi.mock('@/components/narrative/VisibilityTierChip', () => ({ BrowseVisibilityIndicator: () => null }));

const restore: (() => void)[] = [];
afterEach(() => { for (const cleanup of restore.splice(0).reverse()) cleanup(); });

test('saving a location cell refreshes the parent collection', async () => {
  const { window } = parseHTML('<html><body><div id="root"></div></body></html>');
  for (const [key, value] of Object.entries({ window, document: window.document, HTMLElement: window.HTMLElement,
    Event: window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    restore.push(() => previous ? Object.defineProperty(globalThis, key, previous) : Reflect.deleteProperty(globalThis, key));
  }
  const container = window.document.getElementById('root')!;
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(container);
  const reload = vi.fn();
  try {
    await act(async () => root.render(<MemoryRouter><IndexGridView categoryPageId="root" categoryTitle="Locations"
      campaignHandle="campaign" pageById={new Map()} onMetadataSaved={reload}
      children={[{ id: 'one', title: 'Observatory', parentId: 'root', visibility: 'Party', updatedAt: '2025-01-01', snippet: '' }]} /></MemoryRouter>));
    expect(container.querySelector('table')?.className).toContain('operator-index-table--locations');
    const edit = [...container.querySelectorAll('button')].find(button => button.textContent?.includes('North'))!;
    await act(async () => edit.click());
    const input = container.querySelector('input')!;
    expect(input).toBeTruthy();
    const save = input.parentElement!.querySelector('button')!;
    await act(async () => save.click());
    expect(update).toHaveBeenCalledOnce();
    expect(reload).toHaveBeenCalledOnce();
  } finally { await act(async () => root.unmount()); }
});
