import { Pin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardWidgetShell } from '../DashboardWidgetShell';

interface PinnedItem {
  id: string;
  title: string;
  href: string;
  freshnessLabel?: string | null;
}

interface PinnedItemsWidgetProps {
  pinned: PinnedItem[];
  customizeMode?: boolean;
  onHide?: () => void;
}

export function PinnedItemsWidget({ pinned, customizeMode, onHide }: PinnedItemsWidgetProps) {
  return (
    <DashboardWidgetShell
      title="Pinned Pages"
      icon={<Pin className="size-4 text-rose-300" />}
      customizeMode={customizeMode}
      onHide={onHide}
    >
      {pinned.length === 0 ? (
        <p className="text-sm text-muted">
          Pin pages from the wiki to keep quick anchors here.
        </p>
      ) : (
        <ul className="space-y-2">
          {pinned.map((item) => (
            <li key={item.id}>
              <Link
                to={item.href}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/50 px-3 py-2 text-sm hover:border-rose-400/40"
              >
                <span className="font-medium text-foreground">{item.title}</span>
                {item.freshnessLabel ? (
                  <span className="text-[10px] text-muted">{item.freshnessLabel}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardWidgetShell>
  );
}
