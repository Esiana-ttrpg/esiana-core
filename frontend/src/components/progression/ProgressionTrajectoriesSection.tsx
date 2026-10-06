import { trajectoryKey } from '@shared/factionMomentumMetadata';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleHelp, Plus } from 'lucide-react';
import { useWiki } from '@/contexts/WikiContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  fetchCampaignMomentum,
} from '@/lib/progressionApi';
import {
  parseCharacterMetadata,
  resolveCharacterStatus,
} from '@/lib/characterMetadata';
import { parseCharacterLineageMetadata } from '@/lib/characterLineageMetadata';
import { parseLocationMetadata } from '@/lib/locationMetadata';
import { parseOrganizationMetadata } from '@/lib/organizationMetadata';
import {
  updateCharacterMetadata,
  updateLocationMetadata,
  updateOrganizationMetadata,
} from '@/lib/wiki';
import { resolveCanonicalEntityCategory } from '@shared/resolveCanonicalEntityCategory';
import type { TrajectorySubjectCategory } from '@shared/developmentProvider';
import {
  createEraTrajectory,
  createFactionEraTrajectory,
  type EraTrajectory,
  type FactionEraTrajectory,
} from '@shared/factionMomentumMetadata';
import { platformGuidePath } from '@/lib/platformGuides';
import {
  CreateTrajectoryDialog,
  trajectoryOrgEraKey,
  type TrajectorySubjectOption,
} from '@/components/progression/CreateTrajectoryDialog';
import {
  TrajectoryTable,
  type TrajectoryTableRow,
} from '@/components/progression/TrajectoryTable';

interface ProgressionTrajectoriesSectionProps {
  campaignHandle: string;
}

type CategoryFilter = 'all' | TrajectorySubjectCategory;

/**
 * Progression › Trajectories — opt-in directions over time.
 * Graph visualization is a planned later Progression view.
 */
