import { useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { useGlobalSearchOptional } from '@/components/search/GlobalSearchProvider';

interface CampaignSearchProps {
  campaignHandle: string;
  className?: string;
  inputId?: string;
  autoFocus?: boolean;
  onClose?: () => void;
  /** Match control height to UserAvatar sm (h-8). */
  alignControlsToAvatar?: boolean;
}

function shortcutLabel(): string {
  if (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)) {
    return '⌘K';
  }
  return 'Ctrl+K';
}

/**
 * Header trigger that opens the global search overlay.
 * Keyboard shortcuts (Ctrl/Cmd+K, /) are owned by GlobalSearchProvider.
 */
export function CampaignSearch({
  className = '',
  inputId = 'campaign-header-search',
  autoFocus = false,
  onClose,
  alignControlsToAvatar = false,
}: CampaignSearchProps) {
  const search = useGlobalSearchOptional();
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    search?.registerTrigger(buttonRef.current);
  }, [search]);

  useEffect(() => {
    if (!autoFocus) return;
    buttonRef.current?.focus();
  }, [autoFocus]);

  const buttonClass = alignControlsToAvatar
    ? 'flex h-8 w-full items-center gap-2 rounded-lg border border-[rgb(var(--color-border-warm-rgb)/0.12)] bg-canvas/50 px-2.5 text-sm text-muted transition-colors hover:border-primary/40 hover:text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30'
    : 'flex w-full items-center gap-2 rounded-lg border border-[rgb(var(--color-border-warm-rgb)/0.12)] bg-canvas/50 px-3 py-1.5 text-sm text-muted transition-colors hover:border-primary/40 hover:text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30';

  return (
    <div className={`relative min-w-0 ${className}`}>
      <button
        ref={buttonRef}
        id={inputId}
        type="button"
        className={buttonClass}
        onClick={() => {
          search?.openSearch();
          onClose?.();
        }}
        aria-haspopup="dialog"
        aria-expanded={search?.open ?? false}
        aria-label="Search this campaign"
      >
        <Search
          className={alignControlsToAvatar ? 'size-3.5 shrink-0' : 'size-4 shrink-0'}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate text-left">Search this campaign…</span>
        <kbd className="hidden shrink-0 rounded border border-border/40 px-1.5 py-0.5 text-[10px] text-muted sm:inline">
          {shortcutLabel()}
        </kbd>
      </button>
    </div>
  );
}
