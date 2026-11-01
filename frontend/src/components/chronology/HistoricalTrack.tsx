import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { ChronologyEra } from '@shared/chronologyEras';
import type { TimelineCategoryRecord } from '@/lib/chronologyApi';
import {
  comparisonEraGeometry, dayX, intersectHistoricalIntervals, packHistoricalIntervals,
  viewportDay, type HistoricalAxis, type HistoricalInterval, type TimelineViewport,
} from '@/lib/historicalTimeline';
import { comparisonDateLabel, comparisonIntervalLabel, useComparisonText } from './comparisonText';

export type ComparisonEraBand = NonNullable<ReturnType<typeof comparisonEraGeometry>>;
export function HistoricalEraStrip({ bands, name, onFocus, selectedId }: {
  bands: ComparisonEraBand[]; name: string; onFocus: (id: string) => void; selectedId?: string;
}) {
  const text = useComparisonText();
  // Overlapping definitions get separate label rows; their configured order is retained.
  const ends: number[] = [];
  const rows = bands.filter(band => band.width > 0).map(band => {
    let lane = ends.findIndex(end => end <= band.x);
    if (lane < 0) lane = ends.length;
    ends[lane] = band.x + band.width;
    return { band, lane };
  });
  if (!rows.length) return null;
  return <div className="relative overflow-hidden border-y border-border/40" style={{ height: Math.max(1, ends.length) * 44 }}
    aria-label={text('eras', { name })}>
    {rows.map(({ band, lane }) => <button key={band.era.id} type="button"
      aria-pressed={selectedId ? band.era.id === selectedId : undefined}
      className={`absolute truncate border-l border-border/40 px-2 text-left text-xs ${band.era.id === selectedId ? 'bg-primary/25 font-semibold' : 'bg-primary/10'}`}
      style={{ left: band.x, width: band.width, top: lane * 44, height: 44 }}
      title={band.era.name} onClick={() => onFocus(band.era.id)}>
      {band.openStart ? '← ' : ''}{band.era.name}{band.openEnd ? ' →' : ''}
    </button>)}
  </div>;
}

interface HistoricalTrackProps {
  id: string; name: string; axis: HistoricalAxis; intervals: HistoricalInterval[]; eras: ChronologyEra[];
  view: TimelineViewport; width: number; collapsed: boolean; showEras: boolean;
  referenceBands: ComparisonEraBand[]; categories: TimelineCategoryRecord[];
  selected: HistoricalInterval | null; comparison: boolean; capped: boolean;
  today: bigint | null; onSelect: (row: HistoricalInterval) => void;
  onCluster: (keys: string[]) => void; onCollapse: (id: string) => void; onEra: (id: string) => void;
}