export function ProgressionTrajectoriesSection({
  campaignHandle,
}: ProgressionTrajectoriesSectionProps) {
  const { flatPages, refresh: refreshWiki } = useWiki();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [momentumState, setMomentumState] = useState<
    Awaited<ReturnType<typeof fetchCampaignMomentum>>['state'] | null
  >(null);
  const [currentEraName, setCurrentEraName] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [search, setSearch] = useState('');
  /** Optimistic per-page trajectory overrides keyed by page id. */
  const [overrides, setOverrides] = useState<Record<string, EraTrajectory[]>>({});
  const [categoryByPageId, setCategoryByPageId] = useState<
    Record<string, TrajectorySubjectCategory>
  >({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const momentum = await fetchCampaignMomentum(campaignHandle);
      setMomentumState(momentum.state);
      setCurrentEraName(momentum.state.eras.find(era => era.isMasterTime && era.isCurrent)?.name ?? null);
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

  const subjectPages = useMemo(() => {
    const orgs: TrajectorySubjectOption[] = [];
    const characters: TrajectorySubjectOption[] = [];
    const locations: TrajectorySubjectOption[] = [];
    const categoryMap: Record<string, TrajectorySubjectCategory> = {};

    for (const page of flatPages) {
      const category = resolveCanonicalEntityCategory(page, flatPages);
      if (category === 'organizations') {
        categoryMap[page.id] = 'organizations';
        orgs.push({ page, category: 'organizations' });
      } else if (category === 'characters') {
        categoryMap[page.id] = 'characters';
        const identity = parseCharacterMetadata(page.metadata);
        const lineage = parseCharacterLineageMetadata(page.metadata);
        const status = resolveCharacterStatus(identity, lineage);
        characters.push({ page, category: 'characters', statusLabel: status });
      } else if (category === 'locations') {
        categoryMap[page.id] = 'locations';
        locations.push({ page, category: 'locations' });
      }
    }

    return { orgs, characters, locations, categoryMap, all: [...orgs, ...characters, ...locations] };
  }, [flatPages]);

  useEffect(() => {
    setCategoryByPageId(subjectPages.categoryMap);
  }, [subjectPages.categoryMap]);

  const trajectoriesForPage = useCallback(
    (pageId: string, metadata: unknown, category: TrajectorySubjectCategory): EraTrajectory[] => {
      if (overrides[pageId]) return overrides[pageId]!;
      if (category === 'organizations') {
        return parseOrganizationMetadata(metadata).eraTrajectories;
      }
      if (category === 'characters') {
        return parseCharacterMetadata(metadata).eraTrajectories;
      }
      return parseLocationMetadata(metadata).eraTrajectories;
    },
    [overrides],
  );

  const rows: TrajectoryTableRow[] = useMemo(() => {
    const list: TrajectoryTableRow[] = [];
    for (const subject of subjectPages.all) {
      const trajectories = trajectoriesForPage(
        subject.page.id,
        subject.page.metadata,
        subject.category,
      );
      for (const trajectory of trajectories) {
        list.push({
          pageId: subject.page.id,
          title: subject.page.title,
          category: subject.category,
          trajectory,
        });
      }
    }
    list.sort((a, b) => {
      const titleCmp = a.title.localeCompare(b.title);
      if (titleCmp !== 0) return titleCmp;
      return (a.trajectory.eraId ?? '').localeCompare(b.trajectory.eraId ?? '');
    });
    return list;
  }, [subjectPages.all, trajectoriesForPage]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (categoryFilter !== 'all' && row.category !== categoryFilter) return false;
      if (q && !row.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, categoryFilter, search]);

  const existingKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const row of rows) {
      keys.add(trajectoryOrgEraKey(row.pageId, row.trajectory.eraId));
    }
    return keys;
  }, [rows]);

  const persistPageTrajectories = useCallback(
    async (
      pageId: string,
      eraTrajectories: EraTrajectory[],
      category: TrajectorySubjectCategory,
    ) => {
      setOverrides((prev) => ({ ...prev, [pageId]: eraTrajectories }));
      try {
        let saved: EraTrajectory[];
        if (category === 'organizations') {
          const result = await updateOrganizationMetadata(campaignHandle, pageId, {
            eraTrajectories,
          });
          saved = parseOrganizationMetadata(result.metadata).eraTrajectories;
        } else if (category === 'characters') {
          const result = await updateCharacterMetadata(campaignHandle, pageId, {
            eraTrajectories,
          });
          saved = parseCharacterMetadata(result.metadata).eraTrajectories;
        } else {
          const result = await updateLocationMetadata(campaignHandle, pageId, {
            eraTrajectories,
          });
          saved = parseLocationMetadata(result.metadata).eraTrajectories;
        }
        setOverrides((prev) => ({ ...prev, [pageId]: saved }));
        void refreshWiki();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save trajectory');
        throw err;
      }
    },
    [campaignHandle, refreshWiki],
  );

  function resolveCategory(pageId: string): TrajectorySubjectCategory | null {
    return categoryByPageId[pageId] ?? subjectPages.categoryMap[pageId] ?? null;
  }

  function handlePatch(
    pageId: string,
    fromEraId: string | null,
    patch: Partial<FactionEraTrajectory>,
    persist: boolean,
  ) {
    const category = resolveCategory(pageId);
    if (!category) return;
    const page = flatPages.find((p) => p.id === pageId);
    if (!page) return;
    const current = trajectoriesForPage(pageId, page.metadata, category);
    const existing = current.find((t) => trajectoryKey(t) === fromEraId);
    if (!existing) return;

    const nextEraId = patch.eraId !== undefined ? patch.eraId : existing.eraId;
    if (nextEraId != null && nextEraId !== existing?.eraId && current.some((t) => t.eraId === nextEraId)) {
      setError('This entity already has a trajectory starting in that era.');
      return;
    }

    const nextTrajectory =
      category === 'organizations'
        ? createFactionEraTrajectory({
            ...(existing as FactionEraTrajectory),
            ...patch,
            eraId: nextEraId,
          })
        : createEraTrajectory({
            ...existing,
            direction: patch.direction !== undefined ? patch.direction : existing.direction,
            outcome: patch.outcome !== undefined ? patch.outcome : existing.outcome,
            byEraId: patch.byEraId !== undefined ? patch.byEraId : existing.byEraId,
            gmNote: patch.gmNote !== undefined ? patch.gmNote : existing.gmNote,
            eraId: nextEraId,
          });
    const without = current.filter((t) => trajectoryKey(t) !== fromEraId);
    const eraTrajectories = [...without, nextTrajectory];
    setOverrides((prev) => ({ ...prev, [pageId]: eraTrajectories }));
    if (persist) {
      void persistPageTrajectories(pageId, eraTrajectories, category);
    }
  }

  function handlePersistPage(pageId: string) {
    const category = resolveCategory(pageId);
    if (!category) return;
    const page = flatPages.find((p) => p.id === pageId);
    if (!page) return;
    const eraTrajectories = trajectoriesForPage(pageId, page.metadata, category);
    void persistPageTrajectories(pageId, eraTrajectories, category);
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
  const currentLabel = currentEraName ?? 'No current era';

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
        <span>Era: {currentLabel}</span>
        <Link to={`/campaigns/${campaignHandle}/chronology?view=eras`} className="text-primary hover:underline">Manage eras</Link>
        <select
          aria-label="Filter by type"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
          className="rounded-md border border-border/70 bg-background px-2.5 py-1 text-foreground"
        >
          <option value="all">All</option>
          <option value="organizations">Organizations</option>
          <option value="characters">Characters</option>
          <option value="locations">Locations</option>
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          aria-label="Search trajectories"
          className="rounded-md border border-border/70 bg-background px-2.5 py-1 text-foreground"
        />
      </div>



      <TrajectoryTable
        campaignHandle={campaignHandle}
        flatPages={flatPages}
        eras={eras}
        rows={filteredRows}
        onPatch={handlePatch}
        onPersistPage={handlePersistPage}
      />

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {createOpen ? (
        <CreateTrajectoryDialog
          campaignHandle={campaignHandle}
          eras={eras}
          subjects={subjectPages.all}
          existingKeys={existingKeys}
          onCancel={() => setCreateOpen(false)}
          onCreated={(pageId, eraTrajectories, category) => {
            setOverrides((prev) => ({ ...prev, [pageId]: eraTrajectories }));
            setCategoryByPageId((prev) => ({ ...prev, [pageId]: category }));
            setCreateOpen(false);
            void refreshWiki();
          }}
        />
      ) : null}
    </div>
  );
}
