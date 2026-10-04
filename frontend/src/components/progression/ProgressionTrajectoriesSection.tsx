import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWiki } from '@/contexts/WikiContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  fetchCampaignMomentum,
  fetchWorldPressure,
  updateCampaignMomentum,
} from '@/lib/progressionApi';
import { parseOrganizationMetadata } from '@/lib/organizationMetadata';
import { resolveCanonicalEntityCategory } from '@shared/resolveCanonicalEntityCategory';
import { resolveFactionTrajectoryForEra } from '@shared/factionMomentumMetadata';
import type { CampaignEra } from '@shared/factionMomentumMetadata';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { CampaignEraEditor } from '@/components/progression/CampaignEraEditor';

interface ProgressionTrajectoriesSectionProps {
  campaignHandle: string;
}

/**
 * Progression › Trajectories — where the world is going.
 * Eras + missing trajectories. Graph visualization is a planned later Progression view.
 * Pacing / preview / outlook panels are not mounted here.
 */
export function ProgressionTrajectoriesSection({
  campaignHandle,
}: ProgressionTrajectoriesSectionProps) {
  const { flatPages } = useWiki();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [momentumState, setMomentumState] = useState<
    Awaited<ReturnType<typeof fetchCampaignMomentum>>['state'] | null
  >(null);
  const [currentEraId, setCurrentEraId] = useState<string | null>(null);
  const [currentEraName, setCurrentEraName] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [momentum, pressure] = await Promise.all([
        fetchCampaignMomentum(campaignHandle),
        fetchWorldPressure(campaignHandle),
      ]);
      setMomentumState(momentum.state);
      setCurrentEraId(pressure.projection.currentEra.id);
      setCurrentEraName(pressure.projection.currentEra.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trajectories');
    } finally {
      setLoading(false);
    }
  }, [campaignHandle]);

  useEffect(() => {
    void load();
  }, [load]);

  const missingTrajectoryOrgs = useMemo(() => {
    if (!currentEraId) return [];
    return flatPages
      .filter((page) => resolveCanonicalEntityCategory(page, flatPages) === 'organizations')
      .map((page) => {
        const org = parseOrganizationMetadata(page.metadata);
        if (org.organizationStatus !== 'ACTIVE') return null;
        const hasTrajectory =
          resolveFactionTrajectoryForEra({
            eraTrajectories: org.eraTrajectories,
            eraId: currentEraId,
            worldState: org.worldState,
          }) != null;
        return hasTrajectory ? null : { id: page.id, title: page.title };
      })
      .filter((row): row is { id: string; title: string } => row != null)
      .slice(0, 12);
  }, [currentEraId, flatPages]);

  async function handleSaveEras(eras: CampaignEra[]) {
    setSaving(true);
    setError(null);
    try {
      const result = await updateCampaignMomentum(campaignHandle, { eras });
      setMomentumState(result.state);
      const pressure = await fetchWorldPressure(campaignHandle);
      setCurrentEraId(pressure.projection.currentEra.id);
      setCurrentEraName(pressure.projection.currentEra.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save eras');
      throw err;
    } finally {
      setSaving(false);
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

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Trajectories</h2>
        <p className="text-sm text-muted-foreground">
          Where the world is going — campaign eras and faction directions
          {currentEraName ? (
            <>
              {' '}
              for <span className="font-medium text-foreground">{currentEraName}</span>
            </>
          ) : null}
          .
        </p>
      </header>

      <CampaignEraEditor
        key={momentumState.eras.map((era) => `${era.id}:${era.isCurrent ? '1' : '0'}`).join('|')}
        state={momentumState}
        saving={saving}
        onSave={handleSaveEras}
      />

      {missingTrajectoryOrgs.length > 0 ? (
        <section className="space-y-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-3">
          <h3 className="text-sm font-medium text-foreground">Missing trajectories</h3>
          <p className="text-xs text-muted-foreground">
            These active organizations have no trajectory for the current era. Open an organization
            to author one — that direction feeds Developments when time advances.
          </p>
          <ul className="flex flex-wrap gap-2">
            {missingTrajectoryOrgs.map((org) => (
              <li key={org.id}>
                <Link
                  to={campaignWikiPath(campaignHandle, org.id, flatPages)}
                  className="rounded border border-border bg-background/60 px-3 py-1.5 text-sm hover:border-primary/40 hover:text-primary"
                >
                  {org.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          All active organizations have a trajectory for the current era.
        </p>
      )}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
