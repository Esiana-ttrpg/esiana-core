import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { LayoutGrid, Swords } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageContainer } from '@/components/layout/PageContainer';
import { SettingsPageLayout } from '@/components/settings/SettingsPageLayout';
import { fetchUserProfile } from '@/lib/user';
import type { UserProfile } from '@/types/user';
import { CampaignMemberRoles } from '@/types/domain';
import {
  CampaignMembershipRow,
  computeCampaignMetrics,
} from '@/components/campaign/CampaignMembershipList';
import { CampaignManagementRow } from '@/components/campaign/CampaignManagementRow';

export function YourCampaignsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchUserProfile();
      setProfile(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load campaigns.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void loadProfile();
  }, [isAuthenticated, loadProfile]);

  const { dmCampaigns, playerCampaigns, archivedDmCampaigns } = useMemo(() => {
    const list = profile?.campaigns ?? [];
    const dm = list.filter(
      (c) => c.role === CampaignMemberRoles.GAMEMASTER && !c.isArchived,
    );
    const archivedDm = list.filter(
      (c) => c.role === CampaignMemberRoles.GAMEMASTER && c.isArchived,
    );
    const player = list.filter((c) => c.role !== CampaignMemberRoles.GAMEMASTER);
    return { dmCampaigns: dm, playerCampaigns: player, archivedDmCampaigns: archivedDm };
  }, [profile]);

  const campaignMetrics = useMemo(
    () => computeCampaignMetrics(profile?.campaigns ?? []),
    [profile],
  );

  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (authLoading || loading) {
    return <LoadingSpinner label="Loading your campaigns…" />;
  }

  return (
    <PageContainer className="gap-8">
      <SettingsPageLayout className="flex flex-col gap-8">
        <header className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <LayoutGrid className="size-7" strokeWidth={1.5} />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Your Campaigns</h1>
          </div>
          <p className="text-sm text-muted">
            Campaigns you manage or play in. Dungeon Masters can duplicate, archive, transfer, or
            delete from the row menu.
          </p>
        </header>

        {loadError && (
          <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {loadError}
          </p>
        )}

        {profile ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-primary/30 bg-primary/10 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary/80">
                  Dungeon Master
                </p>
                <p className="mt-1 text-2xl font-bold text-primary">
                  Running {campaignMetrics.dmCount} Campaign
                  {campaignMetrics.dmCount === 1 ? '' : 's'}
                </p>
              </div>
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-sky-200/80">
                  Player
                </p>
                <p className="mt-1 text-2xl font-bold text-sky-100">
                  Player at {campaignMetrics.playerCount} Table
                  {campaignMetrics.playerCount === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            {dmCampaigns.length > 0 ? (
              <section className="rounded-xl border border-border bg-surface/80 p-6">
                <h2 className="text-lg font-semibold text-foreground">Campaigns you run</h2>
                <p className="mt-1 mb-4 text-sm text-muted">
                  Tables where you are the primary Dungeon Master.
                </p>
                <div className="space-y-2">
                  {dmCampaigns.map((campaign) => (
                    <CampaignManagementRow
                      key={campaign.id}
                      campaign={campaign}
                      onChanged={() => void loadProfile()}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {archivedDmCampaigns.length > 0 ? (
              <section className="rounded-xl border border-dashed border-border bg-surface/40 p-6">
                <h2 className="text-lg font-semibold text-foreground">Archived</h2>
                <p className="mt-1 mb-4 text-sm text-muted">
                  Hidden from the hub and recruitment. Open or manage from here.
                </p>
                <div className="space-y-2">
                  {archivedDmCampaigns.map((campaign) => (
                    <CampaignManagementRow
                      key={campaign.id}
                      campaign={campaign}
                      onChanged={() => void loadProfile()}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-xl border border-border bg-surface/80 p-6">
              <div className="mb-5 flex items-center gap-2">
                <Swords className="size-5 text-primary/90" />
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {playerCampaigns.length > 0 ? 'Campaigns you play' : 'Memberships'}
                  </h2>
                  <p className="text-sm text-muted">
                    {profile.campaigns.length === 0
                      ? 'You are not a member of any campaigns yet.'
                      : playerCampaigns.length > 0
                        ? `${playerCampaigns.length} table${
                            playerCampaigns.length === 1 ? '' : 's'
                          } as a player or viewer`
                        : 'No player memberships yet.'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {profile.campaigns.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-background/50 px-4 py-8 text-center text-sm text-muted">
                    Join or create a campaign from the{' '}
                    <Link to="/" className="text-primary hover:text-primary">
                      global hub
                    </Link>
                    .
                  </div>
                ) : playerCampaigns.length === 0 ? (
                  <p className="text-sm text-muted">You only have DM campaigns right now.</p>
                ) : (
                  playerCampaigns.map((campaign) => (
                    <CampaignMembershipRow
                      key={campaign.id}
                      campaign={campaign}
                      onLeft={(campaignId) =>
                        setProfile((prev) =>
                          prev
                            ? {
                                ...prev,
                                campaigns: prev.campaigns.filter((c) => c.id !== campaignId),
                              }
                            : prev,
                        )
                      }
                    />
                  ))
                )}
              </div>
            </section>
          </div>
        ) : null}
      </SettingsPageLayout>
    </PageContainer>
  );
}
