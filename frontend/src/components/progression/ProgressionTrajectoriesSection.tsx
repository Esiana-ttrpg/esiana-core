import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { CampaignEraEditor } from '@/components/progression/CampaignEraEditor';
import { CampaignPacingPanel } from '@/components/progression/CampaignPacingPanel';
import { WorldPressurePanel } from '@/components/progression/WorldPressurePanel';
import type { CampaignEra } from '@shared/factionMomentumMetadata';
import type { WorldPressureProjection } from '@shared/worldPressureProjection';

interface ProgressionTrajectoriesSectionProps {
  campaignHandle: string;
}

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
  const [projection, setProjection] = useState<WorldPressureProjection | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [momentum, pressure] = await Promise.all([
        fetchCampaignMomentum(campaignHandle),
        fetchWorldPressure(campaignHandle),
      ]);
      setMomentumState(momentum.state);
      setProjection(pressure.projection);
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
    if (!momentumState || !projection) return [];
    const currentEraId = projection.currentEra.id;
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
  }, [flatPages, momentumState, projection]);

  async function handleSaveEras(eras: CampaignEra[]) {
    setSaving(true);
    try {
      const result = await updateCampaignMomentum(campaignHandle, { eras });
      setMomentumState(result.state);
      const pressure = await fetchWorldPressure(campaignHandle);
      setProjection(pressure.projection);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="py-12">
        <LoadingSpinner label="Loading world outlook…" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (!momentumState || !projection) {
    return <p className="text-sm text-muted-foreground">No trajectory data available.</p>;
  }

  async function reloadProjection() {
    const pressure = await fetchWorldPressure(campaignHandle);
    setProjection(pressure.projection);
  }

  return (
    <div className="space-y-6">
      <CampaignEraEditor state={momentumState} saving={saving} onSave={handleSaveEras} />
      <CampaignPacingPanel
        campaignHandle={campaignHandle}
        momentumState={momentumState}
        onMomentumChange={setMomentumState}
        onProjectionReload={reloadProjection}
      />
      <WorldPressurePanel
        campaignHandle={campaignHandle}
        projection={projection}
        missingTrajectoryOrgs={missingTrajectoryOrgs}
        worldPressurePaused={momentumState.worldPressurePaused === true}
      />
    </div>
  );
}
