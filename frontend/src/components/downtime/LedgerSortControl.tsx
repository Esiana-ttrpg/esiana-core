import { WorkspaceModeToggle } from '@/components/layout/WorkspaceModeToggle';
import type { LedgerSortMode } from '@/lib/ledgerBrowse';
import { LEDGER_SORT_OPTIONS } from '@/lib/ledgerBrowse';

interface LedgerSortControlProps {
  value: LedgerSortMode;
  onChange: (value: LedgerSortMode) => void;
}

export function LedgerSortControl({ value, onChange }: LedgerSortControlProps) {
  return (
    <WorkspaceModeToggle
      options={LEDGER_SORT_OPTIONS.map((option) => option.id)}
      value={value}
      onChange={onChange}
      formatLabel={(id) =>
        LEDGER_SORT_OPTIONS.find((option) => option.id === id)?.label ?? id
      }
    />
  );
}
