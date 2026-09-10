import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMemo, useState, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { readCampaignHandle, campaignFreeformPagePath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import { CampaignWorkspace } from '@shared/campaignWorkspace';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CreateVisibilityField } from '@/components/create/CreateVisibilityField';
import {
  DEFAULT_CREATE_VISIBILITY,
  type WikiPageVisibility,
} from '@/lib/createEntityConfig';
import { createWikiPage } from '@/lib/wiki';
import { CampaignCapabilities } from '@shared/campaignPolicy/capabilities';
import { WORKSPACE_CREATE_BUTTON_CLASS } from '@/components/layout/WorkspaceActionBar';

export function FreeformPagesIndex() {
  const params = useParams<{ campaignHandle?: string }>();
  const campaignHandle = readCampaignHandle(params);
  const navigate = useNavigate();
  const { flatPages, loading, refresh, can } = useWiki();
  const canCreate = can(CampaignCapabilities.PAGE_CREATE);

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState<WikiPageVisibility>(DEFAULT_CREATE_VISIBILITY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const freeformPages = useMemo(
    () =>
      flatPages
        .filter((page) => page.workspace === CampaignWorkspace.PAGES && page.pathKey)
        .sort((a, b) => a.title.localeCompare(b.title)),
    [flatPages],
  );

  if (loading) {
    return <LoadingSpinner label="Loading pages…" />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const finalTitle = title.trim();
    if (!finalTitle) {
      setError('Name is required.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const page = await createWikiPage(campaignHandle, {
        title: finalTitle,
        parentId: null,
        visibility,
      });
      await refresh();
      setCreateOpen(false);
      setTitle('');
      setVisibility(DEFAULT_CREATE_VISIBILITY);
      if (page.pathKey) {
        navigate(campaignFreeformPagePath(campaignHandle, page.pathKey));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create page.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-2 text-2xl font-semibold text-foreground">Pages</h1>
          <p className="text-sm text-muted-foreground">
            Freeform lore and notes — uncategorized campaign documents.
          </p>
        </div>
        {canCreate ? (
          <button
            type="button"
            className={WORKSPACE_CREATE_BUTTON_CLASS}
            onClick={() => {
              setCreateOpen(true);
              setError(null);
            }}
          >
            <Plus className="size-4" aria-hidden />
            New page
          </button>
        ) : null}
      </div>
      {freeformPages.length === 0 ? (
        <p className="text-sm text-muted-foreground">No freeform pages yet.</p>
      ) : (
        <ul className="space-y-2">
          {freeformPages.map((page) => (
            <li key={page.id}>
              <Link
                to={campaignFreeformPagePath(campaignHandle, page.pathKey!)}
                className="text-primary hover:underline"
              >
                {page.title}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="w-full max-w-md rounded-xl border border-border bg-background p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">New page</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded p-1 text-muted hover:bg-surface hover:text-foreground"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
            <label className="mb-4 block">
              <span className="mb-1 block text-xs text-muted">Name</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/60"
                autoFocus
              />
            </label>
            <CreateVisibilityField value={visibility} onChange={setVisibility} disabled={submitting} />
            {error ? (
              <p className="mt-3 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {submitting ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
