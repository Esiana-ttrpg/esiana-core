import { afterEach, expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { SessionScheduleCard } from './widgets/SessionScheduleCard';
import { LastSessionNotesWidget } from './widgets/LastSessionNotesWidget';
import { QuickUtilityNav } from './widgets/QuickUtilityNav';
import { DashboardPresentationContext } from './DashboardWidgetShell';
import type { DashboardSessionFollowUp } from '@shared/dashboardSessions';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/contexts/WikiContext', () => ({ useWiki: () => ({ resolvePageId: () => undefined, flatPages: [] }) }));
afterEach(() => vi.useRealTimers());
const render = (element: React.ReactNode) => renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
const lastSession = { timelinePointId: 'session-3', title: 'Previous Session', sequenceOrder: 3,
  plannedStartAt: '2026-10-24T19:00:00Z', playedAt: '2026-10-24T19:00:00Z', snippet: null };
const followUp: DashboardSessionFollowUp = {
  myNotes: { state: 'not_added', href: '/campaigns/review/notes/session-3?notes=mine&edit=1', canEdit: true },
  contributors: [{ userId: 'sable', label: 'Sable', href: '/campaigns/review/notes/session-3/all' }],
  notesHref: '/campaigns/review/notes/session-3/all', media: null,
};

test('standard schedule has a strong date, title, number, location, and direct session link', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-01T00:00:00Z'));
  const html = render(<SessionScheduleCard campaignHandle="review" canManageCampaign={false} schedule={{ day: null, time: null, frequency: null }} nextSession={{
    timelinePointId: 'session-4', title: 'Across the Glasswater', sequenceOrder: 4,
    plannedStartAt: '2026-11-07T19:00:00Z', plannedEndAt: '2026-11-07T22:00:00Z', timezone: 'UTC', venueLabel: 'Juniper’s home',
  }} />);
  expect(html).toContain('data-session-state="scheduled"');
  expect(html).toContain('>7</p>');
  expect(html).toContain('Across the Glasswater');
  expect(html).toContain('Session 4');
  expect(html).toContain('Starts in');
  expect(html).toContain('Juniper');
  expect(html).toContain('href="/campaigns/review/notes/session-4"');
});

test.each(['COMPLETED', 'CANCELLED', 'SKIPPED'])('%s schedule state does not offer attendance or a misleading countdown', status => {
  const html = render(<SessionScheduleCard campaignHandle="review" canManageCampaign={false} schedule={{ day: null, time: null, frequency: null }} nextSession={{
    timelinePointId: 'session-4', title: 'Across the Glasswater', sequenceOrder: 4, plannedStartAt: '2026-11-07T19:00:00Z', status,
  }} />);
  expect(html).toContain(`data-session-state="${status.toLowerCase()}"`);
  expect(html).not.toContain('Starts in');
  expect(html).not.toContain('Attending');
});

test('last session emphasizes adding notes, visible contributors, and omits disabled audio', () => {
  const html = render(<LastSessionNotesWidget campaignHandle="review" lastSession={{ ...lastSession, followUp }} />);
  expect(html).toContain('Add your notes');
  expect(html).toContain('notes=mine&amp;edit=1');
  expect(html).toContain('1 visible contributor');
  expect(html).toContain('Sable');
  expect(html).not.toContain('Session media');
  expect(html).not.toContain('Transcript');
});

test('inaccessible notes are never labeled missing and cannot offer an edit action', () => {
  const html = render(<LastSessionNotesWidget campaignHandle="review" lastSession={{ ...lastSession,
    followUp: { ...followUp, myNotes: { state: 'unavailable', href: null, canEdit: false }, contributors: [] },
  }} />);
  expect(html).toContain('Unavailable to you');
  expect(html).not.toContain('Not added');
  expect(html).not.toContain('Add your notes');
  expect(html).not.toContain('Edit your notes');
});

test.each(['queued', 'processing', 'failed', 'ready'] as const)('last session displays authorized %s transcript status', state => {
  const html = render(<LastSessionNotesWidget campaignHandle="review" lastSession={{ ...lastSession, followUp: {
    ...followUp, myNotes: { ...followUp.myNotes, state: 'added' },
    media: { audio: { available: true, href: '/recording', durationMs: 120000 }, transcript: { state, href: state === 'ready' ? '/transcript' : null } },
  } }} />);
  expect(html).toContain('View / Edit your notes');
  expect(html).toContain('Audio available');
  expect(html).toContain(state === 'failed' ? 'needs attention' : state === 'ready' ? 'View transcript' : state);
});

test.each(['compact', 'standard'] as const)('mixed quick links remain ordered and safe in %s presentation', variant => {
  const html = render(<DashboardPresentationContext.Provider value={{ variant, autoHeight: true }}>
    <QuickUtilityNav campaignHandle="review" config={{ links: ['maps', { kind: 'external', id: 'atlas', label: 'Shared atlas', url: 'https://example.com/world', icon: 'book' }, 'sessionNotes'] }} />
  </DashboardPresentationContext.Provider>);
  expect(html.indexOf('/campaigns/review/maps')).toBeLessThan(html.indexOf('https://example.com/world'));
  expect(html.indexOf('https://example.com/world')).toBeLessThan(html.indexOf('/campaigns/review/notes'));
  expect(html).toContain('target="_blank"');
  expect(html).toContain('rel="noopener noreferrer"');
  expect(html).toContain('opens in a new tab');
});

test('quick-link editing requires configuration permission and unsafe saved links stay inert', () => {
  const html = render(<QuickUtilityNav campaignHandle="review" customizeMode canConfigure={false} config={{ links: [
    { kind: 'external', id: 'unsafe', label: 'Unsafe', url: 'javascript:alert(1)' }, 'maps',
  ] }} />);
  expect(html).not.toContain('<form');
  expect(html).not.toContain('javascript:');
  expect(html).toContain('/campaigns/review/maps');
});

test('authorized managers see navigation without configuration forms in normal view', () => {
  const html = render(<QuickUtilityNav campaignHandle="review" canConfigure config={{ links: [
    'maps', { kind: 'external', id: 'atlas', label: 'Shared atlas', url: 'https://example.com/world' },
  ] }} />);
  expect(html).toContain('aria-label="Campaign quick links"');
  expect(html).toContain('Shared atlas');
  expect(html).not.toContain('<form');
  expect(html).not.toContain('Configure links');
});

test('Quick Links configuration is a collapsed disclosure in widget editing mode', () => {
  const html = render(<QuickUtilityNav campaignHandle="review" canConfigure customizeMode config={{ links: ['maps'] }} />);
  expect(html).toContain('<details');
  expect(html).not.toMatch(/<details[^>]*\bopen(?:=|\s|>)/);
  expect(html).toContain('Configure links</summary>');
  expect(html).toContain('aria-label="Add external resource"');
  expect(html).toMatch(/aria-label="Move [^"]+ earlier"/);
});
