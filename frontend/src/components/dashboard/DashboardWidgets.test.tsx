import { expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { CampaignCurrentStory } from './CampaignCurrentStory';
import { CampaignPartySurface } from './CampaignPartySurface';
import { DashboardPresentationContext, DashboardWidgetShell } from './DashboardWidgetShell';

test('a quest title appears once, with real progress and a direct continuation link', () => {
  const html = renderToStaticMarkup(<MemoryRouter><CampaignCurrentStory story={{
    arcTitle: 'The missing atlas', arcProse: null, adventureHref: '/world', activeThread: null,
    activeQuest: { id: 'atlas', title: 'The missing atlas', href: '/quests/atlas', roleLabel: 'Active quest',
      progress: { completed: 2, total: 5, percent: 40 } },
  }} /></MemoryRouter>);
  expect(html.match(/The missing atlas/g)).toHaveLength(1);
  expect(html).toContain('2 of 5 objectives complete');
  expect(html).toContain('href="/quests/atlas"');
  expect(html).toContain('Continue story');
});

test('empty stories offer discovery without inventing a title or description', () => {
  const html = renderToStaticMarkup(<MemoryRouter><CampaignCurrentStory story={{
    arcTitle: null, arcProse: null, activeQuest: null, activeThread: null, adventureHref: '/world',
  }} /></MemoryRouter>);
  expect(html).not.toContain('<h2');
  expect(html).not.toContain('<progress');
  expect(html).toContain('Explore the world');
});

test('large parties show six previews and navigation, and accept missing portraits and long names', () => {
  const html = renderToStaticMarkup(<MemoryRouter><CampaignPartySurface embedded roster={{
    href: '/party', members: Array.from({ length: 20 }, (_, i) => ({ id: String(i),
      title: `Juniper ${i} ${'Vale '.repeat(20)}`, href: `/character/${i}`, tagline: null,
      portraitUrl: i === 0 ? '/portrait.png' : null,
    })),
  }} /></MemoryRouter>);
  expect(html.match(/href="\/character\//g)).toHaveLength(6);
  expect(html).toContain('All characters');
  expect(html).toContain('src="/portrait.png"');
  expect(html).not.toContain('undefined');
});

test('shared shells use compact loading and error states without stale previews', () => {
  const loading = renderToStaticMarkup(<DashboardPresentationContext.Provider value={{ variant: 'compact', autoHeight: true }}>
    <DashboardWidgetShell title="World" loading>Stale preview</DashboardWidgetShell>
  </DashboardPresentationContext.Provider>);
  expect(loading).toContain('data-dashboard-variant="compact"');
  expect(loading).toContain('animate-pulse');
  expect(loading).not.toContain('Stale preview');
  const error = renderToStaticMarkup(<DashboardWidgetShell title="World" error="Unable to load world">Stale preview</DashboardWidgetShell>);
  expect(error).toContain('role="alert"');
  expect(error).not.toContain('Stale preview');
});

test('compact party previews reduce density while retaining the full roster link', () => {
  const html = renderToStaticMarkup(<MemoryRouter>
    <DashboardPresentationContext.Provider value={{ variant: 'compact', autoHeight: true }}>
      <CampaignPartySurface embedded roster={{ href: '/party', members: Array.from({ length: 8 }, (_, i) => ({
        id: String(i), title: `Character ${i}`, href: `/character/${i}`, tagline: null,
      })) }} />
    </DashboardPresentationContext.Provider>
  </MemoryRouter>);
  expect(html.match(/href="\/character\//g)).toHaveLength(3);
  expect(html).toContain('href="/party"');
});
