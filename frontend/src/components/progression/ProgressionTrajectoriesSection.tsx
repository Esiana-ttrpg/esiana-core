import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWiki } from '@/contexts/WikiContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { fetchWorldPressure } from '@/lib/progressionApi';
import { parseOrganizationMetadata } from '@/lib/organizationMetadata';
import { resolveCanonicalEntityCategory } from '@shared/resolveCanonicalEntityCategory';
import { resolveFactionTrajectoryForEra } from '@shared/factionMomentumMetadata';
import { campaignWikiPath } from '@/lib/campaignPaths';

interface ProgressionTrajectoriesSectionProps {
  campaignHandle: string;
}

/**
 * Progression › Trajectories — interim thin workspace after Insights removal.
 * Missing trajectories only. Era management, pacing, forecast, and outlook
 * are not relocated here merely to preserve Insights contents.
 */
export function ProgressionTrajectoriesSection({
  campaignHandle,
}: ProgressionTrajectoriesSectionProps) {
  const { flatPages } = useWiki();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentEraName, setCurrentEraName] = useState<string | null>(null);
  const [currentEraId, setCurrentEraId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pressure = await fetchWorldPressure(campaignHandle);
      setCurrentEraName(pressure.projection.currentEra.name);
      setCurrentEraId(pressure.projection.currentEra.id);
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

  if (loading) {
    return (
      <div className="py-12">
        <LoadingSpinner label="Loading trajectories…" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Trajectories</h2>
        <p className="text-sm text-muted-foreground">
          Where the world is going — start with factions that still need a direction
          {currentEraName ? (
            <>
              {' '}
              for <span className="font-medium text-foreground">{currentEraName}</span>
            </>
          ) : null}
          .
        </p>
      </header>

      {missingTrajectoryOrgs.length > 0 ? (
        <section className="space-y-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-3">
          <h3 className="text-sm font-medium text-foreground">Missing trajectories</h3>
          <p className="text-xs text-muted-foreground">
            These active organizations have no trajectory for the current era. Open an organization
            to author one.
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
    </div>
  );
}
