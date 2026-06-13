import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, X } from 'lucide-react';
import type { HubAttentionItem } from '@/types/hub';
import { dismissHubAttention } from '@/lib/hub';
import { HubSectionHeader } from '@/components/hub/HubSectionHeader';
import { HubActionButton } from '@/components/hub/HubActionButton';

interface HubAttentionQueueProps {
  items: HubAttentionItem[];
  campaignCount: number;
  onDismiss?: () => void;
}

function chipClassForSeverity(severity: HubAttentionItem['severity']): string {
  if (severity === 'elevated') return 'hub-chip hub-chip--attention hub-chip--attention-elevated';
  if (severity === 'whisper') return 'hub-chip hub-chip--attention hub-chip--attention-whisper';
  return 'hub-chip hub-chip--attention';
}

export function HubAttentionQueue({
  items,
  campaignCount,
  onDismiss,
}: HubAttentionQueueProps) {
  const [expanded, setExpanded] = useState(false);
  const [dismissedLocal, setDismissedLocal] = useState<Set<string>>(new Set());

  const visible = useMemo(
    () => items.filter((i) => !dismissedLocal.has(i.id)),
    [items, dismissedLocal],
  );

  const { elevated, soft, whisper, display } = useMemo(() => {
    const elevatedItems = visible.filter((i) => i.severity === 'elevated');
    const softItems = visible.filter((i) => i.severity === 'soft');
    const whisperItems = visible.filter((i) => i.severity === 'whisper');

    let shownElevated = elevatedItems.slice(0, 2);
    let shownSoft = softItems;

    if (shownElevated.length === 0 && softItems.length > 0) {
      shownElevated = softItems.slice(0, 2);
      shownSoft = softItems.slice(2);
    }

    const displayItems = expanded
      ? [...shownElevated, ...shownSoft, ...whisperItems]
      : [...shownElevated, ...shownSoft.slice(0, Math.max(0, 2 - shownElevated.length))];

    return {
      elevated: shownElevated,
      soft: shownSoft,
      whisper: whisperItems,
      display: displayItems,
    };
  }, [visible, expanded]);

  if (visible.length === 0) return null;

  const hiddenCount = visible.length - display.length;
  const summaryMode = campaignCount >= 15 && !expanded;

  async function handleDismiss(item: HubAttentionItem, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!item.dismissKey) return;
    setDismissedLocal((prev) => new Set(prev).add(item.id));
    try {
      await dismissHubAttention(item.dismissKey, 30);
      onDismiss?.();
    } catch {
      setDismissedLocal((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }

  if (summaryMode) {
    return (
      <section className="space-y-2">
        <HubSectionHeader title="Needs Attention" variant="attention" size="sm" />
        <HubActionButton variant="utility" onClick={() => setExpanded(true)} className="!rounded-full">
          {visible.length} items across your tables
          <ChevronDown className="size-4" />
        </HubActionButton>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <HubSectionHeader title="Needs Attention" variant="attention" size="sm" />
      <div className="flex flex-wrap items-center gap-2">
        {display.map((item) => (
          <div key={item.id} className="group relative">
            <Link to={item.href} className={chipClassForSeverity(item.severity)}>
              <span className="line-clamp-1">{item.label}</span>
            </Link>
            {item.dismissKey ? (
              <button
                type="button"
                onClick={(e) => void handleDismiss(item, e)}
                className="absolute -right-1 -top-1 hidden size-4 items-center justify-center rounded-full bg-elevated text-muted group-hover:flex"
                aria-label="Dismiss"
              >
                <X className="size-3" />
              </button>
            ) : null}
          </div>
        ))}
        {hiddenCount > 0 ? (
          <HubActionButton
            variant="utility"
            onClick={() => setExpanded(true)}
            className="!rounded-full !border-dashed"
          >
            {hiddenCount} more
          </HubActionButton>
        ) : null}
        {whisper.length > 0 && !expanded ? (
          <span className="text-[10px] text-muted">
            +{whisper.length} maintenance
          </span>
        ) : null}
      </div>
    </section>
  );
}
