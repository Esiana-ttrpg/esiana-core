import { useCallback, useEffect, useMemo, useState } from 'react';
import { NarrativeSnapshotsHelp } from '@/components/chronology/NarrativeSnapshotsHelp';
import {
  formatMomentOptionLabel,
  SnapshotKindBadge,
} from '@/components/chronology/SnapshotKindBadge';
import {
  archivedMomentHint,
  campaignHistorySubtitle,
  campaignHistoryTitle,
  compareBlockHeading,
  compareBlockHint,
  compareButtonLabel,
  createMilestoneButton,
  createMilestonePrompt,
  earlierMomentLabel,
  emptyMomentsMessage,
  laterMomentLabel,
  mapCompareError,
  swapOrderHint,
} from '@/lib/narrativeSnapshotsHelpCopy';
import {
  compareSnapshots,
  createMilestoneSnapshot,
  fetchNarrativeSnapshots,
} from '@/lib/visitSnapshotsApi';
import type { NarrativeSnapshotListItem, RegionDiffV1 } from '@/types/visitSnapshots';

type CampaignHistoryPanelProps = {
  campaignHandle: string;
};

function pickDefaultSelections(
  snapshots: NarrativeSnapshotListItem[],
): { earlierId: string; laterId: string } | null {
  const comparable = snapshots.filter((s) => s.comparable);
  if (comparable.length < 2) return null;
  return {
    laterId: comparable[0].id,
    earlierId: comparable[1].id,
  };
}

function resolveOrderedIds(
  snapshots: NarrativeSnapshotListItem[],
  earlierId: string,
  laterId: string,
): { fromId: string; toId: string; swapped: boolean } {
  const earlier = snapshots.find((s) => s.id === earlierId);
  const later = snapshots.find((s) => s.id === laterId);
  if (!earlier || !later) {
    return { fromId: earlierId, toId: laterId, swapped: false };
  }
  const earlierMinute = BigInt(earlier.capturedAtEpochMinute);
  const laterMinute = BigInt(later.capturedAtEpochMinute);
  if (earlierMinute >= laterMinute) {
    return { fromId: laterId, toId: earlierId, swapped: true };
  }
  return { fromId: earlierId, toId: laterId, swapped: false };
}

