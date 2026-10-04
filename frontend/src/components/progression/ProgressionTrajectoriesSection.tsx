import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleHelp, Plus } from 'lucide-react';
import { useWiki } from '@/contexts/WikiContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  fetchCampaignMomentum,
  fetchWorldPressure,
  updateCampaignMomentum,
} from '@/lib/progressionApi';
import { parseOrganizationMetadata } from '@/lib/organizationMetadata';
import { updateOrganizationMetadata } from '@/lib/wiki';
import { resolveCanonicalEntityCategory } from '@shared/resolveCanonicalEntityCategory';
import {
  createFactionEraTrajectory,
  type CampaignEra,
  type FactionEraTrajectory,
} from '@shared/factionMomentumMetadata';
import { platformGuidePath } from '@/lib/platformGuides';
import { CampaignEraEditor } from '@/components/progression/CampaignEraEditor';
import {
  CreateTrajectoryDialog,
  trajectoryOrgEraKey,
} from '@/components/progression/CreateTrajectoryDialog';
import {
  TrajectoryTable,
  type TrajectoryTableRow,
} from '@/components/progression/TrajectoryTable';

interface ProgressionTrajectoriesSectionProps {
  campaignHandle: string;
}

/**
 * Progression › Trajectories — opt-in directions over time.
 * Graph visualization is a planned later Progression view.
 */
