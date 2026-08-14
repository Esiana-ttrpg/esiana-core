import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { FamilyMetadataEditor } from '@/components/entity/FamilyMetadataEditor';
import { FamilyIdentityStrip } from '@/components/entity/FamilyIdentityStrip';
import { parseFamilyMetadata } from '@/lib/familyMetadata';
import type { FamilyIdentityProjection } from '@/lib/familyIdentityProjection';
import type { DiscoveryStateProjection } from '@shared/discoveryProjection';
import type { WikiTreeNode } from '@/types/wiki';
import { NarrativeVisibilityBadge } from './NarrativeVisibilityBadge';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface FamilyHeroSurfaceProps {
  campaignHandle: string;
  pageId: string;
  isDMUser?: boolean;
  isEditingPage: boolean;
  pageVisibility: string;
  discovery?: DiscoveryStateProjection | null;
  onVisibilityChange?: (next: 'Public' | 'Party' | 'DM_Only') => void | Promise<void>;
  onEditField?: (fieldKey: string) => void;
  identityProjection: FamilyIdentityProjection | null;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  blockId: string;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
  focusField?: string | null;
  showIdentityEditor?: boolean;
  seatLocationId?: string | null;
}

export function FamilyHeroSurface({
  campaignHandle,
  pageId,
  isDMUser: isDMUserProp,
  isEditingPage,
  pageVisibility,
  discovery,
  onVisibilityChange,
  onEditField,
  identityProjection,
  metadata,
  flatPages,
  blockId,
  onMetadataSaved,
  focusField,
  showIdentityEditor = false,
  seatLocationId,
}: FamilyHeroSurfaceProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const family = parseFamilyMetadata(metadata);

  if (showIdentityEditor && isEditingPage && isDMUser) {
    return (
      <section className="mb-4 rounded-xl border border-border/60 bg-surface/30 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className={META_SECTION_LABEL_CLASS}>Family identity</h2>
          <NarrativeVisibilityBadge
            pageVisibility={pageVisibility}
            discovery={discovery}
            isEditingPage={isEditingPage}
            onVisibilityChange={onVisibilityChange}
          />
        </div>
        <FamilyMetadataEditor
          blockId={blockId}
          campaignHandle={campaignHandle}
          pageId={pageId}
          metadata={metadata}
          flatPages={flatPages}
          onSaved={onMetadataSaved}
          section="identity"
          bare
        />
      </section>
    );
  }

  if (identityProjection) {
    return (
      <header className="mb-4 min-w-0 border-b border-focal-muted/15 pb-2">
        <FamilyIdentityStrip
          projection={identityProjection}
          campaignHandle={campaignHandle}
          seatLocationId={seatLocationId ?? family.seatLocationId}
          onEditField={onEditField}
        />
      </header>
    );
  }

  return null;
}
