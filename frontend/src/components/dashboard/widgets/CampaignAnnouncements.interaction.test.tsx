import { afterEach, expect, test, vi } from 'vitest';
import { act, type ReactNode } from 'react';
import { parseHTML } from 'linkedom';
import { CampaignAnnouncementsWidget } from './CampaignAnnouncementsWidget';
import { fetchCampaignAnnouncements, saveCampaignAnnouncement, deleteCampaignAnnouncement } from '@/lib/dashboard';
import type { CampaignAnnouncement, DashboardCampaignFeatures } from '@shared/dashboardCampaignFeatures';

vi.mock('@/contexts/WikiContext', () => ({ useWiki: () => ({ tree: [] }) }));
vi.mock('@/lib/dashboard', () => ({ fetchCampaignAnnouncements: vi.fn(), saveCampaignAnnouncement: vi.fn(), deleteCampaignAnnouncement: vi.fn() }));
vi.mock('@/components/wiki/WikiTipTapEditor', () => ({ WikiTipTapEditor: () => <div>Existing formatted editor</div> }));
const restore: (() => void)[] = [];
afterEach(() => { vi.useRealTimers(); vi.resetAllMocks(); for (const cleanup of restore.splice(0).reverse()) cleanup(); });

async function mount(children: ReactNode) {
  const { window } = parseHTML('<html><body><div id="root"></div></body></html>');
  window.document.oninput = null;
  for (const [key, value] of Object.entries({ window, document: window.document, HTMLElement: window.HTMLElement, Event: window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    restore.push(() => { if (previous) Object.defineProperty(globalThis, key, previous); else Reflect.deleteProperty(globalThis, key); });
  }
  const { createRoot } = await import('react-dom/client');
  const container = window.document.getElementById('root')!;
  const root = createRoot(container);
  await act(async () => root.render(children));
  return { container, render: (next: ReactNode) => act(async () => root.render(next)), unmount: () => act(async () => root.unmount()) };
}
const notice: CampaignAnnouncement = { id: 'notice', title: 'Saturday at seven', message: '**Bring a discovery.**', style: 'information', link: null, expiresAt: null, createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' };
const features: DashboardCampaignFeatures = { map: null, spotlight: null, mapOptions: [], announcements: [notice], actions: [], statistics: null };
const props = { id: 'campaignAnnouncements', campaignHandle: 'review', features, onConfigChange: vi.fn() };

test('announcement management is lazy, saves against its version, and removes records through existing CRUD', async () => {
  vi.mocked(fetchCampaignAnnouncements).mockResolvedValue({ announcements: [notice] });
  vi.mocked(saveCampaignAnnouncement).mockResolvedValue({ announcements: [{ ...notice, title: 'A different evening' }] });
  vi.mocked(deleteCampaignAnnouncement).mockResolvedValue(undefined);
  const ui = await mount(<CampaignAnnouncementsWidget {...props} customizeMode />);
  try {
    expect(ui.container.querySelector('form')).toBeNull();
    const details = ui.container.querySelector('details')!;
    await act(async () => { details.open = true; details.dispatchEvent(new Event('toggle')); });
    const edit = [...ui.container.querySelectorAll('button')].find(button => button.textContent?.startsWith('Edit'))!;
    await act(async () => { edit.dispatchEvent(new Event('click', { bubbles: true })); });
    const title = ui.container.querySelector('input')!;
    title.setAttribute('type', 'text');
    await act(async () => {
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(title), 'value')!.set!.call(title, 'A different evening');
      title.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => { ui.container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(saveCampaignAnnouncement).toHaveBeenCalledWith('review', expect.objectContaining({ title: 'A different evening' }), notice);
    const previousConfirm = window.confirm; window.confirm = () => true;
    try {
      const remove = [...ui.container.querySelectorAll('button')].find(button => button.textContent?.startsWith('Remove'))!;
      await act(async () => { remove.dispatchEvent(new Event('click', { bubbles: true })); });
      expect(deleteCampaignAnnouncement).toHaveBeenCalledWith('review', 'notice');
      expect(ui.container.textContent).toContain('No active announcements.');
    } finally { window.confirm = previousConfirm; }
    await ui.render(<CampaignAnnouncementsWidget {...props} />);
    expect(ui.container.querySelector('form')).toBeNull();
    expect(ui.container.textContent).not.toContain('Manage announcements');
  } finally { await ui.unmount(); }
});
test('expiration removes a notice while the page remains open without polling', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-31T00:00:00Z'));
  const ui = await mount(<CampaignAnnouncementsWidget {...props} features={{ ...features, announcements: [{ ...notice, expiresAt: '2026-10-31T00:00:01Z' }] }} />);
  try {
    expect(ui.container.textContent).toContain('Saturday at seven');
    await act(async () => { vi.advanceTimersByTime(1100); });
    expect(ui.container.textContent).toContain('No active announcements.');
    expect(fetchCampaignAnnouncements).not.toHaveBeenCalled();
  } finally { await ui.unmount(); }
});
