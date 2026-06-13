import { Link } from 'react-router-dom';
import type { MapBreadcrumbItem } from '@/types/maps';

interface MapViewerToolbarProps {
  mapsHubHref?: string;
  breadcrumbs: MapBreadcrumbItem[];
  onNavigateMap?: (assetId: string, title?: string) => void;
}

/** In-map navigation trail (nested maps). Kept separate from page title / settings. */
export function MapViewerToolbar({
  mapsHubHref,
  breadcrumbs,
  onNavigateMap,
}: MapViewerToolbarProps) {
  if (!mapsHubHref && breadcrumbs.length === 0) return null;

  return (
    <nav
      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted"
      aria-label="Map location"
    >
      {mapsHubHref ? (
        <Link to={mapsHubHref} className="font-medium hover:text-foreground hover:underline">
          Maps
        </Link>
      ) : null}
      {breadcrumbs.map((crumb, index) => (
        <span key={crumb.assetId} className="inline-flex items-center gap-2">
          {mapsHubHref || index > 0 ? <span aria-hidden>/</span> : null}
          {index === breadcrumbs.length - 1 ? (
            <span className="text-foreground">{crumb.title}</span>
          ) : (
            <button
              type="button"
              className="font-medium hover:text-foreground hover:underline"
              onClick={() => onNavigateMap?.(crumb.assetId, crumb.title)}
            >
              {crumb.title}
            </button>
          )}
        </span>
      ))}
    </nav>
  );
}
