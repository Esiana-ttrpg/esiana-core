import { afterEach, expect, test, vi } from 'vitest';
import { act } from 'react';
import { parseHTML } from 'linkedom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SessionNotesView } from './SessionNotesView';

const fixture = vi.hoisted(() => ({ role: 'GAMEMASTER', member: true, canManage: true }));
vi.mock('@/contexts/WikiContext', () => ({
  useWiki: () => ({ campaign: { role: fixture.role, isMember: fixture.member }, flatPages: [] }),
}));
vi.mock('@/lib/wiki', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/wiki')>(),
  fetchSessionNotesIndex: async () => ({ notebooks: [], uncategorized: [], canManage: fixture.canManage }),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => ({
  'campaign.timeline.sessionNotesCreateNewPage': 'Create New Page',
  'campaign.timeline.sessionNotesUploadPage': 'Upload Page',
  'campaign.timeline.sessionNotesCreateNewSession': 'Create New Session',
  'campaign.timeline.sessionNotesOrganize': 'Organize',
  'campaign.timeline.sessionNotesTabNotes': 'Notes',
  'campaign.timeline.sessionNotesTabAttendance': 'Attendance',
  'campaign.timeline.sessionNotesTabRecaps': 'Recaps',
} as Record<string, string>)[key] ?? key }) }));

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
  await act(async () => root.render(<MemoryRouter initialEntries={['/campaigns/test/session-notes']}>
    <Routes><Route path="/campaigns/:campaignHandle/session-notes" element={<SessionNotesView />} /></Routes>
  </MemoryRouter>));
  return { container, unmount: () => act(async () => root.unmount()) };
}

function button(container: Element, text: string) {
  return [...container.querySelectorAll('button')].find(item => item.textContent?.trim() === text);
}

test('managers get one creation menu and a separate organize action', async () => {
  Object.assign(fixture, { role: 'GAMEMASTER', member: true, canManage: true });
  const ui = await mount();
  try {
    expect([...ui.container.querySelectorAll('[role="tab"]')].map(tab => tab.textContent)).toEqual(['Notes', 'Attendance', 'Recaps']);
    expect(button(ui.container, 'Organize')).toBeTruthy();
    expect(button(ui.container, 'Upload Page')).toBeUndefined();
    await act(async () => button(ui.container, 'Create')!.click());
    for (const label of ['Create New Page', 'Upload Page', 'Create New Session', 'Schedule next session', 'Create New Heading/Group']) {
      expect(button(ui.container, label)).toBeTruthy();
    }
    await act(async () => button(ui.container, 'Upload Page')!.click());
    expect(ui.container.querySelector('input[type="file"]')).toBeTruthy();
  } finally { await ui.unmount(); }
});

test('non-members have no creation or organize controls', async () => {
  Object.assign(fixture, { role: 'PLAYER', member: false, canManage: false });
  const ui = await mount();
  try {
    expect(button(ui.container, 'Create')).toBeUndefined();
    expect(button(ui.container, 'Organize')).toBeUndefined();
    expect(button(ui.container, '+ Write Session Note')).toBeUndefined();
  } finally { await ui.unmount(); }
});

test('ordinary members get only authorized creation options and a usable empty state', async () => {
  Object.assign(fixture, { role: 'PLAYER', member: true, canManage: false });
  const ui = await mount();
  try {
    expect(button(ui.container, 'Organize')).toBeUndefined();
    await act(async () => button(ui.container, 'Create')!.click());
    expect(button(ui.container, 'Create New Page')).toBeTruthy();
    expect(button(ui.container, 'Upload Page')).toBeTruthy();
    expect(button(ui.container, 'Create New Session')).toBeUndefined();
    expect(button(ui.container, 'Create New Heading/Group')).toBeUndefined();
    await act(async () => button(ui.container, '+ Write Session Note')!.click());
    expect(ui.container.textContent).toContain('Ask your GM to create the first session.');
  } finally { await ui.unmount(); }
});

test('writer group management follows the server capability flag', async () => {
  Object.assign(fixture, { role: 'WRITER', member: true, canManage: false });
  const ui = await mount();
  try {
    expect(button(ui.container, 'Organize')).toBeUndefined();
    await act(async () => button(ui.container, 'Create')!.click());
    expect(button(ui.container, 'Create New Session')).toBeTruthy();
    expect(button(ui.container, 'Schedule next session')).toBeTruthy();
    expect(button(ui.container, 'Create New Heading/Group')).toBeUndefined();
  } finally { await ui.unmount(); }
});