export const HistoricalTrack = memo(function HistoricalTrack({ id, name, axis, intervals, eras, view, width, collapsed,
  showEras, referenceBands, categories, selected, comparison, capped, today, onSelect, onCluster, onCollapse, onEra }: HistoricalTrackProps) {
  const text = useComparisonText();
  const section = useRef<HTMLElement>(null);
  const [onscreen, setOnscreen] = useState(true);
  const retainedHeight = useRef(320);
  useEffect(() => {
    const element = section.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => setOnscreen(entries[0]!.isIntersecting), {
      root: element.closest('[data-comparison-scroll]'), rootMargin: '320px 0px',
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const layout = useMemo(() => onscreen && !collapsed ? packHistoricalIntervals(intervals, view, width) : null,
    [intervals, view, width, onscreen, collapsed]);
  const height = layout ? Math.max(320, layout.laneCount * 48 + 32) : retainedHeight.current;
  useEffect(() => { if (layout) retainedHeight.current = height; }, [layout, height]);
  const bands = useMemo(() => eras.map(era => comparisonEraGeometry(era, axis, view, width))
    .filter((band): band is ComparisonEraBand => !!band && band.width > 0), [eras, axis, view, width]);
  const matches = (row: HistoricalInterval) => !comparison || !selected || intersectHistoricalIntervals(row, selected);
  return <section ref={section} data-timeline-track={id} className="relative border-b border-border/40">
    <div className="sticky top-9 z-[5] flex min-h-11 items-center gap-2 bg-background/95 px-2 text-sm">
      <button type="button" className="min-h-11 px-2" aria-expanded={!collapsed}
        aria-controls={`historical-track-${id}`} aria-label={text(collapsed ? 'expand' : 'collapse', { name })}
        onClick={() => onCollapse(id)}>{collapsed ? '▸' : '▾'} {name}</button>
    </div>
    <p className="px-4 pb-2 text-xs text-muted" data-track-coverage={capped ? 'capped' : 'loaded'}>
      <span className="block">{comparisonDateLabel(axis, viewportDay(view), text)} — {comparisonDateLabel(axis, viewportDay(view, 1), text)}</span>
      {capped && text('capped')}
    </p>
    <div id={`historical-track-${id}`} hidden={collapsed}>
      {showEras && <HistoricalEraStrip bands={bands} name={name} onFocus={onEra} />}
      {!collapsed && <svg width="100%" height={height} className="block" aria-label={text('events', { name })}>
        {showEras && referenceBands.map((band, index) => <rect key={band.era.id} x={band.x} width={band.width}
          y={0} height={height} fill="currentColor" opacity={index % 2 ? .025 : .055} pointerEvents="none" />)}
        {today !== null && <line x1={dayX(today, view, width)} x2={dayX(today, view, width)} y1={0} y2={height}
          stroke="currentColor" strokeDasharray="3 4" opacity=".35"><title>{text('campaignToday')}</title></line>}
        {comparison && selected && <g pointerEvents="none" data-comparison-guide>
          {selected.end - selected.start === 1440n ? <line x1={dayX(selected.start, view, width)} x2={dayX(selected.start, view, width)}
            y1={0} y2={height} stroke="currentColor" strokeDasharray="4 3" /> :
            <rect x={Math.max(0, dayX(selected.start, view, width))} y={0}
              width={Math.max(0, Math.min(width, dayX(selected.end, view, width)) - Math.max(0, dayX(selected.start, view, width)))}
              height={height} fill="currentColor" opacity=".08" />}
        </g>}
        {layout?.marks.filter(mark => mark.endX >= 0 && mark.x <= width).map(mark => {
          const row = mark.interval, major = row.representative.importance === 'MAJOR', notice = row.representative.importance === 'NOTICE';
          const x = Math.max(0, mark.x), right = Math.min(width, mark.endX), y = mark.lane * 48 + 22;
          const categoryColor = categories.find(category => category.id === row.representative.categoryId)?.color;
          const chars = Math.floor(Math.min(124, Math.max(0, width - x - 24)) / 7);
          const title = row.representative.title;
          const shown = title.length > chars ? `${title.slice(0, Math.max(0, chars - 1))}…` : title;
          return <g key={row.key} role="button" tabIndex={0} aria-label={comparisonIntervalLabel(row, axis, text)}
            aria-pressed={selected?.key === row.key} data-timeline-event={row.representative.occurrenceId}
            data-comparison-match={comparison && selected ? String(matches(row)) : undefined}
            opacity={matches(row) ? 1 : .3} className="cursor-pointer text-foreground outline-offset-2"
            onClick={() => onSelect(row)} onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(row); }
            }}>
            <title>{comparisonIntervalLabel(row, axis, text)} / {row.representative.wikiPageId ? 'Page' : 'Event only'}</title>
            <rect x={Math.max(0, x - 20)} y={y - 22} width={Math.min(width - Math.max(0, x - 20), Math.max(44, right - x + 40, 140))} height={44} fill="transparent" />
            {row.end - row.start === 1440n ? <path d={`M ${x} ${y - (major ? 9 : 6)} l ${major ? 9 : 6} ${major ? 9 : 6} l -${major ? 9 : 6} ${major ? 9 : 6} l -${major ? 9 : 6} -${major ? 9 : 6} Z`} fill="currentColor" opacity={notice ? .4 : .85} /> :
              <rect x={x} y={y - (major ? 7 : 4)} width={Math.max(.75, right - x)} height={major ? 14 : 8} rx={2}
                fill="currentColor" opacity={notice ? .3 : .65} stroke={selected?.key === row.key ? 'currentColor' : 'none'} strokeWidth={3} />}
            {categoryColor && <circle cx={x + 3} cy={y + 16} r={2.5} fill={categoryColor} />}
            {chars > 2 && <text x={x + 14} y={y + 4} fontSize={12} fontWeight={major ? 600 : 400} fill="currentColor">{major ? '◆ ' : ''}{shown}</text>}
          </g>;
        })}
        {layout?.clusters.map(cluster => {
          const matching = comparison && selected ? cluster.members.filter(matches).length : null;
          return <g key={cluster.key} role="button" tabIndex={0} className="cursor-pointer"
            opacity={matching === 0 ? .3 : 1} aria-label={text('cluster', { count: cluster.members.length })}
            onClick={() => onCluster(cluster.members.map(row => row.key))} onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onCluster(cluster.members.map(row => row.key)); }
            }}>
            <title>{text('cluster', { count: cluster.members.length })}{matching !== null ? ` · ${text('matches', { count: matching })}` : ''}</title>
            <rect x={cluster.x} y={11 * 48} width={Math.max(44, cluster.endX - cluster.x)} height={44} rx={4} fill="currentColor" opacity=".12" />
            <text x={cluster.x + 8} y={11 * 48 + 27} fontSize={12} fill="currentColor">+{cluster.members.length}{matching !== null ? ` (${matching})` : ''}</text>
          </g>;
        })}
        {layout && !layout.marks.length && !layout.clusters.length && <text x={16} y={48} fill="currentColor" fontSize={13}>{text('empty')}</text>}
      </svg>}
    </div>
  </section>;
});
