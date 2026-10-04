import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  FACTION_MOMENTUM_STATES,
  FACTION_MOMENTUM_STATE_LABELS,
  type CampaignEra,
  type FactionEraTrajectory,
  type FactionMomentumState,
} from '@shared/factionMomentumMetadata';
import { campaignProgressionPath, campaignWikiPath } from '@/lib/campaignPaths';
import type { WikiTreeNode } from '@/types/wiki';

const cellInputClass =
  'w-full min-w-[6rem] rounded border border-transparent bg-transparent px-1.5 py-1 text-sm text-foreground outline-none hover:border-border focus:border-primary/60 focus:bg-background';

const cellSelectClass =
  'w-full min-w-[5rem] rounded border border-transparent bg-transparent px-1 py-1 text-sm text-foreground outline-none hover:border-border focus:border-primary/60 focus:bg-background';

export type TrajectoryTableRow = {
  pageId: string;
  title: string;
  trajectory: FactionEraTrajectory;
};

interface TrajectoryTableProps {
  campaignHandle: string;
  flatPages: WikiTreeNode[];
  eras: CampaignEra[];
  rows: TrajectoryTableRow[];
  onPatch: (
    pageId: string,
    eraId: string,
    patch: Partial<FactionEraTrajectory>,
    persist: boolean,
  ) => void;
  onPersistPage: (pageId: string) => void;
}

function eraName(eras: CampaignEra[], eraId: string | null | undefined): string {
  if (!eraId) return '—';
  return eras.find((era) => era.id === eraId)?.name ?? eraId;
}

function directionDisplay(trajectory: FactionEraTrajectory): string {
  if (trajectory.direction?.trim()) return trajectory.direction.trim();
  return FACTION_MOMENTUM_STATE_LABELS[trajectory.momentumState];
}

