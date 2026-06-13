import { EntityLoreClaimsEditor } from '@/components/entity/lore/EntityLoreClaimsEditor';
import { PartyKnowledgeDiscoverySection } from '@/components/entity/lore/PartyKnowledgeDiscoverySection';
import type { LorePageLookup } from '@/lib/resolveLoreSourceDisplay';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface EntityDiscoveryWidgetProps {
  campaignHandle: string;
  pageId: string;
  isDMUser?: boolean;
  flatPages?: LorePageLookup[];
  memberRole?: string;
  allowPlayerChronologyManagement?: boolean;
}

export function EntityDiscoveryWidget({
  campaignHandle,
  pageId,
  isDMUser: isDMUserProp,
  flatPages = [],
  memberRole,
  allowPlayerChronologyManagement = false,
}: EntityDiscoveryWidgetProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  if (!isDMUser) {
    return (
      <p className="text-sm text-muted">
        Discovery details are visible to the DM in edit mode.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <PartyKnowledgeDiscoverySection
        campaignHandle={campaignHandle}
        pageId={pageId}
        isDMUser
      />
      <section className="space-y-3 border-t border-border/50 pt-4">
        <div>
          <h3 className="text-sm font-medium text-foreground">Sources &amp; provenance</h3>
          <p className="mt-1 text-xs text-muted">
            Claim-centric evidence for this entity. Circulate a claim to spread it as rumor in
            chronology (region or faction).
          </p>
        </div>
        <EntityLoreClaimsEditor
          campaignHandle={campaignHandle}
          pageId={pageId}
          flatPages={flatPages}
          memberRole={memberRole}
          allowPlayerChronologyManagement={allowPlayerChronologyManagement}
        />
      </section>
    </div>
  );
}
