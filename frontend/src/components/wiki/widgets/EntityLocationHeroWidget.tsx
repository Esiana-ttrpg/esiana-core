import { SinceLastVisitPanel } from '@/components/entity/SinceLastVisitPanel';
import { RegionRumorsPanel } from '@/components/entity/RegionRumorsPanel';
import { LocationMetadataEditor } from '@/components/entity/LocationMetadataEditor';
import {
  parseLocationMetadata,
  resolveLocationRegionLabel,
} from '@/lib/locationMetadata';
import { MapPin } from 'lucide-react';
import type { WikiTreeNode } from '@/types/wiki';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface EntityLocationHeroWidgetProps {
  blockId: string;
  campaignHandle: string;
  pageId: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  parentId?: string | null;
  onParentIdSaved?: (parentId: string | null) => void;
  isEditingPage: boolean;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
  isDMUser?: boolean;
}

export function EntityLocationHeroWidget({
  blockId,
  campaignHandle,
  pageId,
  metadata,
  flatPages,
  parentId = null,
  onParentIdSaved,
  isEditingPage,
  onMetadataSaved,
  isDMUser: isDMUserProp,
}: EntityLocationHeroWidgetProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const memberRole = isDMUser ? 'GAMEMASTER' : 'Player';
  const location = parseLocationMetadata(metadata);
  const regionLabel = resolveLocationRegionLabel(location, flatPages);

  if (isEditingPage) {
    return (
      <LocationMetadataEditor
        blockId={blockId}
        campaignHandle={campaignHandle}
        pageId={pageId}
        metadata={metadata}
        flatPages={flatPages}
        parentId={parentId}
        onParentIdSaved={onParentIdSaved}
        onSaved={onMetadataSaved}
        bare
      />
    );
  }

  const parentTitle =
    parentId != null
      ? flatPages.find((p) => p.id === parentId)?.title ?? null
      : null;

  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-lg border border-border/50 bg-surface-raised/30 p-3">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
        <div className="min-w-0 space-y-1">
          <ul className="space-y-0.5 text-sm text-foreground">
            {location.locationType ? (
              <li>
                <span className="text-muted">Type:</span> {location.locationType}
              </li>
            ) : null}
            {parentTitle ? (
              <li>
                <span className="text-muted">Parent:</span> {parentTitle}
              </li>
            ) : null}
            {regionLabel ? (
              <li>
                <span className="text-muted">Region:</span> {regionLabel}
              </li>
            ) : null}
            {location.climate ? (
              <li>
                <span className="text-muted">Climate:</span> {location.climate}
              </li>
            ) : null}
            {location.threats.length > 0 ? (
              <li>
                <span className="text-muted">Threats:</span>{' '}
                {location.threats.join(', ')}
              </li>
            ) : null}
            {location.knownFor.length > 0 ? (
              <li>
                <span className="text-muted">Known for:</span>{' '}
                {location.knownFor.join(' • ')}
              </li>
            ) : null}
            {location.rulerOrAuthority ? (
              <li>
                <span className="text-muted">Authority:</span> {location.rulerOrAuthority}
              </li>
            ) : null}
            {location.population ? (
              <li>
                <span className="text-muted">Population:</span> {location.population}
              </li>
            ) : null}
            {location.currentStatus ? (
              <li>
                <span className="text-muted">Status:</span> {location.currentStatus}
              </li>
            ) : null}
          </ul>
          {!location.locationType &&
          !parentTitle &&
          !regionLabel &&
          !location.rulerOrAuthority &&
          !location.population &&
          !location.currentStatus &&
          !location.climate &&
          location.threats.length === 0 &&
          location.knownFor.length === 0 ? (
            <p className="text-sm text-muted">Region, authority, and status appear here when set.</p>
          ) : null}
        </div>
      </div>
      <SinceLastVisitPanel
        campaignHandle={campaignHandle}
        locationPageId={pageId}
        memberRole={memberRole}
      />
      <RegionRumorsPanel
        campaignHandle={campaignHandle}
        locationPageId={pageId}
      />
    </div>
  );
}