export function TrajectoryTable({
  campaignHandle,
  flatPages,
  eras,
  rows,
  onPatch,
  onPersistPage,
}: TrajectoryTableProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <p className="py-6 text-sm text-muted-foreground">
        No trajectories yet. Add one when you want to give part of the world a direction over time.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="w-8 pb-2 pr-1 font-medium" aria-label="Expand" />
              <th className="pb-2 pr-3 font-medium">Entity</th>
              <th className="pb-2 pr-3 font-medium">Trajectory</th>
              <th className="pb-2 pr-3 font-medium">From</th>
              <th className="pb-2 pr-3 font-medium">Target / Outcome</th>
              <th className="pb-2 font-medium">By</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rowKey = `${row.pageId}::${row.trajectory.eraId}`;
              const isOpen = expanded === rowKey;
              const { trajectory } = row;
              return (
                <FragmentRow
                  key={rowKey}
                  row={row}
                  rowKey={rowKey}
                  isOpen={isOpen}
                  eras={eras}
                  campaignHandle={campaignHandle}
                  flatPages={flatPages}
                  onToggle={() => setExpanded(isOpen ? null : rowKey)}
                  onPatch={onPatch}
                  onPersistPage={onPersistPage}
                  directionValue={directionDisplay(trajectory)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-right text-xs text-muted-foreground">
        {rows.length} trajector{rows.length === 1 ? 'y' : 'ies'}
      </p>
    </div>
  );
}

function FragmentRow({
  row,
  rowKey,
  isOpen,
  eras,
  campaignHandle,
  flatPages,
  onToggle,
  onPatch,
  onPersistPage,
  directionValue,
}: {
  row: TrajectoryTableRow;
  rowKey: string;
  isOpen: boolean;
  eras: CampaignEra[];
  campaignHandle: string;
  flatPages: WikiTreeNode[];
  onToggle: () => void;
  onPatch: TrajectoryTableProps['onPatch'];
  onPersistPage: (pageId: string) => void;
  directionValue: string;
}) {
  const { pageId, title, trajectory } = row;

  return (
    <>
      <tr className="border-b border-border/40 align-middle">
        <td className="py-1.5 pr-1">
          <button
            type="button"
            onClick={onToggle}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
            aria-expanded={isOpen}
            aria-label={isOpen ? `Collapse ${title}` : `Expand ${title}`}
          >
            {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
        </td>
        <td className="py-1.5 pr-3">
          <Link
            to={campaignWikiPath(campaignHandle, pageId, flatPages)}
            className="font-medium text-foreground hover:text-primary hover:underline"
          >
            {title}
          </Link>
        </td>
        <td className="py-1.5 pr-3">
          <input
            type="text"
            aria-label={`Trajectory for ${title}`}
            defaultValue={directionValue}
            key={`${rowKey}-direction-${trajectory.direction ?? ''}`}
            onBlur={(e) => {
              const next = e.target.value.trim() || null;
              if (next === (trajectory.direction?.trim() || null)) return;
              onPatch(pageId, trajectory.eraId, { direction: next }, true);
            }}
            className={cellInputClass}
          />
        </td>
        <td className="py-1.5 pr-3">
          <select
            aria-label={`From era for ${title}`}
            value={trajectory.eraId}
            onChange={(e) => {
              const nextFrom = e.target.value;
              if (nextFrom === trajectory.eraId) return;
              onPatch(pageId, trajectory.eraId, { eraId: nextFrom }, true);
            }}
            className={cellSelectClass}
          >
            {eras.map((era) => (
              <option key={era.id} value={era.id}>
                {era.name}
              </option>
            ))}
          </select>
        </td>
        <td className="py-1.5 pr-3">
          <input
            type="text"
            aria-label={`Outcome for ${title}`}
            defaultValue={trajectory.outcome ?? ''}
            key={`${rowKey}-outcome-${trajectory.outcome ?? ''}`}
            onBlur={(e) => {
              const next = e.target.value.trim() || null;
              if (next === (trajectory.outcome?.trim() || null)) return;
              onPatch(pageId, trajectory.eraId, { outcome: next }, true);
            }}
            className={cellInputClass}
            placeholder="—"
          />
        </td>
        <td className="py-1.5">
          <select
            aria-label={`By era for ${title}`}
            value={trajectory.byEraId ?? ''}
            onChange={(e) => {
              const next = e.target.value || null;
              if (next === (trajectory.byEraId ?? null)) return;
              onPatch(pageId, trajectory.eraId, { byEraId: next }, true);
            }}
            className={cellSelectClass}
          >
            <option value="">—</option>
            {eras.map((era) => (
              <option key={era.id} value={era.id}>
                {era.name}
              </option>
            ))}
          </select>
        </td>
      </tr>
      {isOpen ? (
        <tr className="border-b border-border/40 bg-surface/30">
          <td colSpan={6} className="px-3 py-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block text-xs font-medium text-muted-foreground">
                Development signal
                <select
                  value={trajectory.momentumState}
                  onChange={(e) => {
                    onPatch(
                      pageId,
                      trajectory.eraId,
                      { momentumState: e.target.value as FactionMomentumState },
                      true,
                    );
                  }}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                >
                  {FACTION_MOMENTUM_STATES.map((state) => (
                    <option key={state} value={state}>
                      {FACTION_MOMENTUM_STATE_LABELS[state]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-muted-foreground">
                Pressure (internal)
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={trajectory.pressure ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    onPatch(
                      pageId,
                      trajectory.eraId,
                      { pressure: raw === '' ? null : Number(raw) },
                      false,
                    );
                  }}
                  onBlur={() => onPersistPage(pageId)}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                />
              </label>
              <label className="block text-xs font-medium text-muted-foreground sm:col-span-2 lg:col-span-1">
                GM note
                <input
                  type="text"
                  value={trajectory.gmNote ?? ''}
                  onChange={(e) => {
                    onPatch(
                      pageId,
                      trajectory.eraId,
                      { gmNote: e.target.value.trim() || null },
                      false,
                    );
                  }}
                  onBlur={() => onPersistPage(pageId)}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              From {eraName(eras, trajectory.eraId)}
              {trajectory.byEraId
                ? ` through ${eraName(eras, trajectory.byEraId)}`
                : ' onward (open-ended)'}
              .
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <Link
                to={campaignWikiPath(campaignHandle, pageId, flatPages)}
                className="text-primary hover:underline"
              >
                View entity
              </Link>
              <Link
                to={campaignProgressionPath(campaignHandle, 'history')}
                className="text-primary hover:underline"
              >
                Development history
              </Link>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
