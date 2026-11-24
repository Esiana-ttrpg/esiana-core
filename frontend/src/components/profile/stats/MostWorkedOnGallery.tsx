import { Link } from 'react-router-dom';
import type {
  CartographyThumbnail,
  WritingVisualizations,
} from '@shared/statsTypes';
import { FOCAL_ELEVATED_CLASS, TYPE_META_CLASS } from '@/lib/surfaceLayout';
import { StatsEmptyState } from './StatsChartFrame';

type WorkedItem = {
  id: string;
  title: string;
  href: string;
  thumbnailUrl: string | null;
  contributions: number;
  kind: 'page' | 'map';
};

function pagesFromVisualizations(
  visualizations: WritingVisualizations | null | undefined,
): WorkedItem[] {
  const ranked = visualizations?.mostWorkedDocuments ?? [];
  if (ranked.length > 0) {
    return ranked.map((doc) => ({
      id: doc.id,
      title: doc.title,
      href: doc.href,
      thumbnailUrl: doc.thumbnailUrl ?? null,
      contributions: doc.contributions,
      kind: 'page' as const,
    }));
  }

  // Fallback for older payloads that only attached documents on sessions.
  const pageCounts = new Map<string, WorkedItem>();
  for (const session of visualizations?.sessions ?? []) {
    for (const doc of session.documents) {
      const existing = pageCounts.get(doc.id);
      if (existing) {
        existing.contributions += 1;
      } else {
        pageCounts.set(doc.id, {
          id: doc.id,
          title: doc.title,
          href: doc.href,
          thumbnailUrl: doc.thumbnailUrl ?? null,
          contributions: 1,
          kind: 'page',
        });
      }
    }
  }
  return [...pageCounts.values()];
}

export function MostWorkedOnGallery({
  visualizations,
  mapThumbnails,
  t,
}: {
  visualizations: WritingVisualizations | null | undefined;
  mapThumbnails: CartographyThumbnail[];
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const pages = pagesFromVisualizations(visualizations);

  const maps: WorkedItem[] = mapThumbnails.map((thumb) => ({
    id: thumb.id,
    title: thumb.label || t('profile.creatorstats.cartographyFallback'),
    href: thumb.href,
    thumbnailUrl: thumb.thumbnailUrl,
    contributions: 1,
    kind: 'map',
  }));

  const items = [...pages, ...maps]
    .sort((a, b) => b.contributions - a.contributions || a.title.localeCompare(b.title))
    .slice(0, 8);

  if (items.length === 0) {
    return <StatsEmptyState message={t('profile.creatorstats.featuredEmpty')} />;
  }

  return (
    <div className={`${FOCAL_ELEVATED_CLASS} space-y-3 rounded-lg border border-border p-4`}>
      <h4 className="text-sm text-foreground">
        {t('profile.creatorstats.mostWorkedHeading')}
      </h4>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`}>
            <Link
              to={item.href}
              className="block overflow-hidden rounded-lg border border-border transition-colors hover:border-primary"
            >
              {item.thumbnailUrl ? (
                <img
                  src={item.thumbnailUrl}
                  alt=""
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-border/25 px-3 text-center text-xs text-muted">
                  {item.kind === 'map'
                    ? t('profile.creatorstats.cartographyFallback')
                    : t('profile.creatorstats.pageArtworkFallback')}
                </div>
              )}
              <div className="space-y-1 p-3">
                <p className="line-clamp-2 text-sm text-foreground">{item.title}</p>
                <p className={`${TYPE_META_CLASS} text-muted`}>
                  {item.kind === 'map'
                    ? t('profile.creatorstats.mostWorkedMap')
                    : t('profile.creatorstats.mostWorkedContributions', {
                        count: item.contributions,
                      })}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
