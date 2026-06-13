import { ExternalLink, Map, ScrollText } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DowntimeHavenOverviewReference } from '@shared/downtimeHub';

interface HavenReferencesSectionProps {
  references: DowntimeHavenOverviewReference[];
  relatedPages: Array<{ pageId: string; label: string; href: string }>;
}

function ReferenceIcon({ ref }: { ref: DowntimeHavenOverviewReference }) {
  if (ref.opensIn === 'external') {
    return <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />;
  }
  if (ref.opensIn === 'maps' || ref.type === 'map' || ref.type === 'vtt_scene') {
    return <Map className="h-4 w-4 shrink-0 text-muted-foreground" />;
  }
  return <ScrollText className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

function ReferenceRow({ ref }: { ref: DowntimeHavenOverviewReference }) {
  const content = (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-elevated/10 p-3 transition-colors hover:border-primary/30 hover:bg-primary/5">
      {ref.previewImageUrl ? (
        <img
          src={ref.previewImageUrl}
          alt=""
          className="h-12 w-16 shrink-0 rounded object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-muted/40">
          <ReferenceIcon ref={ref} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{ref.title}</p>
        {ref.excerpt ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{ref.excerpt}</p>
        ) : null}
      </div>
    </div>
  );

  if (ref.opensIn === 'external') {
    return (
      <a href={ref.href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return <Link to={ref.href}>{content}</Link>;
}

export function HavenReferencesSection({
  references,
  relatedPages,
}: HavenReferencesSectionProps) {
  if (references.length === 0 && relatedPages.length === 0) return null;

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground">References</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Maps, rules, and resources tied to this haven — open in their home modules.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {references.map((ref) => (
          <ReferenceRow key={ref.id} ref={ref} />
        ))}
      </div>
      {relatedPages.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Related pages
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {relatedPages.map((page) => (
              <Link
                key={page.pageId}
                to={page.href}
                className="rounded-full border border-border px-3 py-1 text-sm text-foreground hover:border-primary/40"
              >
                {page.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
