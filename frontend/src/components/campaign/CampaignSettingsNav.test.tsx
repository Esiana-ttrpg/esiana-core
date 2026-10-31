import { afterEach, expect, test } from 'vitest';
import { act, type ReactNode } from 'react';
import { parseHTML } from 'linkedom';
import { createMemoryRouter, RouterProvider, useSearchParams } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { CampaignSettingsNav, type CampaignSettingsNavGroup } from './CampaignSettingsNav';
import { campaignSettingsSectionHref } from '@/lib/campaignSettingsNavigation';
import type { CampaignSettingsTab } from '@/lib/campaignPaths';

const groups: CampaignSettingsNavGroup[] = [
  { label: 'Campaign', items: ['general', 'appearance', 'access', 'recruitment'].map(id => ({ id: id as CampaignSettingsTab, label: id, icon: Settings })) },
  { label: 'Systems', items: ['scheduling', 'timeline', 'world-development', 'audio', 'integrations'].map(id => ({ id: id as CampaignSettingsTab, label: id, icon: Settings })) },
  { label: 'Administration', items: ['safety-privacy', 'advanced'].map(id => ({ id: id as CampaignSettingsTab, label: id, icon: Settings })) },
];

function Harness() {
  const [params] = useSearchParams();
  const tab = (params.get('tab') || 'general') as CampaignSettingsTab;
  return <CampaignSettingsNav campaignHandle="florence" campaignName="Florence" groups={groups} activeTab={tab}
    navigationLabel="Campaign Settings" settingsLabel="Settings"
    sectionHref={next => campaignSettingsSectionHref('florence', params, tab, next)} />;
}

const restore: (() => void)[] = [];
afterEach(() => { for (const cleanup of restore.splice(0).reverse()) cleanup(); });

async function mount(children: ReactNode) {
  const { window } = parseHTML('<html><body><div id="root"></div></body></html>');
  for (const [key, value] of Object.entries({ window, document: window.document, HTMLElement: window.HTMLElement, Event: window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    restore.push(() => { if (previous) Object.defineProperty(globalThis, key, previous); else Reflect.deleteProperty(globalThis, key); });
  }
  const container = window.document.getElementById('root')!;
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(container);
  await act(async () => root.render(children));
  return { container, unmount: () => act(async () => root.unmount()) };
}

test('Dashboard remains outside collapsed navigation; all grouped sections use real links', async () => {
  const ui = await mount(<RouterProvider router={createMemoryRouter([{ path: '*', element: <Harness /> }], { initialEntries: ['/campaigns/florence/settings'] })} />);
  try {
    const dashboard = ui.container.querySelector('a')!;
    const nav = ui.container.querySelector('nav')!;
    expect(dashboard.textContent).toBe('Dashboard');
    expect(dashboard.getAttribute('href')).toBe('/campaigns/florence/dashboard');
    expect(nav.contains(dashboard)).toBe(false);
    expect(nav.querySelectorAll('a')).toHaveLength(11);
    expect(Array.from(nav.querySelectorAll('h2')).map(node => node.textContent)).toEqual(['Campaign', 'Systems', 'Administration']);
    const toggle = ui.container.querySelector('button')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await act(async () => { toggle.click(); });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    await act(async () => { (nav.querySelector('a[href*="tab=appearance"]') as HTMLAnchorElement).click(); });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe('appearance');
  } finally { await ui.unmount(); }
});

test('direct request links survive entry, section changes push history, and Back/Forward restore active sections', async () => {
  const router = createMemoryRouter([{ path: '*', element: <Harness /> }], { initialEntries: ['/campaigns/florence/settings?tab=recruitment&request=invite-id'] });
  const ui = await mount(<RouterProvider router={router} />);
  try {
    expect(ui.container.querySelector('[aria-current="page"]')?.textContent).toBe('recruitment');
    expect(router.state.location.search).toContain('request=invite-id');
    await act(async () => { (ui.container.querySelector('a[href*="tab=safety-privacy"]') as HTMLAnchorElement).click(); });
    expect(router.state.location.search).toBe('?tab=safety-privacy');
    await act(async () => { await router.navigate(-1); });
    expect(router.state.location.search).toContain('request=invite-id');
    expect(ui.container.querySelector('[aria-current="page"]')?.textContent).toBe('recruitment');
    await act(async () => { await router.navigate(1); });
    expect(ui.container.querySelector('[aria-current="page"]')?.textContent).toBe('safety-privacy');
  } finally { await ui.unmount(); }
});
