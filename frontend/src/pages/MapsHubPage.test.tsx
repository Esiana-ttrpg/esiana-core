import { afterEach, expect, test, vi } from 'vitest';
import { act } from 'react';
import { parseHTML } from 'linkedom';
import { MemoryRouter } from 'react-router-dom';
import { MapsHubPage } from './MapsHubPage';

const fixture = vi.hoisted(() => ({ canManage: true, fetchMaps: vi.fn() }));
vi.mock('@/contexts/WikiContext', () => ({
  useWiki: () => ({ flatPages: [], can: (capability: string) => capability === 'maps.edit' && fixture.canManage }),
}));
vi.mock('@/lib/maps', () => ({
  fetchCampaignMaps: fixture.fetchMaps,
  uploadCampaignMap: vi.fn(),
  deleteCampaignMap: vi.fn(),
}));

const restore: (() => void)[] = [];
afterEach(() => { for (const cleanup of restore.splice(0).reverse()) cleanup(); });

async function mount() {
  const { window } = parseHTML('<html><body><div id="root"></div></body></html>');
  for (const [key, value] of Object.entries({ window, document: window.document, Node: window.Node,
    HTMLElement: window.HTMLElement, Event: window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    restore.push(() => previous ? Object.defineProperty(globalThis, key, previous) : Reflect.deleteProperty(globalThis, key));
  }
  const container = window.document.getElementById('root')!;
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(container);
  await act(async () => root.render(<MemoryRouter><MapsHubPage campaignHandle="test" categoryPageId="maps" /></MemoryRouter>));
  return { container,
    setCampaign: (campaignHandle: string) => act(async () => root.render(<MemoryRouter><MapsHubPage campaignHandle={campaignHandle} categoryPageId="maps" /></MemoryRouter>)),
    unmount: () => act(async () => root.unmount()) };
}

test('empty maps show upload only to users with map editing access', async () => {
  for (const canManage of [true, false]) {
    fixture.canManage = canManage;
    fixture.fetchMaps.mockReset().mockResolvedValue({ maps: [] });
    const { container, unmount } = await mount();
    try {
      expect(container.textContent).toContain('No entries in Maps yet.');
      expect(Boolean([...container.querySelectorAll('button')].find(button => button.textContent?.includes('Upload map')))).toBe(canManage);
    } finally { await unmount(); }
  }
});

test('a failed reload hides the previously loaded discovery summary', async () => {
  fixture.canManage = false;
  fixture.fetchMaps.mockReset().mockResolvedValueOnce({ maps: [], discoverySummary: { discoveredCount: 1, undiscoveredCount: 2 } })
    .mockRejectedValueOnce(new Error('Maps unavailable'));
  const { container, setCampaign, unmount } = await mount();
  try {
    expect(container.querySelector('[role="status"]')?.textContent).toContain('2 undiscovered');
    await setCampaign('another-campaign');
    expect(fixture.fetchMaps).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Maps unavailable');
    expect(container.querySelector('[role="status"]')).toBeNull();
  } finally { await unmount(); }
});

test('a failed catalog load shows an error and can be retried', async () => {
  fixture.canManage = true;
  fixture.fetchMaps.mockReset().mockRejectedValueOnce(new Error('Maps unavailable')).mockResolvedValueOnce({ maps: [] });
  const { container, unmount } = await mount();
  try {
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Maps unavailable');
    expect(container.textContent).not.toContain('No entries in Maps yet.');
    await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === 'Try again')!.click());
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.textContent).toContain('No entries in Maps yet.');
  } finally { await unmount(); }
});
