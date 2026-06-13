import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { campaignDashboardPath, resolveCampaignLinkHandle } from '@/lib/campaignPaths';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { fetchPublicUserProfile } from '@/lib/user';
import { getGmStyleTagLabel } from '@/components/settings/GmStyleTagMultiSelect';
import type { PublicUserProfile } from '@/types/recruitment';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MascotErrorPanel } from '@/components/errors/MascotErrorPanel';
import { ProfileIdentityHeader } from '@/components/profile/ProfileIdentityHeader';
import { PageContainer, PagePanel } from '@/components/layout/PageContainer';
import { PageShell, SHOWCASE_MAX_WIDTH_CLASS } from '@/components/layout/PageShell';

export function PublicUserProfilePage() {
  const { id = '' } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
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

    fetchPublicUserProfile(id)
      .then((data) => {
        if (!cancelled) setProfile(data);
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
  }, [id]);

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

      <header className="space-y-2">
        <div className="min-w-0 flex-1 space-y-1">
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
            <div className="flex flex-wrap gap-2 pt-2">
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
        </div>
      </header>

      <PagePanel className="p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
          About Me
        </h2>
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

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <BookOpen className="size-5 text-primary" />
          Hosted worlds
          <span className="text-sm font-normal text-muted">
            ({profile.hostedCampaigns.length})
          </span>
        </h2>

        {profile.hostedCampaigns.length === 0 ? (
          <p className="text-sm text-muted">
            No public campaigns are listed for this host.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profile.hostedCampaigns.map((campaign) => (
              <Link
                key={campaign.id}
                to={campaignDashboardPath(resolveCampaignLinkHandle(campaign))}
                className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40 hover:bg-elevated"
              >
                <p className="font-medium text-foreground">{campaign.name}</p>
                <p className="mt-1 text-xs text-muted">/campaigns/{campaign.handle}</p>
                {campaign.isLookingForGroup && (
                  <span className="mt-2 inline-block rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Recruiting
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
      </PageShell>
    </PageContainer>
  );
}
