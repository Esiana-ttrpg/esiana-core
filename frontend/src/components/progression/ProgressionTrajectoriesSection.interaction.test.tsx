import { afterEach, expect, test, vi } from 'vitest';
import { act } from 'react';
import { parseHTML } from 'linkedom';
import { MemoryRouter } from 'react-router-dom';
import { ProgressionTrajectoriesSection } from './ProgressionTrajectoriesSection';

const fixture = vi.hoisted(() => ({ pages: [
  { id: 'org', title: 'Harbor Guild', category: 'organizations', metadata: { eraTrajectories: [{ eraId: null, direction: 'Grow' }] } },
  { id: 'person', title: 'Lantern Keeper', category: 'characters', metadata: { eraTrajectories: [{ eraId: null, direction: 'Explore' }] } },
] }));
vi.mock('@/contexts/WikiContext', () => ({ useWiki: () => ({ flatPages: fixture.pages, refresh: vi.fn() }) }));
vi.mock('@/lib/progressionApi', () => ({ fetchCampaignMomentum: async () => ({ state: { eras: [] } }) }));
vi.mock('@shared/resolveCanonicalEntityCategory', async (importOriginal) => ({
  ...await importOriginal<typeof import('@shared/resolveCanonicalEntityCategory')>(),
  resolveCanonicalEntityCategory: (page: { category: string }) => page.category,
}));
vi.mock('@/lib/organizationMetadata', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/organizationMetadata')>(),
  parseOrganizationMetadata: (metadata: unknown) => metadata,
}));
vi.mock('@/lib/characterMetadata', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/characterMetadata')>(),
  parseCharacterMetadata: (metadata: unknown) => metadata,
  resolveCharacterStatus: () => 'ACTIVE',
}));
vi.mock('@/components/progression/TrajectoryTable', () => ({
  TrajectoryTable: ({ rows, emptyMessage }: { rows: { title: string }[]; emptyMessage?: string }) =>
    <div>{rows.length ? rows.map(row => <p key={row.title}>{row.title}</p>) : emptyMessage}</div>,
}));
vi.mock('@/components/progression/CreateTrajectoryDialog', () => ({
  CreateTrajectoryDialog: () => <div role="dialog">Create trajectory</div>,
  trajectoryOrgEraKey: (pageId: string, eraId: string | null) => `${pageId}:${eraId}`,
}));

const restore: (() => void)[] = [];
afterEach(() => { for (const cleanup of restore.splice(0).reverse()) cleanup(); });

test('trajectory Refine affects displayed rows and reset restores them', async () => {
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
  const button = (text: string) => [...container.querySelectorAll('button')].find(item => item.textContent?.trim() === text);
  try {
    await act(async () => root.render(<MemoryRouter><ProgressionTrajectoriesSection campaignHandle="test" /></MemoryRouter>));
    expect(container.textContent).toContain('Harbor Guild');
    expect(container.textContent).toContain('Lantern Keeper');
    await act(async () => button('Refine')!.click());
    const select = container.querySelector('select[aria-label="Filter by type"]')!;
    await act(async () => {
      Object.defineProperty(select, 'value', { configurable: true, value: 'organizations' });
      select.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    expect(container.textContent).toContain('Harbor Guild');
    expect(container.textContent).not.toContain('Lantern Keeper');
    await act(async () => {
      Object.defineProperty(select, 'value', { configurable: true, value: 'locations' });
      select.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    expect(container.textContent).toContain('No trajectories match your filters.');
    await act(async () => button('Reset refine')!.click());
    expect(container.textContent).toContain('Lantern Keeper');
    await act(async () => button('Trajectory')!.click());
    expect([...container.querySelectorAll('[role="dialog"]')].some(dialog => dialog.textContent === 'Create trajectory')).toBe(true);
  } finally { await act(async () => root.unmount()); }
});