export function CampaignHistoryPanel({ campaignHandle }: CampaignHistoryPanelProps) {
  const [allSnapshots, setAllSnapshots] = useState<NarrativeSnapshotListItem[]>([]);
  const [earlierId, setEarlierId] = useState('');
  const [laterId, setLaterId] = useState('');
  const [swapHint, setSwapHint] = useState(false);
  const [diff, setDiff] = useState<RegionDiffV1 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [creatingMilestone, setCreatingMilestone] = useState(false);

  const loadSnapshots = useCallback(async () => {
    setListLoading(true);
    try {
      const { snapshots } = await fetchNarrativeSnapshots(campaignHandle);
      setAllSnapshots(snapshots);
      const defaults = pickDefaultSelections(snapshots);
      if (defaults) {
        setEarlierId(defaults.earlierId);
        setLaterId(defaults.laterId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign moments');
    } finally {
      setListLoading(false);
    }
  }, [campaignHandle]);

  useEffect(() => {
    void loadSnapshots();
  }, [loadSnapshots]);

  const comparableSnapshots = useMemo(
    () => allSnapshots.filter((s) => s.comparable),
    [allSnapshots],
  );

  const runCompare = async () => {
    if (!earlierId || !laterId) return;
    const { fromId, toId, swapped } = resolveOrderedIds(
      allSnapshots,
      earlierId,
      laterId,
    );
    if (swapped) {
      setEarlierId(fromId);
      setLaterId(toId);
      setSwapHint(true);
    } else {
      setSwapHint(false);
    }

    setLoading(true);
    setError(null);
    try {
      const result = await compareSnapshots(campaignHandle, fromId, toId, 'GAMEMASTER');
      setDiff(result);
    } catch (err) {
      setDiff(null);
      const message = err instanceof Error ? err.message : 'Compare failed';
      setError(mapCompareError(message));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMilestone = async () => {
    const label = window.prompt(createMilestonePrompt)?.trim();
    if (label === undefined) return;
    setCreatingMilestone(true);
    setError(null);
    try {
      await createMilestoneSnapshot(campaignHandle, label ? { label } : {});
      await loadSnapshots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to capture milestone');
    } finally {
      setCreatingMilestone(false);
    }
  };

  const renderSelectOptions = () =>
    allSnapshots.map((snapshot) => (
      <option
        key={snapshot.id}
        value={snapshot.id}
        disabled={!snapshot.comparable}
      >
        {formatMomentOptionLabel(snapshot)}
        {!snapshot.comparable ? ` (${archivedMomentHint})` : ''}
      </option>
    ));

  return (
    <section className="rounded-lg border border-border p-4 space-y-4 text-sm">
      <div>
        <h3 className="font-medium text-base">{campaignHistoryTitle}</h3>
        <p className="mt-1 text-xs text-muted">{campaignHistorySubtitle}</p>
      </div>

      <NarrativeSnapshotsHelp />

      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-medium">{compareBlockHeading}</h4>
          <p className="mt-0.5 text-xs text-muted">{compareBlockHint}</p>
        </div>

        {listLoading ? (
          <p className="text-xs text-muted">Loading campaign moments…</p>
        ) : allSnapshots.length === 0 ? (
          <p className="text-xs text-muted">{emptyMomentsMessage}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs text-muted">{earlierMomentLabel}</span>
              <select
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs"
                value={earlierId}
                onChange={(e) => {
                  setEarlierId(e.target.value);
                  setSwapHint(false);
                }}
              >
                <option value="">Select…</option>
                {renderSelectOptions()}
              </select>
              {earlierId ? (
                <MomentPreview snapshot={allSnapshots.find((s) => s.id === earlierId)} />
              ) : null}
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">{laterMomentLabel}</span>
              <select
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs"
                value={laterId}
                onChange={(e) => {
                  setLaterId(e.target.value);
                  setSwapHint(false);
                }}
              >
                <option value="">Select…</option>
                {renderSelectOptions()}
              </select>
              {laterId ? (
                <MomentPreview snapshot={allSnapshots.find((s) => s.id === laterId)} />
              ) : null}
            </label>
          </div>
        )}

        {swapHint ? (
          <p className="text-xs text-muted">{swapOrderHint}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
            disabled={
              loading || listLoading || !earlierId || !laterId || comparableSnapshots.length < 2
            }
            onClick={() => void runCompare()}
          >
            {compareButtonLabel}
          </button>
          <button
            type="button"
            className="rounded border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground disabled:opacity-50"
            disabled={creatingMilestone || listLoading}
            onClick={() => void handleCreateMilestone()}
          >
            {createMilestoneButton}
          </button>
        </div>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {diff ? (
        <ul className="list-disc space-y-1 pl-4">
          {diff.summaryLines.length > 0 ? (
            diff.summaryLines.map((line) => <li key={line}>{line}</li>)
          ) : (
            <li className="text-muted">No summary lines for this comparison.</li>
          )}
        </ul>
      ) : null}
    </section>
  );
}

function MomentPreview({
  snapshot,
}: {
  snapshot: NarrativeSnapshotListItem | undefined;
}) {
  if (!snapshot) return null;
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
      <span className="font-medium text-foreground">{snapshot.dateLabel}</span>
      <SnapshotKindBadge kindLabel={snapshot.kindLabel} />
      <span>{snapshot.displayLabel}</span>
      {!snapshot.comparable ? (
        <span className="text-destructive/80">({archivedMomentHint})</span>
      ) : null}
    </p>
  );
}
