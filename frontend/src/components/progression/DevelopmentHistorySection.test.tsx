import { afterEach, expect, test, vi } from 'vitest';
import { act } from 'react';
import { parseHTML } from 'linkedom';
import { MemoryRouter } from 'react-router-dom';
import { DevelopmentHistorySection } from './DevelopmentHistorySection';

const fixture = vi.hoisted(() => ({ fetchHistory: vi.fn() }));
vi.mock('@/contexts/WikiContext', () => ({ useWiki: () => ({ canManageWiki: true }) }));
vi.mock('@/lib/worldDevelopmentApi', () => ({ fetchDevelopmentHistory: fixture.fetchHistory, requeueArchivedDevelopment: vi.fn() }));

const restore: (() => void)[] = [];
afterEach(() => { for (const cleanup of restore.splice(0).reverse()) cleanup(); });

test('History Refine applies and resets statuses and reports failed loads', async () => {
  const { window } = parseHTML('<html><body><div id="root"></div></body></html>');
  window.document.oninput = null;
  for (const [key, value] of Object.entries({ window, document: window.document, Node: window.Node,
    HTMLElement: window.HTMLElement, Event: window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    restore.push(() => previous ? Object.defineProperty(globalThis, key, previous) : Reflect.deleteProperty(globalThis, key));
  }
  fixture.fetchHistory.mockReset().mockResolvedValueOnce({ history: [] })
    .mockResolvedValueOnce({ history: [{ id: 'a', title: 'A development', status: 'accepted', statusLabel: 'Accepted' }] })
    .mockRejectedValueOnce(new Error('History unavailable'))
    .mockResolvedValueOnce({ history: [] });
  const container = window.document.getElementById('root')!;
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(container);
  const button = (text: string) => [...container.querySelectorAll('button')].find(item => item.textContent?.trim() === text);
  try {
    await act(async () => root.render(<MemoryRouter><DevelopmentHistorySection campaignHandle="test" /></MemoryRouter>));
    await act(async () => button('Refine')!.click());
    expect(container.querySelector('input[aria-label="Search developments…"]')).toBeTruthy();
    await act(async () => button('Accepted')!.click());
    expect(fixture.fetchHistory).toHaveBeenLastCalledWith('test', { status: ['accepted'], q: undefined });
    expect(container.textContent).toContain('A development');
    await act(async () => button('Reset refine')!.click());
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('History unavailable');
    expect(container.textContent).not.toContain('No matching history entries');
    await act(async () => button('Try again')!.click());
    expect(fixture.fetchHistory).toHaveBeenLastCalledWith('test', { status: undefined, q: undefined });
    expect(container.textContent).toContain('No matching history entries');
    let rejectOld!: (reason: Error) => void;
    let resolveNew!: (value: unknown) => void;
    fixture.fetchHistory.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOld = reject; }))
      .mockImplementationOnce(() => new Promise(resolve => { resolveNew = resolve; }));
    await act(async () => button('Accepted')!.click());
    await act(async () => button('Rejected')!.click());
    await act(async () => resolveNew({ history: [{ id: 'new', title: 'Latest result', status: 'accepted', statusLabel: 'Accepted' }] }));
    await act(async () => rejectOld(new Error('Stale failure')));
    expect(container.textContent).toContain('Latest result');
    expect(container.querySelector('[role="alert"]')).toBeNull();
    fixture.fetchHistory.mockResolvedValue({ history: [] });
    vi.useFakeTimers();
    const search = container.querySelector<HTMLInputElement>('input[aria-label="Search developments…"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(search), 'value')!.set!.call(search, 'never-apply');
      search.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    await act(async () => button('Reset refine')!.click());
    await act(async () => vi.advanceTimersByTime(250));
    expect(fixture.fetchHistory).toHaveBeenLastCalledWith('test', { status: undefined, q: undefined });
    expect(fixture.fetchHistory.mock.calls.some(([, query]) => query?.q === 'never-apply')).toBe(false);
    await act(async () => {
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(search), 'value')!.set!.call(search, 'lantern');
      search.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    const refineTrigger = container.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')!;
    await act(async () => refineTrigger.click());
    await act(async () => vi.advanceTimersByTime(250));
    expect(fixture.fetchHistory).toHaveBeenLastCalledWith('test', expect.objectContaining({ q: 'lantern' }));
    await act(async () => refineTrigger.click());
    const reopened = container.querySelector<HTMLInputElement>('input[aria-label="Search developments…"]')!;
    expect(reopened.value).toBe('lantern');
    await act(async () => {
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(reopened), 'value')!.set!.call(reopened, 'canceled');
      reopened.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    await act(async () => button('Reset refine')!.click());
    await act(async () => vi.advanceTimersByTime(250));
    expect(fixture.fetchHistory).toHaveBeenLastCalledWith('test', { status: undefined, q: undefined });
    expect(fixture.fetchHistory.mock.calls.some(([, query]) => query?.q === 'canceled')).toBe(false);
    vi.useRealTimers();
  } finally { vi.useRealTimers(); await act(async () => root.unmount()); }
});

test('a stale successful History response cannot replace the newest filtered result', async () => {
  const { window } = parseHTML('<html><body><div id="root"></div></body></html>');
  for (const [key, value] of Object.entries({ window, document: window.document, Node: window.Node,
    HTMLElement: window.HTMLElement, Event: window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    restore.push(() => previous ? Object.defineProperty(globalThis, key, previous) : Reflect.deleteProperty(globalThis, key));
  }
  let resolveOld!: (value: unknown) => void;
  let resolveNew!: (value: unknown) => void;
  fixture.fetchHistory.mockReset().mockResolvedValueOnce({ history: [] })
    .mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
    .mockImplementationOnce(() => new Promise(resolve => { resolveNew = resolve; }));
  const container = window.document.getElementById('root')!;
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(container);
  const button = (text: string) => [...container.querySelectorAll('button')].find(item => item.textContent?.trim() === text);
  try {
    await act(async () => root.render(<MemoryRouter><DevelopmentHistorySection campaignHandle="test" /></MemoryRouter>));
    await act(async () => button('Refine')!.click());
    await act(async () => button('Accepted')!.click());
    await act(async () => button('Rejected')!.click());
    await act(async () => resolveNew({ history: [{ id: 'new', title: 'Newest result', status: 'accepted', statusLabel: 'Accepted' }] }));
    await act(async () => resolveOld({ history: [{ id: 'old', title: 'Stale result', status: 'accepted', statusLabel: 'Accepted' }] }));
    expect(container.textContent).toContain('Newest result');
    expect(container.textContent).not.toContain('Stale result');
  } finally { await act(async () => root.unmount()); }
});
