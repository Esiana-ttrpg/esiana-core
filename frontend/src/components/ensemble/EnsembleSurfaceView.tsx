import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Users } from 'lucide-react';
import { useWiki } from '@/contexts/WikiContext';
import { CampaignMemberRoles, type CampaignMemberRole } from '@/types/domain';
import { useCampaignChronologyNow } from '@/hooks/useCampaignChronologyNow';
import { buildPartyProjection } from '@/lib/buildPartyProjection';
import type { WikiPageLineageSnapshot } from '@/lib/entityProjectionQueries';
import { fetchEnsembleBundle, updateEnsembleConfigApi } from '@/lib/ensembleApi';
import {
  isEnsembleSpotlightRandom,
  normalizeEnsembleConfig,
  type EnsembleConfig,
} from '@/lib/ensembleConfig';
import { campaignDashboardPath, campaignSettingsPath } from '@/lib/campaignPaths';
import { isElevatedMembershipRole } from '@/types/domain';
import { canViewWikiPage } from '@/lib/wikiVisibility';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { WikiWorkspaceShell } from '@/components/layout/WikiWorkspaceShell';
import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { PartyBanner } from './PartyBanner';
import { PartySpotlightHero } from './PartySpotlightHero';
import { PartyMemberPortraitCard } from './PartyMemberPortraitCard';
import { PartyPursuitsStrip } from './PartyPursuitsStrip';
import { PartyDynamicsPanel } from './PartyDynamicsPanel';
import { EnsembleEditDrawer } from './EnsembleEditDrawer';

interface EnsembleSurfaceViewProps {
  campaignHandle: string;
}

