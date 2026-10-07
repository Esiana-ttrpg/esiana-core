import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageContainer } from '@/components/layout/PageContainer';
import { SettingsPageLayout } from '@/components/settings/SettingsPageLayout';
import { PortfolioNoArtMark } from '@/components/portfolio/PortfolioNoArtMark';
import {
  bulkPortfolioAction,
  listPortfolioCharacters,
  reorderPortfolioShowcase,
  setPortfolioShowcased,
} from '@/lib/portfolio';
import type { PortfolioCharacter } from '@/types/portfolio';

export function ManagePortfolioPage() {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [mode, setMode] = useState<'portfolio' | 'showcase'>('showcase');
  const [characters, setCharacters] = useState<PortfolioCharacter[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPortfolioCharacters({ includeArchived: true });
      setCharacters(data.characters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    void load();
  }, [isAuthenticated, load]);

  const showcased = characters
    .filter((c) => c.isShowcased)
    .sort((a, b) => (a.showcaseOrder ?? 0) - (b.showcaseOrder ?? 0));
  const available = characters.filter((c) => !c.isShowcased && !c.isArchived);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runBulk(
    action: 'favorite' | 'unfavorite' | 'archive' | 'unarchive' | 'showcase' | 'unshowcase',
  ) {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      await bulkPortfolioAction([...selected], action);
      setSelected(new Set());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk action failed.');
    } finally {
      setSaving(false);
    }
  }

  async function moveShowcase(id: string, direction: -1 | 1) {
    const ids = showcased.map((c) => c.id);
    const index = ids.indexOf(id);
    const swap = index + direction;
    if (index < 0 || swap < 0 || swap >= ids.length) return;
    const next = [...ids];
    const tmp = next[index]!;
    next[index] = next[swap]!;
    next[swap] = tmp;
    setSaving(true);
    try {
      await reorderPortfolioShowcase(next);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reorder failed.');
    } finally {
      setSaving(false);
    }
  }

  if (!authLoading && !isAuthenticated) return <Navigate to="/" replace />;
  if (authLoading || loading) return <LoadingSpinner label="Loading…" />;

  return (
    <PageContainer>
      <SettingsPageLayout className="flex flex-col gap-6">
        <div>
          <Link
            to="/characters"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Portfolio
          </Link>
          <h1 className="mt-3 font-display text-3xl tracking-wide">Manage Portfolio</h1>
          <p className="mt-1 text-sm text-muted">
            Bulk favorites, archive, and profile showcase order.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm ${mode === 'showcase' ? 'bg-elevated font-medium' : 'text-muted'}`}
            onClick={() => setMode('showcase')}
          >
            Manage Showcase
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm ${mode === 'portfolio' ? 'bg-elevated font-medium' : 'text-muted'}`}
            onClick={() => setMode('portfolio')}
          >
            Manage Portfolio
          </button>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {mode === 'showcase' ? (
          <div className="grid gap-8 lg:grid-cols-2">
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Profile Showcase
              </h2>
              <p className="mt-1 text-sm text-muted">
                Shown on your public profile. Order is top to bottom.
              </p>
              {showcased.length === 0 ? (
                <p className="mt-4 text-sm text-muted">No characters showcased yet.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {showcased.map((c, index) => (
                    <li
                      key={c.id}
                      className="flex items-center gap-3 rounded-lg border border-border/60 bg-surface px-3 py-2"
                    >
                      <div className="size-10 shrink-0 overflow-hidden rounded-md bg-elevated">
                        {c.portraitUrl ? (
                          <img src={c.portraitUrl} alt="" className="size-full object-cover" />
                        ) : (
                          <PortfolioNoArtMark name={c.name} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{c.name}</p>
                        <p className="text-xs text-muted">Shown</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={saving || index === 0}
                          className="rounded p-1 hover:bg-elevated disabled:opacity-30"
                          onClick={() => void moveShowcase(c.id, -1)}
                          aria-label="Move up"
                        >
                          <ArrowUp className="size-4" />
                        </button>
                        <button
                          type="button"
                          disabled={saving || index === showcased.length - 1}
                          className="rounded p-1 hover:bg-elevated disabled:opacity-30"
                          onClick={() => void moveShowcase(c.id, 1)}
                          aria-label="Move down"
                        >
                          <ArrowDown className="size-4" />
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          className="ml-1 text-xs text-muted hover:text-foreground"
                          onClick={() =>
                            void setPortfolioShowcased(c.id, false).then(() => load())
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {user ? (
                <Link
                  to={`/users/${user.id}`}
                  className="mt-4 inline-block text-sm text-primary hover:underline"
                >
                  View public profile →
                </Link>
              ) : null}
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Add character
              </h2>
              <ul className="mt-4 space-y-2">
                {available.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/40 px-3 py-2"
                  >
                    <span className="truncate text-sm">{c.name}</span>
                    <button
                      type="button"
                      disabled={saving}
                      className="shrink-0 text-sm text-primary hover:underline"
                      onClick={() =>
                        void setPortfolioShowcased(c.id, true).then(() => load())
                      }
                    >
                      Showcase
                    </button>
                  </li>
                ))}
                {available.length === 0 ? (
                  <li className="text-sm text-muted">All characters are showcased or archived.</li>
                ) : null}
              </ul>
            </section>
          </div>
        ) : (
          <section>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving || selected.size === 0}
                className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40"
                onClick={() => void runBulk('favorite')}
              >
                Favorite
              </button>
              <button
                type="button"
                disabled={saving || selected.size === 0}
                className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40"
                onClick={() => void runBulk('unfavorite')}
              >
                Unfavorite
              </button>
              <button
                type="button"
                disabled={saving || selected.size === 0}
                className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40"
                onClick={() => void runBulk('showcase')}
              >
                Showcase
              </button>
              <button
                type="button"
                disabled={saving || selected.size === 0}
                className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40"
                onClick={() => void runBulk('archive')}
              >
                Archive
              </button>
              <button
                type="button"
                disabled={saving || selected.size === 0}
                className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40"
                onClick={() => void runBulk('unarchive')}
              >
                Unarchive
              </button>
            </div>
            <ul className="mt-4 divide-y divide-border/50 rounded-xl border border-border/60">
              {characters.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleSelected(c.id)}
                    aria-label={`Select ${c.name}`}
                  />
                  <div className="size-8 shrink-0 overflow-hidden rounded bg-elevated">
                    {c.portraitUrl ? (
                      <img src={c.portraitUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <PortfolioNoArtMark name={c.name} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted">
                      {c.derivedFilter.toLowerCase()}
                      {c.isFavorite ? ' · favorite' : ''}
                      {c.isShowcased ? ' · showcased' : ''}
                      {c.isArchived ? ' · archived' : ''}
                    </p>
                  </div>
                  <Link
                    to={`/characters/${c.id}`}
                    className="text-xs text-muted hover:text-foreground"
                  >
                    View
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </SettingsPageLayout>
    </PageContainer>
  );
}
