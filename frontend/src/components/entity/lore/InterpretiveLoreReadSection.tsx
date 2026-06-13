import { IdentityHistoryReadPanel } from '@/components/entity/lore/EntityIdentityHistoryEditor';
import { InterpretationsReadPanel } from '@/components/entity/lore/EntityInterpretationsEditor';
import { LoreClaimsReadPanel } from '@/components/entity/lore/EntityLoreClaimsEditor';
import { LoreSemanticStackSkeleton } from '@/components/entity/lore/LoreKnowledgeUi';
import { useLoreSemanticBundle } from '@/hooks/useLoreSemanticBundle';
import type { LorePageLookup } from '@/lib/resolveLoreSourceDisplay';

interface InterpretiveLoreReadSectionProps {
  campaignHandle: string;
  pageId: string;
  flatPages?: LorePageLookup[];
  memberRole?: string;
  allowPlayerChronologyManagement?: boolean;
}

export function InterpretiveLoreReadSection({
  campaignHandle,
  pageId,
  flatPages = [],
  memberRole,
  allowPlayerChronologyManagement = false,
}: InterpretiveLoreReadSectionProps) {
  const { status, bundle, errors } = useLoreSemanticBundle(campaignHandle, pageId);

  if (status === 'loading' || status === 'idle') {
    return <LoreSemanticStackSkeleton />;
  }

  if (status === 'empty' || !bundle) {
    return null;
  }

  return (
    <div className="mb-4 space-y-2">
      <IdentityHistoryReadPanel aliases={bundle.aliases} error={errors.aliases} />
      <InterpretationsReadPanel accounts={bundle.accounts} error={errors.interpretations} />
      <LoreClaimsReadPanel
        campaignHandle={campaignHandle}
        pageId={pageId}
        claims={bundle.claims}
        flatPages={flatPages}
        memberRole={memberRole}
        allowPlayerChronologyManagement={allowPlayerChronologyManagement}
        error={errors.claims}
      />
    </div>
  );
}