export function ProgressionTrajectoriesSection({
  campaignHandle,
}: ProgressionTrajectoriesSectionProps) {
  const { flatPages, refresh: refreshWiki } = useWiki();
  const [loading, setLoading] = useState(true);
  const [savingEras, setSavingEras] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [momentumState, setMomentumState] = useState<
    Awaited<ReturnType<typeof fetchCampaignMomentum>>['state'] | null
  >(null);
  const [currentEraName, setCurrentEraName] = useState<string | null>(null);
  const [manageErasOpen, setManageErasOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  /** Optimistic per-page trajectory overrides keyed by page id. */
  const [overrides, setOverrides] = useState<Record<string, FactionEraTrajectory[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [momentum, pressure] = await Promise.all([
        fetchCampaignMomentum(campaignHandle),
        fetchWorldPressure(campaignHandle),
      ]);
      setMomentumState(momentum.state);
      setCurrentEraName(pressure.projection.currentEra.name);
      setOverrides({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trajectories');
    } finally {
      setLoading(false);
    }
  }, [campaignHandle]);

  useEffect(() => {
    void load();
  }, [load]);

  const organizationPages = useMemo(
    () =>
      flatPages.filter(
        (page) => resolveCanonicalEntityCategory(page, flatPages) === 'organizations',
      ),
    [flatPages],
  );

  const trajectoriesForPage = useCallback(
    (pageId: string, metadata: unknown): FactionEraTrajectory[] => {
      if (overrides[pageId]) return overrides[pageId]!;
      return parseOrganizationMetadata(metadata).eraTrajectories;
    },
    [overrides],
  );

  const rows: TrajectoryTableRow[] = useMemo(() => {
    const list: TrajectoryTableRow[] = [];
    for (const page of organizationPages) {
      const trajectories = trajectoriesForPage(page.id, page.metadata);
      for (const trajectory of trajectories) {
        list.push({ pageId: page.id, title: page.title, trajectory });
      }
    }
    list.sort((a, b) => {
      const titleCmp = a.title.localeCompare(b.title);
      if (titleCmp !== 0) return titleCmp;
      return a.trajectory.eraId.localeCompare(b.trajectory.eraId);
    });
    return list;
  }, [organizationPages, trajectoriesForPage]);

  const existingKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const row of rows) {
      keys.add(trajectoryOrgEraKey(row.pageId, row.trajectory.eraId));
    }
    return keys;
  }, [rows]);

  const persistPageTrajectories = useCallback(
    async (pageId: string, eraTrajectories: FactionEraTrajectory[]) => {
      setOverrides((prev) => ({ ...prev, [pageId]: eraTrajectories }));
      try {
        const result = await updateOrganizationMetadata(campaignHandle, pageId, {
          eraTrajectories,
        });
        const saved = parseOrganizationMetadata(result.metadata).eraTrajectories;
        setOverrides((prev) => ({ ...prev, [pageId]: saved }));
        void refreshWiki();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save trajectory');
        throw err;
      }
    },
    [campaignHandle, refreshWiki],
  );

  function handlePatch(
    pageId: string,
    fromEraId: string,
    patch: Partial<FactionEraTrajectory>,
    persist: boolean,
  ) {
    const page = organizationPages.find((p) => p.id === pageId);
    if (!page) return;
    const current = trajectoriesForPage(pageId, page.metadata);
    const existing = current.find((t) => t.eraId === fromEraId);
    if (!existing) return;

    const nextEraId = patch.eraId ?? existing.eraId;
    if (nextEraId !== fromEraId && current.some((t) => t.eraId === nextEraId)) {
      setError('This organization already has a trajectory starting in that era.');
      return;
    }

    const nextTrajectory = createFactionEraTrajectory({
      ...existing,
      ...patch,
      eraId: nextEraId,
    });
    const without = current.filter((t) => t.eraId !== fromEraId);
    const eraTrajectories = [...without, nextTrajectory];
    setOverrides((prev) => ({ ...prev, [pageId]: eraTrajectories }));
    if (persist) {
      void persistPageTrajectories(pageId, eraTrajectories);
    }
  }

  function handlePersistPage(pageId: string) {
    const page = organizationPages.find((p) => p.id === pageId);
    if (!page) return;
    const eraTrajectories = trajectoriesForPage(pageId, page.metadata);
    void persistPageTrajectories(pageId, eraTrajectories);
  }

  async function handleSaveEras(eras: CampaignEra[]) {
    setSavingEras(true);
    setError(null);
    try {
      const result = await updateCampaignMomentum(campaignHandle, { eras });
      setMomentumState(result.state);
      const pressure = await fetchWorldPressure(campaignHandle);
      setCurrentEraName(pressure.projection.currentEra.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save eras');
      throw err;
    } finally {
      setSavingEras(false);
    }
  }

  if (loading) {
    return (
      <div className="py-12">
        <LoadingSpinner label="Loading trajectories…" />
      </div>
    );
  }

  if (error && !momentumState) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (!momentumState) {
    return <p className="text-sm text-muted-foreground">No trajectory data available.</p>;
  }

  const eras = momentumState.eras;
  const currentLabel = currentEraName ?? eras.find((era) => era.isCurrent)?.name ?? 'Present';

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Trajectories</h2>
          <p className="text-sm text-muted-foreground">Where is the world going?</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={platformGuidePath('world-development')}
            aria-label="Trajectories help"
            title="Trajectories help"
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <CircleHelp className="size-4" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-3.5" aria-hidden />
            Trajectory
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          onClick={() => setManageErasOpen((open) => !open)}
          className="rounded-md border border-border/70 px-2.5 py-1 text-foreground hover:border-primary/40"
          aria-expanded={manageErasOpen}
        >
          Era: {currentLabel} ▾
        </button>
        <button
          type="button"
          onClick={() => setManageErasOpen(true)}
          className="text-primary hover:underline"
        >
          Manage eras
        </button>
      </div>

      {manageErasOpen ? (
        <CampaignEraEditor
          key={eras.map((era) => `${era.id}:${era.isCurrent ? '1' : '0'}`).join('|')}
          state={momentumState}
          saving={savingEras}
          onSave={handleSaveEras}
        />
      ) : null}

      <TrajectoryTable
        campaignHandle={campaignHandle}
        flatPages={flatPages}
        eras={eras}
        rows={rows}
        onPatch={handlePatch}
        onPersistPage={handlePersistPage}
      />

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {createOpen ? (
        <CreateTrajectoryDialog
          campaignHandle={campaignHandle}
          eras={eras}
          organizationPages={organizationPages}
          existingKeys={existingKeys}
          onCancel={() => setCreateOpen(false)}
          onCreated={(pageId, eraTrajectories) => {
            setOverrides((prev) => ({ ...prev, [pageId]: eraTrajectories }));
            setCreateOpen(false);
            void refreshWiki();
          }}
        />
      ) : null}
    </div>
  );
}
