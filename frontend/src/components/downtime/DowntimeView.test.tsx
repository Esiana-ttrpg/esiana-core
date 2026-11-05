import { afterEach, expect, test, vi } from 'vitest';
import { act } from 'react';
import { parseHTML } from 'linkedom';
import { MemoryRouter } from 'react-router-dom';
import { DowntimeView } from './DowntimeView';

const fixture = vi.hoisted(() => ({
  capabilities: new Set<string>(),
  load: vi.fn(),
  openAdd: vi.fn(),
  openSettings: vi.fn(),
  openQuickAction: vi.fn(),
}));
vi.mock('@/contexts/WikiContext', () => ({ useWiki: () => ({ flatPages: [], refresh: vi.fn(), campaign: { isMember: true }, can: (cap: string) => fixture.capabilities.has(cap) }) }));
vi.mock('@/lib/downtime', () => ({ fetchDowntimeHub: fixture.load }));
vi.mock('@/components/downtime/DowntimeLedgerSection', async () => {
  const { forwardRef, useImperativeHandle, createElement } = await import('react');
  return { DowntimeLedgerSection: forwardRef((_props, ref) => {
    useImperativeHandle(ref, () => ({ openAdd: fixture.openAdd, openSettings: fixture.openSettings, openQuickAction: fixture.openQuickAction }));
    return createElement('div', null, 'Ledger loaded');
  }) };
});
vi.mock('@/components/downtime/DowntimeOverviewSection', () => ({ DowntimeOverviewSection: () => null }));
vi.mock('@/components/downtime/DowntimeWorldEventsSection', () => ({ DowntimeWorldEventsSection: () => null }));
vi.mock('@/components/downtime/DowntimeProjectsSection', () => ({ DowntimeProjectsSection: () => null }));
vi.mock('@/components/downtime/DowntimeHavensSection', () => ({ DowntimeHavensSection: () => null }));
vi.mock('@/components/downtime/DowntimePeopleSection', () => ({ DowntimePeopleSection: () => null }));
vi.mock('@/components/downtime/DowntimeReputationSection', () => ({ DowntimeReputationSection: () => null }));
vi.mock('@/components/downtime/CreateProjectModal', () => ({ CreateProjectModal: () => null }));
vi.mock('@/components/downtime/CreateHavenModal', () => ({ CreateHavenModal: () => null }));
vi.mock('@/components/downtime/AddDowntimePersonModal', () => ({ AddDowntimePersonModal: () => null }));
vi.mock('@/components/downtime/AddLedgerEntryModal', () => ({ AddLedgerEntryModal: () => null }));

const restore: (() => void)[] = [];
afterEach(() => { for (const cleanup of restore.splice(0).reverse()) cleanup(); });

test('ledger actions appear only when their section is ready and respect capabilities', async () => {
  const { window } = parseHTML('<html><body><div id="root"></div></body></html>');
  for (const [key, value] of Object.entries({ window, document: window.document, Node: window.Node,
    HTMLElement: window.HTMLElement, Event: window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    restore.push(() => previous ? Object.defineProperty(globalThis, key, previous) : Reflect.deleteProperty(globalThis, key));
  }
  let finish!: (value: unknown) => void;
  fixture.capabilities = new Set(['ledger.contribute']);
  fixture.openAdd.mockClear();
  fixture.load.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const container = window.document.getElementById('root')!;
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(container);
  const findButton = (label: string) => [...container.querySelectorAll('button')].find(button => button.textContent?.trim() === label);
  const page = () => <MemoryRouter initialEntries={['/downtime?section=ledger']}>
    <DowntimeView campaignHandle="test" categoryPageId="downtime" />
  </MemoryRouter>;
  try {
    await act(async () => root.render(page()));
    expect(findButton('Add entry')).toBeUndefined();
    await act(async () => finish({ ledger: { feed: [], treasury: { sharedTreasuryEnabled: true } } }));
    expect(findButton('Settings')).toBeUndefined();
    expect(findButton('Contribute')).toBeTruthy();
    await act(async () => findButton('Add entry')!.click());
    expect(fixture.openAdd).toHaveBeenCalledOnce();
    await act(async () => findButton('Fund project')!.click());
    expect(fixture.openQuickAction).toHaveBeenCalledWith('fund_project');
    fixture.capabilities = new Set(['downtime.manage']);
    await act(async () => root.render(page()));
    await act(async () => findButton('Settings')!.click());
    expect(fixture.openSettings).toHaveBeenCalledOnce();
    expect(findButton('Add entry')).toBeTruthy();
    fixture.capabilities = new Set();
    await act(async () => root.render(page()));
    expect(findButton('Settings')).toBeUndefined();
    expect(findButton('Contribute')).toBeUndefined();
    expect(findButton('Add entry')).toBeUndefined();
  } finally { await act(async () => root.unmount()); }
});
