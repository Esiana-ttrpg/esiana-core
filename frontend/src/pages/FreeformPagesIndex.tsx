import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { readCampaignHandle, campaignFreeformPagePath } from '@/lib/campaignPaths';
import { useParams } from 'react-router-dom';
import { useWiki } from '@/contexts/WikiContext';
import { CampaignWorkspace } from '@shared/campaignWorkspace';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function FreeformPagesIndex() {
  const params = useParams<{ campaignHandle?: string }>();
  const campaignHandle = readCampaignHandle(params);
  const { flatPages, loading } = useWiki();

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-semibold text-foreground">Pages</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Freeform lore and notes — uncategorized campaign documents.
      </p>
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
    </div>
  );
}
