import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { CategoryIndexRefinePopover } from '@/components/wiki/indexBrowse/CategoryIndexRefinePopover';
import {
  LEDGER_BROWSE_CATEGORIES,
  LEDGER_BROWSE_ENTRY_KINDS,
  hasActiveLedgerBrowse,
  ledgerEntryKindLabel,
  resetLedgerBrowse,
  toggleLedgerCategory,
  toggleLedgerEntryKind,
  type LedgerBrowseState,
} from '@/lib/ledgerBrowse';
import { formatLedgerCategoryLabel } from '@shared/ledgerMetadata';

interface LedgerRefinePopoverProps {
  browseState: LedgerBrowseState;
  onBrowseChange: (next: LedgerBrowseState) => void;
}

function chipClass(active: boolean): string {
  return active
    ? 'bg-primary/15 text-primary'
    : 'text-muted hover:text-foreground';
}

export function LedgerRefinePopover({
  browseState,
  onBrowseChange,
}: LedgerRefinePopoverProps) {
  const activeCount = hasActiveLedgerBrowse(browseState)
    ? listActiveCount(browseState)
    : undefined;

  return (
    <CategoryIndexRefinePopover
      facetDefs={[]}
      refineState={{}}
      children={[]}
      categoryTitle="Ledger"
      onRefineChange={() => {}}
      activeCount={activeCount}
      onResetRefine={() => onBrowseChange(resetLedgerBrowse())}
      searchQuery={browseState.search}
      onSearchChange={(search) => onBrowseChange({ ...browseState, search })}
      searchPlaceholder="Filter transactions…"
      customBody={
        <div className="space-y-4">
          <div>
            <p className={`mb-1.5 ${META_SECTION_LABEL_CLASS}`}>Category</p>
            <div className="flex flex-wrap gap-1">
              {LEDGER_BROWSE_CATEGORIES.map((category) => {
                const active = browseState.categories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() =>
                      onBrowseChange(toggleLedgerCategory(browseState, category))
                    }
                    className={`rounded px-2 py-1 text-xs transition-colors ${chipClass(active)}`}
                  >
                    {formatLedgerCategoryLabel(category)}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className={`mb-1.5 ${META_SECTION_LABEL_CLASS}`}>Entry kind</p>
            <div className="flex flex-wrap gap-1">
              {LEDGER_BROWSE_ENTRY_KINDS.map((kind) => {
                const active = browseState.entryKinds.includes(kind);
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() =>
                      onBrowseChange(toggleLedgerEntryKind(browseState, kind))
                    }
                    className={`rounded px-2 py-1 text-xs transition-colors ${chipClass(active)}`}
                  >
                    {ledgerEntryKindLabel(kind)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      }
    />
  );
}

function listActiveCount(state: LedgerBrowseState): number {
  let count = 0;
  if (state.search.trim()) count += 1;
  count += state.categories.length;
  count += state.entryKinds.length;
  return count;
}
