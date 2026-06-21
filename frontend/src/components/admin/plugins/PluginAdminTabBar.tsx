export type PluginAdminView = 'installed' | 'discover';

export function PluginAdminTabBar({
  view,
  onViewChange,
}: {
  view: PluginAdminView;
  onViewChange: (view: PluginAdminView) => void;
}) {
  const tabClass = (active: boolean) =>
    `rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
      active
        ? 'bg-primary text-background'
        : 'border border-border text-muted hover:bg-elevated hover:text-foreground'
    }`;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={tabClass(view === 'installed')}
        onClick={() => onViewChange('installed')}
      >
        Installed
      </button>
      <button
        type="button"
        className={tabClass(view === 'discover')}
        onClick={() => onViewChange('discover')}
      >
        Discover
      </button>
    </div>
  );
}
