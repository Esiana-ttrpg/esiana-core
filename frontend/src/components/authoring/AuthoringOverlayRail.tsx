import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { Link } from 'react-router-dom';
import type { AuthoringContext } from '@shared/authoringContext';
import { getAuthoringOverlay } from '@/components/authoring/overlayRegistry';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';

interface AuthoringOverlayRailProps {
  campaignHandle: string;
  context: AuthoringContext;
}

export function AuthoringOverlayRail({ campaignHandle, context }: AuthoringOverlayRailProps) {
  const { flatPages } = useWiki();
  const overlayIds = context.overlayIds ?? [];

  if (overlayIds.length === 0 && !context.anchorEntityIds?.length) {
    return null;
  }

  const anchorPages = (context.anchorEntityIds ?? [])
    .map((id) => flatPages.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p != null);

  return (
    <aside className="space-y-4 rounded border border-border bg-muted/20 p-4 lg:min-w-[240px] lg:max-w-xs">
      <header>
        <h2 className="META_SECTION_LABEL_CLASS-foreground">
          Structured overlays
        </h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Contextual authoring — not shown on freeform wiki pages by default.
        </p>
      </header>

      {anchorPages.length > 0 ? (
        <section className="space-y-1">
          <h3 className="text-[11px] font-medium text-muted-foreground">Anchored pages</h3>
          <ul className="space-y-0.5">
            {anchorPages.map((page) => (
              <li key={page.id}>
                <Link
                  to={campaignWikiPath(campaignHandle, page.id, flatPages)}
                  className="text-sm text-primary hover:underline"
                >
                  {page.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {overlayIds.length > 0 ? (
        <section className="space-y-2">
          {overlayIds.map((id) => {
            const overlay = getAuthoringOverlay(id);
            if (!overlay) return null;
            return (
              <div key={id} className="rounded border border-border/60 bg-background/40 p-2">
                <p className="text-xs font-medium text-foreground">{overlay.label}</p>
                <p className="text-[11px] text-muted-foreground">{overlay.description}</p>
              </div>
            );
          })}
        </section>
      ) : null}
    </aside>
  );
}
