import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, BookOpen, LayoutGrid, PenLine, User } from 'lucide-react';
import { campaignDashboardPath, resolveCampaignLinkHandle } from '@/lib/campaignPaths';
import { fetchPublicUserProfile } from '@/lib/user';
import { fetchOwnerCreatorAttribution, fetchPublicCreatorAttribution } from '@/lib/statsApi';
import { getGmStyleTagLabel } from '@/components/settings/GmStyleTagMultiSelect';
import type { PublicUserProfile } from '@/types/recruitment';
import type { CreatorAttributionResponse } from '@shared/statsTypes';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MascotErrorPanel } from '@/components/errors/MascotErrorPanel';
import { ProfileIdentityHeader } from '@/components/profile/ProfileIdentityHeader';
import {
  ProfileCreatorStatsOverview,
  ProfileWritingTab,
} from '@/components/profile/ProfileCreatorStats';
import { ResponsiveSectionNav } from '@/components/settings/ResponsiveSectionNav';
import { PageContainer, PagePanel } from '@/components/layout/PageContainer';
import { PageShell, SHOWCASE_MAX_WIDTH_CLASS } from '@/components/layout/PageShell';
import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useAuth } from '@/contexts/AuthContext';

type ProfileTab = 'overview' | 'campaigns' | 'writing';

function parseProfileTab(value: string | null): ProfileTab {
  if (value === 'campaigns' || value === 'writing') return value;
  return 'overview';
}

export function PublicUserProfilePage() {
  const { id = '' } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const { user: sessionUser } = useAuth();
  const activeTab = parseProfileTab(searchParams.get('tab'));
  const isSelf = sessionUser?.id === id;

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [attribution, setAttribution] = useState<CreatorAttributionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('Profile not found.');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const attributionPromise =
      sessionUser?.id === id
        ? fetchOwnerCreatorAttribution()
        : fetchPublicCreatorAttribution(id);

    Promise.all([
      fetchPublicUserProfile(id),
      attributionPromise.catch(() => null),
    ])
      .then(([profileData, attributionData]) => {
        if (!cancelled) {
          setProfile(profileData);
          setAttribution(attributionData);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load profile.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, sessionUser?.id]);

  const sections = useMemo(() => {
    const items = [
      { id: 'overview', label: t('profile.creatorstats.tabOverview'), icon: User },
      { id: 'campaigns', label: t('profile.creatorstats.tabCampaigns'), icon: LayoutGrid },
    ];
    if (isSelf) {
      items.push({ id: 'writing', label: t('profile.creatorstats.tabWriting'), icon: PenLine });
    }
    return items;
  }, [isSelf, t]);

  const switchTab = (tab: ProfileTab) => {
    setSearchParams(tab === 'overview' ? {} : { tab });
  };

  if (loading) {
    return <LoadingSpinner label="Loading profile…" />;
  }

  if (error || !profile) {
    return (
      <MascotErrorPanel
        code={404}
        title="Profile unavailable"
        description={error ?? 'This user could not be found.'}
      />
    );
  }

  const linkableCampaigns =
    attribution?.linkableCampaigns.length
      ? attribution.linkableCampaigns
      : profile.hostedCampaigns.map((campaign) => ({
          id: campaign.id,
          name: campaign.name,
          handle: campaign.handle,
          isLookingForGroup: campaign.isLookingForGroup,
        }));

  return (
    <PageContainer className="gap-10">
      <PageShell width="wide" className={`${SHOWCASE_MAX_WIDTH_CLASS} flex flex-col gap-10`}>
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Back to Recruitment Lobby
        </Link>

        <header className="space-y-4">
          <ProfileIdentityHeader
            displayName={profile.displayName}
            username={profile.username}
            userId={profile.id}
            avatarUrl={profile.avatarUrl}
            pronouns={profile.pronouns}
            statusBlurb={profile.statusBlurb}
            links={{
              bluesky: profile.bluesky,
              discord: profile.discord,
              github: profile.github,
              reddit: profile.reddit,
              mastodon: profile.mastodon,
              otherLink: profile.otherLink,
            }}
          />
          <p className="text-sm text-muted">@{profile.username}</p>
          {profile.gmStyleTags.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {profile.gmStyleTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                >
                  {getGmStyleTagLabel(tag)}
                </span>
              ))}
            </div>
          ) : null}

          <ResponsiveSectionNav
            sections={sections}
            activeId={activeTab}
            onChange={(tab) => switchTab(tab as ProfileTab)}
            ariaLabel={t('profile.creatorstats.sectionNavAria')}
            mobileLabel={t('profile.creatorstats.sectionNavMobile')}
          />
        </header>

        {activeTab === 'overview' ? (
          <>
            <ProfileCreatorStatsOverview
              attribution={attribution}
              displayName={profile.displayName ?? profile.username}
              isSelf={isSelf}
            />

            <PagePanel className="p-6">
              <h2 className={`mb-3 ${META_SECTION_LABEL_CLASS}`}>About Me</h2>
              {profile.publicBio?.trim() ? (
                <div className="prose prose-invert prose-sm max-w-3xl text-foreground">
                  <ReactMarkdown>{profile.publicBio}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-muted italic">
                  This host has not written a public bio yet.
                </p>
              )}
            </PagePanel>
          </>
        ) : null}

        {activeTab === 'campaigns' ? (
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <BookOpen className="size-5 text-primary" />
              {t('profile.creatorstats.tabCampaigns')}
              <span className="text-sm font-normal text-muted">({linkableCampaigns.length})</span>
            </h2>

            {linkableCampaigns.length === 0 ? (
              <p className="text-sm text-muted">No public campaigns are listed for this host.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {linkableCampaigns.map((campaign) => (
                  <Link
                    key={campaign.id}
                    to={campaignDashboardPath(resolveCampaignLinkHandle(campaign))}
                    className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40 hover:bg-elevated"
                  >
                    <p className="font-medium text-foreground">{campaign.name}</p>
                    <p className="mt-1 text-xs text-muted">/campaigns/{campaign.handle}</p>
                    {campaign.isLookingForGroup ? (
                      <span className="mt-2 inline-block rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        Recruiting
                      </span>
                    ) : null}
                  </Link>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {activeTab === 'writing' && isSelf ? (
          <PagePanel className="p-6">
            <ProfileWritingTab attribution={attribution} />
          </PagePanel>
        ) : null}
      </PageShell>
    </PageContainer>
  );
}
