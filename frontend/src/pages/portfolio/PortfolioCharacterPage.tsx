import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Link,
  Navigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { ArrowLeft, Pencil, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageContainer } from '@/components/layout/PageContainer';
import { PortfolioNoArtMark } from '@/components/portfolio/PortfolioNoArtMark';
import {
  deletePortfolioMedia,
  endPortfolioAdventure,
  fetchPortfolioCharacter,
  setPortfolioFavorite,
  setPortfolioShowcased,
  updatePortfolioCharacter,
  uploadPortfolioMedia,
} from '@/lib/portfolio';
import type { PortfolioCharacter } from '@/types/portfolio';
import { ResponsiveSectionNav } from '@/components/settings/ResponsiveSectionNav';

type Tab = 'overview' | 'story' | 'adventures' | 'gallery';

function parseTab(value: string | null): Tab {
  if (value === 'story' || value === 'adventures' || value === 'gallery') return value;
  return 'overview';
}

function softLine(character: PortfolioCharacter): string {
  const ancestry =
    typeof character.metadata.ancestry === 'string' ? character.metadata.ancestry : null;
  const parts = [
    ancestry,
    character.roleLabel,
    character.levelLabel
      ? character.levelLabel.toLowerCase().startsWith('level')
        ? character.levelLabel
        : `Level ${character.levelLabel}`
      : null,
    typeof (character.metadata.appearance as { pronouns?: string } | undefined)?.pronouns ===
    'string'
      ? (character.metadata.appearance as { pronouns: string }).pronouns
      : null,
  ].filter(Boolean);
  return parts.join(' · ');
}

