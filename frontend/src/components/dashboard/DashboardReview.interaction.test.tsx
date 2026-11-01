import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { act, useState, type ReactNode } from 'react';
import { parseHTML } from 'linkedom';
import { CampaignDashboardHero } from './CampaignDashboardHero';
import { DashboardGrid } from './DashboardGrid';
import { getDefaultDashboardConfig, type DashboardConfig } from '@/lib/dashboardConfig';
import type { CampaignDetail } from '@/types/campaign';
import type { DashboardSummary } from '@/lib/dashboardSummary';
import { fetchDashboardBundle, updateDashboardLayout } from '@/lib/dashboard';

vi.mock('react-i18next', async importOriginal => ({ ...await importOriginal<typeof import('react-i18next')>(), useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/contexts/WikiContext', () => ({ useWiki: () => ({ flatPages: [], tree: [], resolvePageId: () => undefined }) }));
vi.mock('@/hooks/useCampaignInviteLink', () => ({ useCampaignInviteLink: () => ({ inviteUrl: 'https://example.org/invite', loading: false }) }));
vi.mock('./CampaignPresentationSheet', () => ({ CampaignPresentationSheet: ({ open }: { open: boolean }) => open ? <div>Hero editor</div> : null }));
vi.mock('react-grid-layout/legacy', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/lib/dashboard', () => ({ fetchDashboardBundle: vi.fn(), updateDashboardLayout: vi.fn() }));
const restore: (() => void)[] = [];
afterEach(() => { vi.useRealTimers(); vi.resetAllMocks(); for (const cleanup of restore.splice(0).reverse()) cleanup(); });
async function mount(children: ReactNode) {
  const { window } = parseHTML('<html><body><div id="root"></div></body></html>');
  window.HTMLElement.prototype.getBoundingClientRect = () => ({ width: 960, height: 100 }) as DOMRect;
  const alert = vi.fn(); window.alert = alert;
  for (const [key, value] of Object.entries({ window, document: window.document, HTMLElement: window.HTMLElement, Event: window.Event, ResizeObserver: class { observe() {} disconnect() {} }, IS_REACT_ACT_ENVIRONMENT: true })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    restore.push(() => { if (previous) Object.defineProperty(globalThis, key, previous); else Reflect.deleteProperty(globalThis, key); });
  }
  const { createRoot } = await import('react-dom/client');
  const container = window.document.getElementById('root')!;
  const root = createRoot(container);
  await act(async () => root.render(<MemoryRouter>{children}</MemoryRouter>));
  return { container, alert, unmount: () => act(async () => root.unmount()) };
}

test.each([[false, false], [true, false], [false, true], [true, true]])('hero gates layout editing separately from management (manage %s, edit %s)', async (canManage, canEditLayout) => {
  const ui = await mount(<CampaignDashboardHero campaignHandle="review" campaign={{} as CampaignDetail} campaignName="Glasswater" fallbackDescription={null}
    hero={getDefaultDashboardConfig().hero} statusStrip={{} as DashboardSummary['statusStrip']} canManage={canManage} canEditLayout={canEditLayout}
    customizeMode={false} layoutSaving={false} onCustomizeModeChange={vi.fn()} onHeroChange={vi.fn()} />);
  try {
    const menu = ui.container.querySelector('button[aria-label="Campaign actions"]');
    expect(!!menu).toBe(canManage || canEditLayout);
    if (menu) await act(async () => { menu.dispatchEvent(new Event('click', { bubbles: true })); });
    expect(ui.container.textContent?.includes('Customize layout')).toBe(canEditLayout);
    expect(ui.container.textContent?.includes('Edit presentation')).toBe(canEditLayout);
    expect(ui.container.textContent?.includes('Copy invite link')).toBe(canManage);
    expect(ui.container.textContent?.includes('Add a tagline')).toBe(canEditLayout);
  } finally { await ui.unmount(); }
});

test('a failed feed refresh keeps a successful layout save without a save-failed alert', async () => {
  vi.useFakeTimers();
  vi.mocked(updateDashboardLayout).mockImplementation(async (_handle, config) => config);
  vi.mocked(fetchDashboardBundle).mockRejectedValue(new Error('Feed unavailable'));
  const initial: DashboardConfig = { ...getDefaultDashboardConfig(), layoutMode: 'custom', widgets: [
    { id: 'text', enabled: true, x: 0, y: 0, w: 6, h: 3, config: { title: 'Our discoveries', text: 'Campaign memory' } },
    { id: 'campaignMap', enabled: false, x: 6, y: 0, w: 6, h: 3 },
  ] };
  const feeds = vi.fn();
  function Host() {
    const [config, setConfig] = useState(initial);
    return <DashboardGrid campaignHandle="review" config={config} onConfigChange={setConfig} summary={{} as DashboardSummary} questPages={[]}
      threadBundle={{ living: [], recentlyResolved: [], theories: [] }} canEditLayout canManageCampaign canManageTime
      isLookingForGroup={false} sessionDuration={null} campaignDescription={null} customizeMode onWidgetFeedsChange={feeds} />;
  }
  const ui = await mount(<Host />);
  try {
    const addMap = [...ui.container.querySelectorAll('button')].find(button => button.textContent?.includes('Campaign Map'))!;
    expect(addMap).toBeTruthy();
    await act(async () => { addMap.dispatchEvent(new Event('click', { bubbles: true })); });
    await act(async () => { vi.advanceTimersByTime(450); });
    expect(updateDashboardLayout).toHaveBeenCalledOnce();
    expect(fetchDashboardBundle).toHaveBeenCalledOnce();
    expect(ui.alert).not.toHaveBeenCalled(); expect(feeds).not.toHaveBeenCalled();
    expect(ui.container.textContent).toContain('No map is available to display.');
  } finally { await ui.unmount(); }
});
