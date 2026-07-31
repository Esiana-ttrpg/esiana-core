import { LocationMetadataEditor } from '@/components/entity/LocationMetadataEditor';
import { NarrativeVisibilityBadge } from './NarrativeVisibilityBadge';
import {
  parseLocationMetadata,
  resolveLocationRegionLabel,
} from '@/lib/locationMetadata';
import type { DiscoveryStateProjection } from '@shared/discoveryProjection';
import type { WikiTreeNode } from '@/types/wiki';

interface LocationHeroSurfaceProps {
  campaignHandle: string;
  pageId: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  parentId?: string | null;
  onParentIdSaved?: (parentId: string | null) => void;
  isEditingPage: boolean;
  pageVisibility: string;
  discovery?: DiscoveryStateProjection | null;
  onVisibilityChange?: (next: 'Public' | 'Party' | 'DM_Only') => void | Promise<void>;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
  showIdentityEditor?: boolean;
}

export function LocationHeroSurface({
  campaignHandle,
  pageId,
  metadata,
  flatPages,
  parentId = null,
  onParentIdSaved,
  isEditingPage,
  pageVisibility,
  discovery,
  onVisibilityChange,
  onMetadataSaved,
  showIdentityEditor,
}: LocationHeroSurfaceProps) {
  const location = parseLocationMetadata(metadata);
  const regionLabel = resolveLocationRegionLabel(location, flatPages);
  const subtitleParts = [
    location.locationType,
    regionLabel,
    location.currentStatus,
  ].filter(Boolean);

  return (
    <div className="mb-5 space-y-4 border-b border-border/25 pb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          {!isEditingPage && subtitleParts.length > 0 ? (
            <p className="text-sm text-muted">{subtitleParts.join(' • ')}</p>
          ) : null}
        </div>
        <NarrativeVisibilityBadge
          pageVisibility={pageVisibility}
          discovery={discovery}
          isEditingPage={isEditingPage}
          onVisibilityChange={onVisibilityChange}
        />
      </div>
      {isEditingPage && showIdentityEditor ? (
        <LocationMetadataEditor
          campaignHandle={campaignHandle}
          pageId={pageId}
          metadata={metadata}
          flatPages={flatPages}
          parentId={parentId}
          onParentIdSaved={onParentIdSaved}
          onSaved={onMetadataSaved}
          section="identity"
          bare
        />
      ) : null}
    </div>
  );
}
