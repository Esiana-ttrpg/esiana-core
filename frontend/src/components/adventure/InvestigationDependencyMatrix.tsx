import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import type { AdventureHubPayload } from '@/lib/adventure';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';

type InvestigationLedger = NonNullable<
  NonNullable<AdventureHubPayload['investigation']>['ledger']
>;
type InvestigationLedgerColumn = InvestigationLedger['columns'][number];
type InvestigationLedgerCell = InvestigationLedger['cells'][number];

interface InvestigationDependencyMatrixProps {
  campaignHandle: string;
  ledger: InvestigationLedger | undefined;
  searchQuery: string;
  spofOnly: boolean;
  unreachableOnly: boolean;
}

const COLUMN_GROUP_LABELS: Record<string, string> = {
  scenes: 'Scenes',
  npcs: 'NPCs',
  locations: 'Locations',
  discoveries: 'Discoveries',
};

function cellKey(rowId: string, columnGroup: string, targetId: string): string {
  return `${rowId}::${columnGroup}::${targetId}`;
}

export function InvestigationDependencyMatrix({
  campaignHandle,
  ledger,
  searchQuery,
  spofOnly,
  unreachableOnly,
}: InvestigationDependencyMatrixProps) {
  const { flatPages } = useWiki();
  const filteredRows = useMemo(() => {
    if (!ledger) return [];
    const q = searchQuery.trim().toLowerCase();
    return ledger.rows.filter((row) => {
      if (spofOnly && !row.isSpof) return false;
      if (unreachableOnly && row.reachable) return false;
      if (q && !row.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [ledger, searchQuery, spofOnly, unreachableOnly]);

  const columnsByGroup = useMemo(() => {
    if (!ledger) return new Map<string, InvestigationLedgerColumn[]>();
    const map = new Map<string, InvestigationLedgerColumn[]>();
    for (const column of ledger.columns) {
      const group = column.columnGroup;
      const list = map.get(group) ?? [];
      list.push(column);
      map.set(group, list);
    }
    return map;
  }, [ledger]);

  const cellsByKey = useMemo(() => {
    if (!ledger) return new Map<string, InvestigationLedgerCell[]>();
    const map = new Map<string, InvestigationLedgerCell[]>();
    for (const cell of ledger.cells) {
      const key = cellKey(cell.rowId, cell.columnGroup, cell.targetId);
      const list = map.get(key) ?? [];
      list.push(cell);
      map.set(key, list);
    }
    return map;
  }, [ledger]);

  const visibleColumnGroups = ledger?.legend.columnGroups ?? [];

  if (!ledger || ledger.rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No clue or lead threads yet. Add clue-kind threads in Threads Hub and link them from
        scenes to populate the dependency ledger.
      </p>
    );
  }

  if (filteredRows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No rows match the current filters. Try clearing SPOF or search filters.
      </p>
    );
  }

  const hasAnyLinks = ledger.cells.length > 0;

  return (
    <div className="space-y-3">
      {!hasAnyLinks ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-200/90">
          Clues and leads exist but have no cross-links yet. Link clues on scene pages or connect
          threads in Threads Hub.
        </p>
      ) : null}

      <div className="overflow-auto rounded-lg border border-border">
        <table className="min-w-max w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="sticky left-0 z-20 min-w-[180px] border-r border-border bg-muted/40 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Clue / Lead
              </th>
              {visibleColumnGroups.map((group) => {
                const cols = columnsByGroup.get(group) ?? [];
                if (cols.length === 0) return null;
                return (
                  <th
                    key={group}
                    colSpan={cols.length}
                    className="border-r border-border px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {COLUMN_GROUP_LABELS[group] ?? group}
                  </th>
                );
              })}
            </tr>
            <tr className="border-b border-border bg-surface">
              <th className="sticky left-0 z-20 border-r border-border bg-surface px-3 py-1.5" />
              {visibleColumnGroups.flatMap((group) => {
                const cols = columnsByGroup.get(group) ?? [];
                return cols.map((column) => (
                  <th
                    key={`${group}-${column.id}`}
                    className="max-w-[120px] border-r border-border px-2 py-1.5 text-left text-[10px] font-medium text-muted-foreground"
                  >
                    <Link
                      to={campaignWikiPath(campaignHandle, column.id, flatPages)}
                      className="line-clamp-2 hover:text-primary"
                      title={column.title}
                    >
                      {column.title}
                    </Link>
                  </th>
                ));
              })}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id} className="border-b border-border/70 hover:bg-muted/20">
                <td className="sticky left-0 z-10 border-r border-border bg-surface px-3 py-2">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <Link
                        to={campaignWikiPath(campaignHandle, row.id, flatPages)}
                        className="font-medium hover:text-primary"
                      >
                        {row.title}
                      </Link>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="capitalize">{row.kind}</span>
                        {!row.reachable ? (
                          <span className="text-amber-400">Not party-visible</span>
                        ) : null}
                        {row.pressureAccumulating ? (
                          <span className="text-amber-400">Pressure accumulating</span>
                        ) : null}
                      </div>
                    </div>
                    {row.isSpof ? (
                      <AlertTriangle
                        className="size-3.5 shrink-0 text-red-400"
                        aria-label="Single point of failure"
                      />
                    ) : null}
                  </div>
                </td>
                {visibleColumnGroups.flatMap((group) => {
                  const cols = columnsByGroup.get(group) ?? [];
                  return cols.map((column) => {
                    const key = cellKey(row.id, group, column.id);
                    const cells = cellsByKey.get(key) ?? [];
                    const cell = cells[0];
                    if (!cell) {
                      return (
                        <td
                          key={`${row.id}-${group}-${column.id}`}
                          className="border-r border-border/50 px-2 py-2 text-center text-muted-foreground/30"
                        >
                          ·
                        </td>
                      );
                    }
                    const isSpof = cell.edgeKind === 'spof_risk';
                    return (
                      <td
                        key={`${row.id}-${group}-${column.id}`}
                        className="border-r border-border/50 px-2 py-2 text-center"
                      >
                        <Link
                          to={campaignWikiPath(campaignHandle, cell.targetId, flatPages)}
                          className={`inline-flex size-7 items-center justify-center rounded border text-xs transition-colors hover:border-primary/40 ${
                            isSpof
                              ? 'border-red-500/50 bg-red-500/10 text-red-300'
                              : cell.edgeKind === 'optional'
                                ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                          }`}
                          title={`${cell.explanation}\nDerived from: ${cell.derivationSource}`}
                        >
                          ●
                        </Link>
                      </td>
                    );
                  });
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        {ledger.cells.length} dependency link{ledger.cells.length === 1 ? '' : 's'} · hover cells
        for provenance · red indicates single-point-of-failure risk
      </p>
    </div>
  );
}
