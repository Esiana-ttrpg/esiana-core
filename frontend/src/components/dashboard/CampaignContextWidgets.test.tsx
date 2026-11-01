import { expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { CampaignContextWidget, NeedsAttentionWidget, CampaignStatisticsWidget } from './widgets/CampaignContextWidgets';
import { CampaignAnnouncementsWidget } from './widgets/CampaignAnnouncementsWidget';
import { statisticComparison, statisticText } from '@/pages/CampaignStatisticsPage';
import type { DashboardCampaignFeatures, CampaignStatistic } from '@shared/dashboardCampaignFeatures';
import { metricValue, metricUnavailable } from '@shared/metricValue';

vi.mock('@/contexts/WikiContext', () => ({ useWiki: () => ({ flatPages: [], tree: [] }) }));
vi.mock('@/components/wiki/WikiTipTapEditor', () => ({ WikiTipTapEditor: () => <div>Formatted editor</div> }));
const features: DashboardCampaignFeatures = { map: null, spotlight: { id: 'city', title: 'Glasswater', type: 'LOCATION', href: '/campaigns/review/wiki/glasswater', imageUrl: null, excerpt: 'A city of bridges.' }, mapOptions: [], actions: [], announcements: [], statistics: null };
const props = { id: 'pageSpotlight', campaignHandle: 'review', features, onConfigChange: vi.fn() };
const render = (children: React.ReactNode) => renderToStaticMarkup(<MemoryRouter>{children}</MemoryRouter>);
test('spotlight preserves canonical navigation and intro while configuration stays in editing mode', () => {
  const html = render(<CampaignContextWidget {...props} config={{ introduction: 'Our next chapter begins here.' }} />);
  expect(html).toContain('Glasswater'); expect(html).toContain('A city of bridges.'); expect(html).toContain('Our next chapter'); expect(html).toContain('href="/campaigns/review/wiki/glasswater"');
  expect(html).not.toContain('Configure spotlight'); expect(html).not.toContain('<input');
  expect(render(<CampaignContextWidget {...props} customizeMode />)).toContain('Configure spotlight');
});
test('inaccessible spotlight also hides custom introduction and map fallback never loads a full-resolution image', () => {
  const html = render(<CampaignContextWidget {...props} features={{ ...features, spotlight: null }} config={{ introduction: 'Private city name' }} />);
  expect(html).not.toContain('Private city name'); expect(html).toContain('No spotlight page');
  const map = render(<CampaignContextWidget {...props} id="campaignMap" features={{ ...features, map: { ...features.spotlight!, type: 'map' } }} />);
  expect(map).not.toContain('<img'); expect(map).toContain('Open map');
});
test('announcements show semantic style and formatted prose, omit expired content and normal-view forms', () => {
  const notice = { id: 'notice', title: 'A new time', message: '**Saturday** at seven.', style: 'important' as const, link: 'https://example.org/guide', expiresAt: null, createdAt: '', updatedAt: '' };
  const html = render(<CampaignAnnouncementsWidget {...props} features={{ ...features, announcements: [notice, { ...notice, id: 'expired', title: 'Expired secret', expiresAt: '2000-01-01T00:00:00Z' }] }} />);
  expect(html).toContain('<strong>Saturday</strong>'); expect(html).toContain('important'); expect(html).toContain('noopener noreferrer'); expect(html).not.toContain('Expired secret'); expect(html).not.toContain('Manage announcements'); expect(html).not.toContain('<form');
});
test('attention differentiates optional notes and required response and provides compact empty state', () => {
  expect(render(<NeedsAttentionWidget {...props} />)).toContain('Nothing is waiting');
  const html = render(<NeedsAttentionWidget {...props} features={{ ...features, actions: [{ id: 'notes', title: 'Add notes', href: '/notes/mine', context: 'Campaign memory', optional: true, deadline: null }] }} />);
  expect(html).toContain('Optional'); expect(html).toContain('href="/notes/mine"');
});
test('statistics distinguish measured zero, unsupported values, and comparison without dividing by zero', () => {
  expect(statisticText(metricValue(0))).toBe('0'); expect(statisticText(metricUnavailable('not_yet_tracked'))).toBe('Unavailable');
  const metric: CampaignStatistic = { id: 'sessions', category: 'Sessions', label: 'Completed sessions', value: metricValue(3), previous: metricValue(0), explanation: 'Recorded sessions' };
  expect(statisticComparison(metric)).toContain('+3 compared with 0');
  expect(statisticComparison({ ...metric, previous: metricUnavailable('insufficient_data') })).toBe('No historical comparison');
  expect(render(<CampaignStatisticsWidget {...props} />)).toContain('/campaigns/review/campaign-statistics');
});
