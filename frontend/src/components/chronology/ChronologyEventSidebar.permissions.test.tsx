import { expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { ChronologyEventSidebar } from './ChronologyEventSidebar';
import type { TimelineBaseEventRecord } from '@/lib/chronologyApi';

vi.mock('./ChronologyInspector', () => ({ ChronologyInspector: ({ children }: { children: ReactNode }) => <section>{children}</section> }));
vi.mock('./ChronologyEventInlineDetail', () => ({ ChronologyEventInlineDetail: ({ canManage }: { canManage: boolean }) => <output>{canManage ? 'Can edit event' : 'Read only'}</output> }));

function render(canManage: boolean, canReveal?: boolean) {
  return renderToStaticMarkup(<ChronologyEventSidebar campaignHandle="archive" open
    baseEvent={{ id: 'event', title: 'Neris returns', canEdit: canManage } as TimelineBaseEventRecord}
    categories={[]} editableEvents={[]} calendarLike={null} canManage={canManage} canReveal={canReveal}
    onClose={() => undefined} onRevealEvent={() => undefined} />);
}

test('event editing does not grant Reveal To Party', () => {
  const html = render(true, false);
  expect(html).toContain('Can edit event');
  expect(html).not.toContain('Reveal To Party');
  expect(render(true)).not.toContain('Reveal To Party');
});

test('reveal permission works independently of event editing', () => {
  const html = render(false, true);
  expect(html).toContain('Reveal To Party');
  expect(html).toContain('Read only');
});
