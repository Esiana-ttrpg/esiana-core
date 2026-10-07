import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageContainer } from '@/components/layout/PageContainer';
import { PortfolioNoArtMark } from '@/components/portfolio/PortfolioNoArtMark';
import { fetchPublicPortfolioCharacter } from '@/lib/portfolio';
import type { PublicPortfolioCharacterPage } from '@/types/portfolio';
import { ResponsiveSectionNav } from '@/components/settings/ResponsiveSectionNav';

type Tab = 'overview' | 'story' | 'adventures' | 'gallery';

export function PublicPortfolioCharacterPage() {
  const { id: userId = '', characterId = '' } = useParams<{
    id: string;
    characterId: string;
  }>();
  const [data, setData] = useState<PublicPortfolioCharacterPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    if (!userId || !characterId) return;
    let cancelled = false;
    setLoading(true);
    void fetchPublicPortfolioCharacter(userId, characterId)
      .then((page) => {
        if (!cancelled) setData(page);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Character not found.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, characterId]);

  if (loading) return <LoadingSpinner label="Loading character…" />;
  if (!data?.character) {
    return (
      <PageContainer>
        <p className="text-sm text-destructive">{error ?? 'Character not found.'}</p>
        <Link to={`/users/${userId}`} className="mt-4 text-sm text-muted hover:text-foreground">
          Back to profile
        </Link>
      </PageContainer>
    );
  }

  if (!data.public) {
    return <Navigate to={`/characters/${characterId}`} replace />;
  }

  const c = data.character;
  const soft = [c.ancestry, c.roleLabel, c.levelLabel, c.pronouns].filter(Boolean).join(' · ');
  const current = data.adventures.find((a) => a.status === 'CURRENT');
  const past = data.adventures.filter((a) => a.status !== 'CURRENT');

  return (
    <PageContainer>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <Link
          to={`/users/${userId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Profile
        </Link>

        <header className="flex flex-col items-center gap-5 text-center">
          <h1 className="font-display text-4xl tracking-[0.12em] sm:text-5xl">{c.name}</h1>
          <div className="w-full max-w-md">
            {c.portraitUrl ? (
              <img
                src={c.portraitUrl}
                alt=""
                className="mx-auto max-h-96 w-full rounded-2xl object-cover object-top"
              />
            ) : (
              <PortfolioNoArtMark name={c.name} size="hero" />
            )}
          </div>
          {c.tagline ? (
            <p className="font-display text-lg italic text-foreground/85">{c.tagline}</p>
          ) : null}
          {soft ? <p className="text-sm text-muted">{soft}</p> : null}
          {c.adventureBlurb?.currentlyAdventuring ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              ●{' '}
              {c.adventureBlurb.campaignTitle
                ? `Currently adventuring · ${c.adventureBlurb.campaignTitle}`
                : c.adventureBlurb.genericLabel ?? 'Currently adventuring'}
            </p>
          ) : null}
        </header>

        <ResponsiveSectionNav
          ariaLabel="Character sections"
          sections={[
            { id: 'overview', label: 'Overview' },
            { id: 'story', label: 'Story' },
            { id: 'adventures', label: 'Adventures' },
            { id: 'gallery', label: 'Gallery' },
          ]}
          activeId={tab}
          onChange={(id) => setTab(id as Tab)}
        />

        {tab === 'overview' ? (
          <section className="grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">About</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                {data.biography || c.biographyExcerpt || '—'}
              </p>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Details</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Species</dt>
                  <dd>{c.ancestry || '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Class</dt>
                  <dd>{c.roleLabel || '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Level</dt>
                  <dd>{c.levelLabel || '—'}</dd>
                </div>
              </dl>
              {c.appearanceSummary ? (
                <div className="mt-6">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Appearance
                  </h2>
                  <p className="mt-3 text-sm">{c.appearanceSummary}</p>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {tab === 'story' ? (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Biography</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
              {data.biography || '—'}
            </p>
          </section>
        ) : null}

        {tab === 'adventures' ? (
          <section className="grid gap-8">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Current</h2>
              {current ? (
                <div className="mt-3 rounded-xl border border-border/60 bg-surface p-4">
                  <p className="font-display text-lg">
                    {current.campaignTitle ?? current.genericLabel ?? 'Currently adventuring'}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {[current.roleLabel, current.levelStart && current.levelEnd
                      ? `${current.levelStart} → ${current.levelEnd}`
                      : current.levelStart]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted">No current adventure.</p>
              )}
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Past</h2>
              {past.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No past adventures listed.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {past.map((a) => (
                    <li key={a.id} className="rounded-xl border border-border/60 bg-surface p-4">
                      <p className="font-display text-lg">
                        {a.campaignTitle ?? a.genericLabel ?? 'Past adventure'}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {[a.roleLabel, a.oneShot ? 'One-shot' : null].filter(Boolean).join(' · ')}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ) : null}

        {tab === 'gallery' ? (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Gallery</h2>
            {data.media.length === 0 ? (
              <div className="mt-6 flex flex-col items-center gap-4 rounded-xl border border-dashed border-border/70 px-6 py-12">
                <PortfolioNoArtMark name={c.name} size="showcase" />
                <p className="text-sm text-muted">No artwork shared for this character.</p>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {data.media.map((m) => (
                  <figure key={m.id} className="overflow-hidden rounded-lg border border-border/50">
                    <img
                      src={m.thumbnailUrl || m.url}
                      alt={m.caption ?? ''}
                      className="aspect-square w-full object-cover"
                    />
                    {m.caption ? (
                      <figcaption className="px-2 py-1.5 text-xs text-muted">{m.caption}</figcaption>
                    ) : null}
                  </figure>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </PageContainer>
  );
}
