import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { EntitySubviewDef, EntitySubviewNavProps } from '@/lib/entityPageShells/types';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

function visibleTabs(
  subviews: EntitySubviewDef[],
  isDMUser: boolean,
): EntitySubviewDef[] {
  return subviews.filter((tab) => !tab.dmOnly || isDMUser);
}

export function EntitySubviewNav({
  subviews,
  activeSubview,
  onSubviewChange,
  isDMUser: isDMUserProp,
}: EntitySubviewNavProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const containerRef = useRef<HTMLDivElement>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [splitIndex, setSplitIndex] = useState<number | null>(null);

  const tabs = useMemo(() => visibleTabs(subviews, isDMUser), [subviews, isDMUser]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function measure() {
      const width = el?.offsetWidth ?? 0;
      if (width < 360) {
        setSplitIndex(1);
        return;
      }
      if (width < 520) {
        setSplitIndex(3);
        return;
      }
      if (width < 680) {
        setSplitIndex(5);
        return;
      }
      setSplitIndex(null);
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tabs.length]);

  const sorted = useMemo(
    () => [...tabs].sort((a, b) => a.navPriority - b.navPriority),
    [tabs],
  );

  const inlineTabs =
    splitIndex == null ? sorted : sorted.slice(0, splitIndex);
  const overflowTabs =
    splitIndex == null ? [] : sorted.slice(splitIndex);

  const activeInOverflow = overflowTabs.some((t) => t.id === activeSubview);

  function renderTab(tab: EntitySubviewDef, inMenu = false) {
    const selected = activeSubview === tab.id;
    const base = inMenu
      ? 'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-xs font-medium transition-colors'
      : 'rounded-md px-3 py-1.5 text-xs font-medium transition-colors';
    const state = selected
      ? 'bg-primary/15 text-primary'
      : 'text-muted hover:text-foreground';

    return (
      <button
        key={tab.id}
        type="button"
        role="tab"
        aria-selected={selected}
        onClick={() => {
          onSubviewChange(tab.id);
          setOverflowOpen(false);
        }}
        className={`${base} ${state}`}
      >
        <span>{tab.label}</span>
        {tab.dmOnly ? (
          <span className="rounded bg-amber-500/15 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            DM
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mt-1 flex flex-wrap items-center gap-0.5 border-t border-border/40 pt-1"
      role="tablist"
      aria-label="Page sections"
    >
      {inlineTabs.map((tab) => renderTab(tab))}

      {overflowTabs.length > 0 ? (
        <div className="relative">
          <button
            type="button"
            className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeInOverflow
                ? 'bg-primary/15 text-primary'
                : 'text-muted hover:text-foreground'
            }`}
            aria-expanded={overflowOpen}
            onClick={() => setOverflowOpen((o) => !o)}
          >
            More
            <ChevronDown className="size-3" />
          </button>
          {overflowOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                aria-label="Close menu"
                onClick={() => setOverflowOpen(false)}
              />
              <div
                className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] rounded-lg border border-border bg-surface p-1 shadow-lg"
                role="menu"
              >
                {overflowTabs.map((tab) => renderTab(tab, true))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
