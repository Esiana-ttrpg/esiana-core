import { afterEach, expect, test, vi } from 'vitest';
import { act } from 'react';
import { parseHTML } from 'linkedom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProgressionPage } from './ProgressionPage';

const fixture = vi.hoisted(() => ({ loading: true, role: null as string | null }));
vi.mock('@/contexts/WikiContext', () => ({ useWiki: () => ({ loading: fixture.loading, campaign: fixture.role ? { role: fixture.role } : null }) }));
vi.mock('@/components/progression/ProgressionTrajectoriesSection', () => ({ ProgressionTrajectoriesSection: () => <p>Trajectory content</p> }));
vi.mock('@/components/progression/DevelopmentsSection', () => ({ DevelopmentsSection: () => <p>Development content</p> }));
vi.mock('@/components/progression/DevelopmentHistorySection', () => ({ DevelopmentHistorySection: () => <p>History content</p> }));

const restore: (() => void)[] = [];
afterEach(() => { for (const cleanup of restore.splice(0).reverse()) cleanup(); });

test('direct links wait for campaign access and still redirect unauthorized users', async () => {
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
  const render = () => root.render(<MemoryRouter initialEntries={['/campaigns/test/progression?section=trajectories']}>
    <Routes><Route path="/campaigns/:campaignHandle/progression" element={<ProgressionPage />} />
      <Route path="/campaigns/:campaignHandle/dashboard" element={<p>Dashboard</p>} /></Routes>
  </MemoryRouter>);
  try {
    fixture.loading = true; fixture.role = null;
    await act(async () => render());
    expect(container.textContent).toContain('Loading Progression');
    expect(container.textContent).not.toContain('Dashboard');
    fixture.loading = false; fixture.role = 'GAMEMASTER';
    await act(async () => render());
    expect(container.textContent).toContain('Trajectory content');
    fixture.role = 'PARTICIPANT';
    await act(async () => render());
    expect(container.textContent).toContain('Dashboard');
  } finally { await act(async () => root.unmount()); }
});
