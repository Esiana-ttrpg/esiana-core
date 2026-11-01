import type { TimelineOccurrenceRecord } from '@/lib/chronologyApi';

/** Keep importance readable without relying on color. */
export function ChronologyImportance({ value }: { value: TimelineOccurrenceRecord['importance'] }) {
  return <span className={value === 'MAJOR' ? 'font-semibold text-foreground' : value === 'NOTICE' ? 'text-muted' : 'text-foreground'}>
    {value === 'MAJOR' ? 'Major' : value === 'MINOR' ? 'Minor' : 'Notice'}
  </span>;
}
