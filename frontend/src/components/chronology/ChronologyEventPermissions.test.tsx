import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { ChronologyEventManagePanel } from './ChronologyEventManagePanel';
import type { TimelineBaseEventRecord } from '@/lib/chronologyApi';

const event = { id: 'event', calendarId: 'calendar', title: 'Neris returns',
  targetYear: 1, targetMonth: 0, targetDay: 1, description: '', updatedAt: '2026-01-01' } as TimelineBaseEventRecord;
const calendar = { epochOffset: 0n, weekdays: [], months: [{ name: 'First', length: 30, type: 'standard' }], seasons: [], moons: [], leapDays: [] };
function render(canEdit: boolean, canDelete: boolean) {
  return renderToStaticMarkup(<MemoryRouter><ChronologyEventManagePanel campaignHandle="archive"
    baseEvent={{ ...event, canEdit, canDelete }} calendarLike={calendar}
    categories={[]} editableEvents={[]} canManage={canEdit} /></MemoryRouter>);
}
test('Delete Own is available without opening an edit form', () => {
  const html = render(false, true);
  assert.match(html, /Delete event/);
  assert.doesNotMatch(html, /Edit event|Save changes|<input/);
});
test('event-specific edit permission controls the editor affordance', () => {
  assert.match(render(true, false), /Edit event/);
  assert.doesNotMatch(render(false, false), /Edit event|Delete event|Save changes/);
});
