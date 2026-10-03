import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Settings2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageContainer } from '@/components/layout/PageContainer';
import { SettingsPageLayout } from '@/components/settings/SettingsPageLayout';
import {
  PortfolioCharacterCard,
  type PortfolioCardAction,
} from '@/components/portfolio/PortfolioCharacterCard';
import {
  createPortfolioCharacter,
  deletePortfolioCharacter,
  duplicatePortfolioCharacter,
  exportPortfolioCharacter,
  listPortfolioCharacters,
  setPortfolioArchived,
  setPortfolioFavorite,
  setPortfolioShowcased,
} from '@/lib/portfolio';
import type { PortfolioCharacter, PortfolioListCounts } from '@/types/portfolio';
import { fetchUserHub } from '@/lib/hub';
import { addPortfolioToCampaign } from '@/lib/portfolio';

type FilterKey = 'all' | 'active' | 'past' | 'unassigned';

export function CharacterPortfolioPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = (searchParams.get('filter') as FilterKey | null) ?? 'all';
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [characters, setCharacters] = useState<PortfolioCharacter[]>([]);
  const [counts, setCounts] = useState<PortfolioListCounts>({
    all: 0,
    active: 0,
    past: 0,
    unassigned: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [campaignPicker, setCampaignPicker] = useState<PortfolioCharacter | null>(null);
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string; handle: string }>>(
    [],
  );

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 200);
    return () => window.clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPortfolioCharacters({
        filter: filter === 'all' ? undefined : filter,
        q: debouncedQ || undefined,
      });
      setCharacters(data.characters);
      setCounts(data.counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolio.');
    } finally {
      setLoading(false);
    }
  }, [filter, debouncedQ]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void load();
  }, [isAuthenticated, load]);

  const chips = useMemo(
    () =>
      [
        { key: 'all' as const, label: 'All', count: counts.all },
        { key: 'active' as const, label: 'Active', count: counts.active },
        { key: 'unassigned' as const, label: 'Unassigned', count: counts.unassigned },
        { key: 'past' as const, label: 'Past', count: counts.past },
      ] as const,
    [counts],
  );

  function setFilter(next: FilterKey) {
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('filter');
    else params.set('filter', next);
    setSearchParams(params, { replace: true });
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const created = await createPortfolioCharacter({ name: 'New Character' });
      navigate(`/characters/${created.id}?edit=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create character.');
    } finally {
      setCreating(false);
    }
  }

  async function handleAction(action: PortfolioCardAction, character: PortfolioCharacter) {
    try {
      if (action === 'view') {
        navigate(`/characters/${character.id}`);
        return;
      }
      if (action === 'edit') {
        navigate(`/characters/${character.id}?edit=1`);
        return;
      }
      if (action === 'favorite') {
        await setPortfolioFavorite(character.id, !character.isFavorite);
        await load();
        return;
      }
      if (action === 'showcase') {
        await setPortfolioShowcased(character.id, !character.isShowcased);
        await load();
        return;
      }
      if (action === 'archive') {
        await setPortfolioArchived(character.id, !character.isArchived);
        await load();
        return;
      }
      if (action === 'duplicate') {
        const copy = await duplicatePortfolioCharacter(character.id, true);
        navigate(`/characters/${copy.id}`);
        return;
      }
      if (action === 'export') {
        const payload = await exportPortfolioCharacter(character.id);
        const blob = new Blob([JSON.stringify(payload, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${character.name.replace(/\s+/g, '-').toLowerCase() || 'character'}.json`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      if (action === 'delete') {
        if (!window.confirm(`Delete ${character.name}? This cannot be undone.`)) return;
        await deletePortfolioCharacter(character.id);
        await load();
        return;
      }
      if (action === 'add-to-campaign') {
        const hub = await fetchUserHub();
        setCampaigns(
          hub.campaigns.map((c) => ({
            id: c.id,
            name: c.name,
            handle: c.handle,
          })),
        );
        setCampaignPicker(character);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    }
  }

  async function confirmAddToCampaign(campaignId: string) {
    if (!campaignPicker) return;
    try {
      const result = await addPortfolioToCampaign(campaignPicker.id, campaignId);
      setCampaignPicker(null);
      const campaign = campaigns.find((c) => c.id === campaignId);
      if (campaign) {
        navigate(
          `/campaigns/${campaign.handle}/characters/${result.campaignCharacterPageId}`,
        );
      } else {
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add to campaign.');
    }
  }

  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (authLoading) {
    return <LoadingSpinner label="Loading portfolio…" />;
  }

  return (
    <PageContainer>
      <SettingsPageLayout className="flex flex-col gap-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl tracking-wide text-foreground">
              Character Portfolio
            </h1>
            <p className="mt-1 text-sm text-muted">Your characters, across every story.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/characters/manage"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-elevated"
            >
              <Settings2 className="size-4" aria-hidden />
              Manage
            </Link>
            <button
              type="button"
              disabled={creating}
              onClick={() => void handleCreate()}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Plus className="size-4" aria-hidden />
              New Character
            </button>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1 rounded-lg border border-border/60 bg-surface p-1">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFilter(chip.key)}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  filter === chip.key
                    ? 'bg-elevated font-medium text-foreground'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {chip.label} {chip.count}
              </button>
            ))}
          </div>
          <label className="relative ml-auto min-w-[12rem] flex-1 sm:max-w-xs">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                const params = new URLSearchParams(searchParams);
                if (e.target.value.trim()) params.set('q', e.target.value.trim());
                else params.delete('q');
                setSearchParams(params, { replace: true });
              }}
              placeholder="Search"
              className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-ring"
            />
          </label>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {loading ? (
          <LoadingSpinner label="Loading characters…" />
        ) : characters.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-surface/50 px-6 py-16 text-center">
            <p className="font-display text-xl text-foreground">No characters yet</p>
            <p className="mt-2 text-sm text-muted">
              Create a portfolio character to carry across every campaign.
            </p>
            <button
              type="button"
              onClick={() => void handleCreate()}
              className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              <Plus className="size-4" aria-hidden />
              New Character
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {characters.map((character) => (
              <PortfolioCharacterCard
                key={character.id}
                character={character}
                onAction={(action, c) => void handleAction(action, c)}
              />
            ))}
          </div>
        )}
      </SettingsPageLayout>

      {campaignPicker ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl">
            <h2 className="font-display text-lg text-foreground">
              Add {campaignPicker.name} to a campaign
            </h2>
            <p className="mt-1 text-sm text-muted">
              Creates an independent campaign character linked by provenance.
            </p>
            <ul className="mt-4 max-h-64 space-y-1 overflow-auto">
              {campaigns.length === 0 ? (
                <li className="text-sm text-muted">No campaigns available.</li>
              ) : (
                campaigns.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-elevated"
                      onClick={() => void confirmAddToCampaign(c.id)}
                    >
                      {c.name}
                    </button>
                  </li>
                ))
              )}
            </ul>
            <button
              type="button"
              className="mt-4 text-sm text-muted hover:text-foreground"
              onClick={() => setCampaignPicker(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </PageContainer>
  );
}
