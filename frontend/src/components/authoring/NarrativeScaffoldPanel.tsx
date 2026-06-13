import { useState } from 'react';
import { Link } from 'react-router-dom';
import { NARRATIVE_SCAFFOLDS, type NarrativeScaffoldId } from '@shared/narrativeScaffolds';
import { campaignProgressionPath } from '@/lib/campaignPaths';
import { progressionSectionHref } from '@/lib/progressionLayout';
import { createWorkshopDraft } from '@/lib/workshopDrafts';

interface NarrativeScaffoldPanelProps {
  campaignHandle: string;
  onScaffoldCreated?: (draftIds: string[], scaffoldId: NarrativeScaffoldId) => void;
}

export function NarrativeScaffoldPanel({
  campaignHandle,
  onScaffoldCreated,
}: NarrativeScaffoldPanelProps) {
  const [busy, setBusy] = useState<NarrativeScaffoldId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<Array<{ id: string; title: string }>>([]);

  async function applyScaffold(scaffoldId: NarrativeScaffoldId) {
    const scaffold = NARRATIVE_SCAFFOLDS.find((s) => s.id === scaffoldId);
    if (!scaffold) return;

    setBusy(scaffoldId);
    setError(null);
    const created: Array<{ id: string; title: string }> = [];

    try {
      for (const seed of scaffold.pages) {
        const draft = await createWorkshopDraft(campaignHandle, {
          title: seed.title,
          bodyMarkdown: seed.bodyMarkdown ?? '',
          sourceKind: 'narrative_workspace',
        });
        created.push({ id: draft.id, title: draft.title });
      }

      setLastCreated(created);
      onScaffoldCreated?.(
        created.map((p) => p.id),
        scaffoldId,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create draft from scaffold');
    } finally {
      setBusy(null);
    }
  }

  const workshopBase = campaignProgressionPath(campaignHandle);

  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-sm font-semibold text-foreground">Narrative scaffolds</h2>
        <p className="text-xs text-muted-foreground">
          Genre starters as Workshop drafts.
        </p>
      </header>
      <ul className="space-y-2">
        {NARRATIVE_SCAFFOLDS.map((scaffold) => (
          <li
            key={scaffold.id}
            className="flex flex-wrap items-start justify-between gap-2 rounded border border-border p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{scaffold.label}</p>
              <p className="text-xs text-muted-foreground">{scaffold.description}</p>
            </div>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void applyScaffold(scaffold.id)}
              className="shrink-0 rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy === scaffold.id ? 'Creating…' : 'Start draft'}
            </button>
          </li>
        ))}
      </ul>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {lastCreated.length > 0 ? (
        <div className="rounded border border-dashed border-border p-3 text-sm">
          <p className="mb-2 font-medium text-foreground">Created drafts</p>
          <ul className="space-y-1">
            {lastCreated.map((draft) => (
              <li key={draft.id}>
                <Link
                  to={`${progressionSectionHref(workshopBase, 'workshop')}&draft=${draft.id}`}
                  className="text-primary hover:underline"
                >
                  {draft.title}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            to={progressionSectionHref(workshopBase, 'workshop')}
            className="mt-2 inline-block text-xs text-primary hover:underline"
          >
            Open in Workshop
          </Link>
        </div>
      ) : null}
    </section>
  );
}
