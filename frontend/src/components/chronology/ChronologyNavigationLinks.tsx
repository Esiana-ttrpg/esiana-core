import { Link, useSearchParams } from 'react-router-dom';
import { campaignChronologyPath } from '@/lib/campaignPaths';
import { chronologyViewParams } from '@/lib/chronologyNavigation';
import type { TimelineOccurrenceRecord } from '@/lib/chronologyApi';

/** Receives an authorized, normalized occurrence, never URL-provided display data. */
export function ChronologyNavigationLinks({ campaignHandle, occurrence }: {
  campaignHandle: string; occurrence: TimelineOccurrenceRecord;
}) {
  const [params] = useSearchParams();
  return <nav aria-label="View this occurrence" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
    {(['calendar', 'timeline', 'feed'] as const).filter(view => view !== params.get('view')).map(view =>
      <Link key={view} className="inline-flex min-h-11 items-center underline"
        to={`${campaignChronologyPath(campaignHandle)}?${chronologyViewParams(params, view, { calendarId: occurrence.calendarId, occurrence })}`}>
        {view === 'calendar' ? 'Open in Calendar' : view === 'timeline' ? 'Open on Timeline' : 'Open in Campaign Feed'}
      </Link>)}
    {occurrence.eraIds?.map((eraId, index) => <Link key={eraId} className="inline-flex min-h-11 items-center underline"
      to={`${campaignChronologyPath(campaignHandle)}?${chronologyViewParams(params, 'eras', { calendarId: occurrence.calendarId, eraId })}`}>
      {occurrence.eraNames?.[index] ?? 'Open era'}
    </Link>)}
  </nav>;
}