export function PortfolioCharacterPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseTab(searchParams.get('tab'));
  const editing = searchParams.get('edit') === '1';

  const [character, setCharacter] = useState<PortfolioCharacter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [draftName, setDraftName] = useState('');
  const [draftTagline, setDraftTagline] = useState('');
  const [draftRole, setDraftRole] = useState('');
  const [draftLevel, setDraftLevel] = useState('');
  const [draftBio, setDraftBio] = useState('');
  const [draftAncestry, setDraftAncestry] = useState('');
  const [draftPronouns, setDraftPronouns] = useState('');
  const [draftAppearanceSummary, setDraftAppearanceSummary] = useState('');
  const [draftMotivation, setDraftMotivation] = useState('');
  const [draftKnownFor, setDraftKnownFor] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const row = await fetchPortfolioCharacter(id);
      setCharacter(row);
      setDraftName(row.name);
      setDraftTagline(row.tagline ?? '');
      setDraftRole(row.roleLabel ?? '');
      setDraftLevel(row.levelLabel ?? '');
      setDraftBio(row.biography);
      setDraftAncestry(
        typeof row.metadata.ancestry === 'string' ? row.metadata.ancestry : '',
      );
      const appearance = row.metadata.appearance as
        | { pronouns?: string; summary?: string }
        | undefined;
      setDraftPronouns(appearance?.pronouns ?? '');
      setDraftAppearanceSummary(appearance?.summary ?? '');
      setDraftMotivation(
        typeof row.metadata.motivation === 'string' ? row.metadata.motivation : '',
      );
      setDraftKnownFor(
        typeof row.metadata.knownFor === 'string' ? row.metadata.knownFor : '',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load character.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void load();
  }, [isAuthenticated, load]);

  const currentAdventure = useMemo(
    () => character?.adventures.find((a) => a.status === 'CURRENT') ?? null,
    [character],
  );
  const pastAdventures = useMemo(
    () => character?.adventures.filter((a) => a.status !== 'CURRENT') ?? [],
    [character],
  );

  function setTab(next: Tab) {
    const params = new URLSearchParams(searchParams);
    if (next === 'overview') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params, { replace: true });
  }

  function setEditing(on: boolean) {
    const params = new URLSearchParams(searchParams);
    if (on) params.set('edit', '1');
    else params.delete('edit');
    setSearchParams(params, { replace: true });
  }

  async function save() {
    if (!character) return;
    setSaving(true);
    setError(null);
    try {
      const metadata = {
        ...character.metadata,
        ancestry: draftAncestry.trim() || null,
        motivation: draftMotivation.trim() || null,
        knownFor: draftKnownFor.trim() || null,
        appearance: {
          ...((character.metadata.appearance as object) ?? {}),
          pronouns: draftPronouns.trim() || null,
          summary: draftAppearanceSummary.trim() || null,
        },
      };
      const updated = await updatePortfolioCharacter(character.id, {
        name: draftName.trim() || character.name,
        tagline: draftTagline.trim() || null,
        roleLabel: draftRole.trim() || null,
        levelLabel: draftLevel.trim() || null,
        biography: draftBio,
        metadata,
      });
      setCharacter(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function onUpload(kind: 'PORTRAIT' | 'GALLERY', file: File) {
    if (!character) return;
    const updated = await uploadPortfolioMedia(character.id, file, kind);
    setCharacter(updated);
  }

  if (!authLoading && !isAuthenticated) return <Navigate to="/" replace />;
  if (authLoading || loading) return <LoadingSpinner label="Loading character…" />;
  if (!character) {
    return (
      <PageContainer>
        <p className="text-sm text-destructive">{error ?? 'Character not found.'}</p>
        <Link to="/characters" className="mt-4 text-sm text-muted hover:text-foreground">
          Back to portfolio
        </Link>
      </PageContainer>
    );
  }

  const appearance = character.metadata.appearance as
    | Record<string, unknown>
    | undefined;

  return (
    <PageContainer>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/characters"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Portfolio
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-sm hover:bg-elevated"
              onClick={() =>
                void setPortfolioFavorite(character.id, !character.isFavorite).then(setCharacter)
              }
            >
              <Star
                className={`size-3.5 ${character.isFavorite ? 'fill-current text-amber-500' : ''}`}
              />
              {character.isFavorite ? 'Favorited' : 'Favorite'}
            </button>
            <button
              type="button"
              className="rounded-md border border-border px-2.5 py-1.5 text-sm hover:bg-elevated"
              onClick={() =>
                void setPortfolioShowcased(character.id, !character.isShowcased).then(
                  setCharacter,
                )
              }
            >
              {character.isShowcased ? 'Showcased' : 'Showcase'}
            </button>
            {!editing ? (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-3.5" aria-hidden />
                Edit
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="rounded-md border border-border px-3 py-1.5 text-sm"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  onClick={() => void save()}
                >
                  Save
                </button>
              </>
            )}
          </div>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <header className="flex flex-col items-center gap-5 text-center">
          <h1 className="font-display text-4xl tracking-[0.12em] text-foreground sm:text-5xl">
            {editing ? (
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className="w-full max-w-lg border-b border-border bg-transparent text-center outline-none"
              />
            ) : (
              character.name
            )}
          </h1>

          <div className="w-full max-w-md overflow-hidden">
            {character.portraitUrl ? (
              <img
                src={character.portraitUrl}
                alt=""
                className="mx-auto max-h-96 w-full rounded-2xl object-cover object-top"
              />
            ) : (
              <PortfolioNoArtMark name={character.name} size="hero" />
            )}
          </div>

          {editing ? (
            <div className="grid w-full max-w-lg gap-2 text-left">
              <input
                value={draftTagline}
                onChange={(e) => setDraftTagline(e.target.value)}
                placeholder="Tagline"
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={draftRole}
                  onChange={(e) => setDraftRole(e.target.value)}
                  placeholder="Class / role"
                  className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
                />
                <input
                  value={draftLevel}
                  onChange={(e) => setDraftLevel(e.target.value)}
                  placeholder="Level"
                  className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
                />
              </div>
              <label className="text-sm text-muted">
                Portrait
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 block w-full text-sm"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void onUpload('PORTRAIT', file);
                  }}
                />
              </label>
            </div>
          ) : (
            <>
              {character.tagline ? (
                <p className="font-display text-lg italic text-foreground/85">
                  {character.tagline}
                </p>
              ) : null}
              {softLine(character) ? (
                <p className="text-sm text-muted">{softLine(character)}</p>
              ) : null}
              {currentAdventure ? (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  ● Currently adventuring
                  {currentAdventure.snapshot.campaignTitle
                    ? ` · ${currentAdventure.snapshot.campaignTitle}`
                    : ''}
                </p>
              ) : character.derivedFilter === 'UNASSIGNED' ? (
                <p className="text-sm text-muted">Looking for an adventure</p>
              ) : (
                <p className="text-sm text-muted">Between adventures</p>
              )}
            </>
          )}
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
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                About
              </h2>
              {editing ? (
                <textarea
                  value={draftBio}
                  onChange={(e) => setDraftBio(e.target.value)}
                  rows={8}
                  className="mt-3 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                />
              ) : (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {character.biography || 'No biography yet.'}
                </p>
              )}
            </div>
            <div className="grid gap-6">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Details
                </h2>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Species</dt>
                    <dd>
                      {editing ? (
                        <input
                          value={draftAncestry}
                          onChange={(e) => setDraftAncestry(e.target.value)}
                          className="rounded border border-border bg-surface px-2 py-1 text-right"
                        />
                      ) : (
                        (typeof character.metadata.ancestry === 'string' &&
                          character.metadata.ancestry) ||
                        '—'
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Class</dt>
                    <dd>{character.roleLabel || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Level</dt>
                    <dd>{character.levelLabel || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Known for</dt>
                    <dd>
                      {editing ? (
                        <input
                          value={draftKnownFor}
                          onChange={(e) => setDraftKnownFor(e.target.value)}
                          className="rounded border border-border bg-surface px-2 py-1 text-right"
                        />
                      ) : (
                        (typeof character.metadata.knownFor === 'string' &&
                          character.metadata.knownFor) ||
                        '—'
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Appearance
                </h2>
                {editing ? (
                  <div className="mt-3 grid gap-2">
                    <input
                      value={draftPronouns}
                      onChange={(e) => setDraftPronouns(e.target.value)}
                      placeholder="Pronouns"
                      className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
                    />
                    <textarea
                      value={draftAppearanceSummary}
                      onChange={(e) => setDraftAppearanceSummary(e.target.value)}
                      placeholder="Appearance summary"
                      rows={3}
                      className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
                    />
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-foreground/90">
                    {(typeof appearance?.summary === 'string' && appearance.summary) ||
                      'No appearance notes yet.'}
                  </p>
                )}
              </div>
            </div>

            {currentAdventure ? (
              <div className="md:col-span-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Current adventure
                </h2>
                <div className="mt-3 rounded-xl border border-border/60 bg-surface p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-lg tracking-wide">
                        {currentAdventure.snapshot.campaignTitle || 'Campaign'}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {[
                          currentAdventure.snapshot.roleLabel,
                          currentAdventure.snapshot.levelStart &&
                          currentAdventure.snapshot.levelEnd
                            ? `${currentAdventure.snapshot.levelStart} → ${currentAdventure.snapshot.levelEnd}`
                            : currentAdventure.snapshot.levelStart,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Active
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {currentAdventure.snapshot.campaignHandle ? (
                      <Link
                        to={`/campaigns/${currentAdventure.snapshot.campaignHandle}`}
                        className="text-sm text-primary hover:underline"
                      >
                        View →
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      className="text-sm text-muted hover:text-foreground"
                      onClick={() =>
                        void endPortfolioAdventure(currentAdventure.id).then(setCharacter)
                      }
                    >
                      Mark as past
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {tab === 'story' ? (
          <section className="grid gap-6">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Biography
              </h2>
              {editing ? (
                <textarea
                  value={draftBio}
                  onChange={(e) => setDraftBio(e.target.value)}
                  rows={12}
                  className="mt-3 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                />
              ) : (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                  {character.biography || 'No story written yet.'}
                </p>
              )}
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Motivation
              </h2>
              {editing ? (
                <textarea
                  value={draftMotivation}
                  onChange={(e) => setDraftMotivation(e.target.value)}
                  rows={4}
                  className="mt-3 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                />
              ) : (
                <p className="mt-3 text-sm">
                  {(typeof character.metadata.motivation === 'string' &&
                    character.metadata.motivation) ||
                    '—'}
                </p>
              )}
            </div>
          </section>
        ) : null}

        {tab === 'adventures' ? (
          <section className="grid gap-8">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Current
              </h2>
              {currentAdventure ? (
                <AdventureBlock
                  title={currentAdventure.snapshot.campaignTitle || 'Campaign'}
                  subtitle={[
                    currentAdventure.snapshot.roleLabel,
                    formatLevelRange(currentAdventure.snapshot),
                    currentAdventure.snapshot.sessionCount != null
                      ? `${currentAdventure.snapshot.sessionCount} sessions`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  dates={formatDateRange(
                    currentAdventure.snapshot.startedAt,
                    currentAdventure.snapshot.endedAt,
                  )}
                  badge="Active"
                />
              ) : (
                <p className="mt-3 text-sm text-muted">No current adventure.</p>
              )}
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Past
              </h2>
              {pastAdventures.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No past adventures yet.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {pastAdventures.map((a) => (
                    <AdventureBlock
                      key={a.id}
                      title={a.snapshot.campaignTitle || 'Past campaign'}
                      subtitle={[
                        a.snapshot.roleLabel,
                        formatLevelRange(a.snapshot),
                        a.snapshot.oneShot
                          ? 'One-shot'
                          : a.snapshot.sessionCount != null
                            ? `${a.snapshot.sessionCount} sessions`
                            : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                      dates={formatDateRange(a.snapshot.startedAt, a.snapshot.endedAt)}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : null}

        {tab === 'gallery' ? (
          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Gallery
              </h2>
              <label className="cursor-pointer text-sm text-primary hover:underline">
                Add image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void onUpload('GALLERY', file);
                  }}
                />
              </label>
            </div>
            {character.media.filter((m) => m.kind === 'GALLERY' || m.kind === 'PORTRAIT')
              .length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-border/70 px-6 py-12 text-center">
                <PortfolioNoArtMark name={character.name} size="showcase" />
                <p className="mt-4 text-sm text-muted">
                  No artwork yet — the character still reads complete without it.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {character.media.map((m) => (
                  <figure key={m.id} className="overflow-hidden rounded-lg border border-border/50">
                    <img src={m.thumbnailUrl || m.url} alt="" className="aspect-square w-full object-cover" />
                    <figcaption className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs text-muted">
                      <span className="truncate">{m.caption || m.kind}</span>
                      <button
                        type="button"
                        className="shrink-0 hover:text-destructive"
                        onClick={() =>
                          void deletePortfolioMedia(character.id, m.id).then(setCharacter)
                        }
                      >
                        Remove
                      </button>
                    </figcaption>
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

function formatLevelRange(snapshot: {
  levelStart: string | null;
  levelEnd: string | null;
}): string | null {
  if (snapshot.levelStart && snapshot.levelEnd && snapshot.levelStart !== snapshot.levelEnd) {
    return `Level ${snapshot.levelStart} → ${snapshot.levelEnd}`;
  }
  if (snapshot.levelStart) return `Level ${snapshot.levelStart}`;
  if (snapshot.levelEnd) return `Level ${snapshot.levelEnd}`;
  return null;
}

function formatDateRange(start: string | null, end: string | null): string | null {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  };
  const a = start ? fmt(start) : null;
  const b = end ? fmt(end) : null;
  if (a && b) return `${a} — ${b}`;
  if (a) return `${a} — Present`;
  return b;
}

function AdventureBlock(props: {
  title: string;
  subtitle: string;
  dates: string | null;
  badge?: string;
}) {
  return (
    <div className="mt-3 rounded-xl border border-border/60 bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg tracking-wide">{props.title}</p>
          {props.dates ? <p className="mt-0.5 text-sm text-muted">{props.dates}</p> : null}
          {props.subtitle ? <p className="mt-1 text-sm text-foreground/80">{props.subtitle}</p> : null}
        </div>
        {props.badge ? (
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            {props.badge}
          </span>
        ) : null}
      </div>
    </div>
  );
}
