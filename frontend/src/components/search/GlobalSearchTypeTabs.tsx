import type { GlobalSearchTypeCount } from '@shared/globalSearch';

interface GlobalSearchTypeTabsProps {
  types: GlobalSearchTypeCount[];
  activeType: string | null;
  activeTabIndex: number;
  onChange: (typeKey: string | null, tabIndex: number) => void;
  onFocusTabs: () => void;
}

export function GlobalSearchTypeTabs({
  types,
  activeType,
  activeTabIndex,
  onChange,
  onFocusTabs,
}: GlobalSearchTypeTabsProps) {
  const tabs: Array<{ key: string | null; label: string; count?: number }> = [
    { key: null, label: 'All' },
    ...types.map((type) => ({
      key: type.key,
      label: type.label,
      count: type.count,
    })),
  ];

  return (
    <div
      role="tablist"
      aria-label="Search result types"
      className="flex gap-1 overflow-x-auto border-b border-border/40 px-3 py-2 scrollbar-thin"
      onFocus={onFocusTabs}
    >
      {tabs.map((tab, index) => {
        const selected =
          tab.key === null ? activeType == null : activeType === tab.key;
        return (
          <button
            key={tab.key ?? 'all'}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={index === activeTabIndex ? 0 : -1}
            onClick={() => onChange(tab.key, index)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
              selected
                ? 'bg-elevated text-foreground'
                : 'text-muted hover:bg-elevated/60 hover:text-foreground'
            }`}
          >
            {tab.label}
            {tab.count != null ? (
              <span className="ml-1.5 text-xs opacity-70">{tab.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
