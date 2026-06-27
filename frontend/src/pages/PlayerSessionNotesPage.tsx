import { META_SECTION_LABEL_CLASS, TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Eye, User, X } from 'lucide-react';
import { fetchPlayerSessionSummary } from '@/lib/wiki';
import { WikiMarkdown } from '@/components/wiki/WikiMarkdown';
import { useWiki } from '@/contexts/WikiContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { WikiPlayerEntry } from '@/types/wiki';

interface PlayerCardItem extends WikiPlayerEntry {
  hasNotes: boolean;
}

export function PlayerSessionNotesPage() {
  const { campaignHandle = '', playerId = '' } = useParams<{
    campaignHandle: string;
    playerId: string;
  }>();
  const navigate = useNavigate();
  const { players, canManageWiki } = useWiki();
  const [markdown, setMarkdown] = useState('');
  const [playerLabel, setPlayerLabel] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState(playerId);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [composerDraft, setComposerDraft] = useState('');
  const [playerHasNotes, setPlayerHasNotes] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchPlayerSessionSummary(campaignHandle, selectedPlayerId || playerId)
      .then((data) => {
        setPlayerLabel(data.player.label);
        setMarkdown(data.compiledMarkdown);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load notes'),
      )
      .finally(() => setLoading(false));
  }, [campaignHandle, playerId, selectedPlayerId]);

  useEffect(() => {
    if (!isDrawerOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsDrawerOpen(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDrawerOpen]);

  useEffect(() => {
    if (!campaignHandle || players.length === 0) return;

    let cancelled = false;

    void Promise.all(
      players.map(async (player) => {
        try {
          const summary = await fetchPlayerSessionSummary(campaignHandle, player.id);
          const hasNotes =
            summary.sandboxNoteCount > 0 ||
            summary.wikiPageCount > 0 ||
            summary.compiledMarkdown.trim() !== '_No session notes recorded yet._';
          return [player.id, hasNotes] as const;
        } catch {
          return [player.id, false] as const;
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      setPlayerHasNotes(Object.fromEntries(entries));
    });

    return () => {
      cancelled = true;
    };
  }, [campaignHandle, players]);

  const playerCards = useMemo<PlayerCardItem[]>(() => {
    if (players.length > 0) {
      return players.map((player) => ({
        ...player,
        hasNotes: playerHasNotes[player.id] ?? false,
      }));
    }
    return [
      {
        id: playerId,
        label: playerLabel || 'Current Player',
        role: 'Player',
        hasNotes: (markdown?.trim().length ?? 0) > 0,
      },
    ];
  }, [players, playerId, playerLabel, playerHasNotes, markdown]);

  if (!canManageWiki) {
    return (
      <p className="text-sm text-muted">
        Player session summaries are available to game masters and writers only.
      </p>
    );
  }

  if (loading) {
    return <LoadingSpinner label="Loading player notes…" />;
  }

  if (error) {
    return <p className="text-red-300">{error}</p>;
  }

  return (
    <>
      <article className="space-y-6">
        <header className="border-b border-border pb-4">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <User className="size-7 text-primary" />
            {playerLabel}
          </h1>
          <p className="mt-2 text-sm text-muted">Player session notes summary</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-3 text-sm text-primary hover:underline"
          >
            Back
          </button>
        </header>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <section className="space-y-3 xl:col-span-4">
            <h2 className={META_SECTION_LABEL_CLASS}>
              Writing Canvas
            </h2>
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <textarea
                value={composerDraft}
                onChange={(event) => setComposerDraft(event.target.value)}
                placeholder="Draft your session note composition here…"
                className="min-h-[320px] w-full resize-y rounded-lg border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
          </section>

          <aside className="xl:col-span-1">
            <h2 className="mb-3 META_SECTION_LABEL_CLASS">
              Party Perspectives
            </h2>
            <div className="flex flex-col gap-2">
              {playerCards.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  disabled={!player.hasNotes}
                  onClick={() => {
                    if (!player.hasNotes) return;
                    setSelectedPlayerId(player.id);
                    setIsDrawerOpen(true);
                  }}
                  className={`flex items-center justify-between rounded-lg border p-3 transition-all ${
                    player.hasNotes
                      ? 'cursor-pointer border-border bg-surface hover:border-indigo-500'
                      : 'pointer-events-none cursor-not-allowed border-border bg-background/40 opacity-40'
                  }`}
                >
                  <span className="truncate text-left text-sm text-foreground">{player.label}</span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[11px] text-foreground">
                    {player.hasNotes ? (
                      <>
                        <Eye className="size-3.5" />
                        Read
                      </>
                    ) : (
                      'No Notes Logged'
                    )}
                  </span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </article>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close notes drawer"
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-black/60"
          />
          <aside className="fixed inset-y-0 right-0 w-full max-w-xl border-l border-border bg-background p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <h3 className={TYPE_DISPLAY_CLASS}>
                {playerLabel}
              </h3>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="rounded-md border border-border p-1.5 text-foreground hover:border-border hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="prose prose-invert max-w-none select-text">
              <div className="max-h-[calc(100vh-7rem)] overflow-y-auto pr-1">
                <WikiMarkdown content={markdown} />
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