export function EnsembleSurfaceView({ campaignHandle }: EnsembleSurfaceViewProps) {
  const { flatPages, loading: wikiLoading, campaign: wikiCampaign } = useWiki();
  const campaignNow = useCampaignChronologyNow(campaignHandle);

  const [bundleLoading, setBundleLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<EnsembleConfig>(() => normalizeEnsembleConfig(null));
  const [campaignName, setCampaignName] = useState('');
  const [rosterMembers, setRosterMembers] = useState<
    Array<{ userId: string; playerLabel: string; identityPageId: string | null }>
  >([]);
  const [questSnippets, setQuestSnippets] = useState<Record<string, string | null>>({});
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [visitSpotlightCharacterId, setVisitSpotlightCharacterId] = useState<string | null>(null);
  const isStaff =
    wikiCampaign?.role != null && isElevatedMembershipRole(wikiCampaign.role);

  const isDMUser =
    wikiCampaign?.role === CampaignMemberRoles.GAMEMASTER ||
    wikiCampaign?.role === CampaignMemberRoles.WRITER;

  const snapshots: WikiPageLineageSnapshot[] = useMemo(
    () =>
      flatPages.map((page) => ({
        id: page.id,
        title: page.title,
        templateType: page.templateType,
        metadata: page.metadata,
      })),
    [flatPages],
  );

  const visibilityByPageId = useMemo(() => {
    const map = new Map<string, string>();
    for (const page of flatPages) {
      map.set(page.id, page.visibility);
    }
    return map;
  }, [flatPages]);

  const loadBundle = useCallback(async () => {
    setBundleLoading(true);
    setError(null);
    try {
      const bundle = await fetchEnsembleBundle(campaignHandle);
      setConfig(bundle.config);
      setCampaignName(bundle.campaignName);
      setRosterMembers(bundle.members);
      const snippets: Record<string, string | null> = {};
      for (const quest of bundle.pursuits) {
        snippets[quest.id] = quest.snippet;
      }
      setQuestSnippets(snippets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load party');
    } finally {
      setBundleLoading(false);
    }
  }, [campaignHandle]);

  useEffect(() => {
    void loadBundle();
  }, [loadBundle]);

  useEffect(() => {
    setVisitSpotlightCharacterId(null);
  }, [campaignHandle]);

  const canViewCharacter = useCallback(
    (characterId: string) => {
      const visibility = visibilityByPageId.get(characterId) ?? 'Party';
      return canViewWikiPage(
        visibility,
        (wikiCampaign?.role as CampaignMemberRole | undefined) ?? null,
      );
    },
    [visibilityByPageId, wikiCampaign?.role],
  );

  useEffect(() => {
    if (!isEnsembleSpotlightRandom(config.spotlightCharacterId)) {
      setVisitSpotlightCharacterId(null);
    }
  }, [config.spotlightCharacterId]);

  useEffect(() => {
    if (bundleLoading) return;
    if (!isEnsembleSpotlightRandom(config.spotlightCharacterId)) return;

    setVisitSpotlightCharacterId((prev) => {
      if (prev !== null) return prev;
      const interim = buildPartyProjection({
        config,
        rosterMembers,
        flatPages: snapshots,
        wikiTreePages: flatPages,
        campaignNow,
        isDMUser,
        canViewCharacter,
        questSnippets,
      });
      const pool = interim.members;
      if (pool.length === 0) return null;
      return pool[Math.floor(Math.random() * pool.length)]!.characterId;
    });
  }, [
    bundleLoading,
    config,
    rosterMembers,
    snapshots,
    flatPages,
    campaignNow,
    isDMUser,
    canViewCharacter,
    questSnippets,
  ]);

  const projection = useMemo(() => {
    if (bundleLoading) return null;
    return buildPartyProjection({
      config,
      rosterMembers,
      flatPages: snapshots,
      wikiTreePages: flatPages,
      campaignNow,
      isDMUser,
      canViewCharacter,
      questSnippets,
      resolvedSpotlightCharacterId: isEnsembleSpotlightRandom(config.spotlightCharacterId)
        ? visitSpotlightCharacterId
        : undefined,
    });
  }, [
    bundleLoading,
    config,
    rosterMembers,
    flatPages,
    snapshots,
    campaignNow,
    isDMUser,
    canViewCharacter,
    questSnippets,
    visitSpotlightCharacterId,
  ]);

  const fullRosterForSpotlight = useMemo(() => {
    if (!projection) return [];
    const all = [...projection.members];
    if (projection.spotlight) all.unshift(projection.spotlight.member);
    return all;
  }, [projection]);

  async function handleSave(nextConfig: EnsembleConfig) {
    setSaving(true);
    try {
      const result = await updateEnsembleConfigApi(campaignHandle, nextConfig);
      setConfig(result.config);
      setEditOpen(false);
      await loadBundle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (wikiLoading || bundleLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !projection) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!projection) return null;

  const hasRoster = projection.members.length > 0 || projection.spotlight;

  return (
    <WikiWorkspaceShell
      composition="studio"
      header={
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3 border-b border-focal-muted/15 pb-4">
          <h1
            className={`${TYPE_DISPLAY_CLASS} flex items-center gap-2 text-2xl text-focal-foreground sm:text-3xl`}
          >
            <Users className="size-7 text-primary/80" strokeWidth={1.25} />
            Party
          </h1>
          {isDMUser ? (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <Pencil className="size-3.5" />
              Edit party
            </button>
          ) : null}
        </div>
      }
    >
      <PartyBanner campaignName={campaignName} config={projection.config} />

      {projection.spotlight ? (
        <PartySpotlightHero spotlight={projection.spotlight} campaignHandle={campaignHandle} />
      ) : null}

      {hasRoster ? (
        <section className="space-y-4">
          <h2 className="font-serif text-lg font-semibold text-foreground">The party</h2>
          <div className="grid grid-cols-2 gap-4 pb-2 pt-1 sm:grid-cols-3 lg:grid-cols-4">
            {projection.members.map((member) => (
              <PartyMemberPortraitCard
                key={member.characterId}
                member={member}
                campaignHandle={campaignHandle}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-10 text-center">
          <Users className="mx-auto size-10 text-muted/50" />
          <h2 className="mt-3 text-lg font-semibold text-foreground">No party cast yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Open a character page, edit Character Identity, and turn on Active party character under
            Participation. Portraits and story hooks appear here automatically.
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs text-muted">
            {isStaff
              ? 'To show who plays a character, link players in Campaign Settings → Access or the codex rail.'
              : 'Players link themselves from Campaign Home when a character page is ready.'}
          </p>
          {isStaff ? (
            <Link
              to={campaignSettingsPath(campaignHandle, 'access')}
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              Set up member identity mapping →
            </Link>
          ) : (
            <Link
              to={campaignDashboardPath(campaignHandle)}
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              Go to Campaign Home →
            </Link>
          )}
          {projection.unmappedMemberCount > 0 ? (
            <p className="mt-2 text-xs text-muted">
              {projection.unmappedMemberCount} player character
              {projection.unmappedMemberCount === 1 ? '' : 's'} still need a player linked.
            </p>
          ) : null}
        </section>
      )}

      <PartyPursuitsStrip pursuits={projection.pursuits} campaignHandle={campaignHandle} />

      <PartyDynamicsPanel
        dynamics={projection.dynamics}
        campaignHandle={campaignHandle}
        flatPages={snapshots}
      />

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <EnsembleEditDrawer
        open={editOpen}
        campaignHandle={campaignHandle}
        config={config}
        rosterForSpotlight={fullRosterForSpotlight}
        saving={saving}
        onClose={() => setEditOpen(false)}
        onSave={handleSave}
      />
    </WikiWorkspaceShell>
  );
}
