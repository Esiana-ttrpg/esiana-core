import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { CalendarMonthGrid } from './CalendarMonthGrid.js';
import { CalendarClimateContext } from './CalendarClimateContext.js';
import type { TimelineOccurrenceRecord } from '@/lib/chronologyApi';

describe('world calendar presentation', () => {
  const common = {
    columnLabels: ['One', 'Two'],
    monthTitle: 'Returning',
    rows: [
      {
        kind: 'standardWeek' as const,
        cells: [
          { day: 1, isToday: true },
          { day: 2, isToday: false },
        ],
      },
    ],
    isIntercalaryMonth: false,
  };
  const event = (
    occurrenceId: string,
    importance: 'NOTICE' | 'MINOR' | 'MAJOR',
    dayOffset = 20,
  ) =>
    ({
      occurrenceId,
      baseEventId: 'journey',
      occurrenceIndex: 0,
      importance,
      title: `Journey ${occurrenceId}`,
      duration: 60,
      dayOffset,
    }) as TimelineOccurrenceRecord;

  it('shows titles, hierarchy, overflow and accurate clipped-duration labels', () => {
    const events = [
      event('notice', 'NOTICE'),
      event('minor', 'MINOR'),
      event('major', 'MAJOR'),
      event('other', 'MINOR'),
    ];
    const html = renderToStaticMarkup(
      <CalendarMonthGrid
        {...common}
        presentation="expanded"
        todayDay={2}
        occurrencesByDay={new Map([[1, events]])}
        onDayClick={() => {}}
      />,
    );
    assert.match(html, /md:min-h-\[132px\]/);
    assert.match(html, /Journey major/);
    assert.ok(html.indexOf('Journey major') < html.indexOf('Journey minor'));
    assert.match(html, /Event continues/);
    assert.doesNotMatch(html, /Event begins/);
    assert.match(html, /Day 21 of 60/);
    assert.match(html, /\+1 more/);
    assert.match(html, /Returning 2, today/);
    assert.doesNotMatch(html, /Returning 1, today/);
  });
  it('keeps the dashboard compact by default', () => {
    const html = renderToStaticMarkup(<CalendarMonthGrid {...common} />);
    assert.doesNotMatch(html, /132px|Single-day event|Event begins/);
  });
  it('omits unconfigured climate and discloses the complete configured label', () => {
    const empty = renderToStaticMarkup(<CalendarClimateContext />);
    assert.doesNotMatch(empty, /Monthly climate|Temperate|forecast/i);
    const configured = renderToStaticMarkup(
      <CalendarClimateContext climateAspect="PLUVIAL" />,
    );
    assert.match(
      configured,
      /<summary[^>]*>Monthly climate: Pluvial<\/summary>/,
    );
    assert.match(configured, /Pluvial \/ Monsoon/);
    assert.match(
      renderToStaticMarkup(<CalendarClimateContext climateAspect="NEUTRAL" />),
      /Temperate \/ Fair/,
    );
  });
});
