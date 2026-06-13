import { useState } from 'react';
import { SpreadRumorModal } from '@/components/entity/SpreadRumorModal';
import { ClaimCirculationHistoryPanel } from '@/components/entity/lore/ClaimCirculationHistoryPanel';
import { LoreClaimManagerActionRow } from '@/components/entity/lore/LoreKnowledgeUi';
import type { CalendarEventRecord } from '@/lib/calendarEventsApi';
import { useWiki } from '@/contexts/WikiContext';
import { CampaignCapabilities } from '@shared/campaignPolicy/capabilities';
import type { LoreClaimWithSources } from '@/lib/loreKnowledgeApi';
import type { LorePageLookup } from '@/lib/resolveLoreSourceDisplay';

type LoreClaimCirculationControlsProps = {
  campaignHandle: string;
  subjectPageId: string;
  claim: LoreClaimWithSources;
  flatPages: LorePageLookup[];
  calendarEvents?: CalendarEventRecord[];
  onCirculationChanged?: () => void;
};

export function LoreClaimCirculationControls({
  campaignHandle,
  subjectPageId,
  claim,
  flatPages,
  calendarEvents = [],
  onCirculationChanged,
}: LoreClaimCirculationControlsProps) {
  const { can } = useWiki();
  const isManager = can(CampaignCapabilities.RUMOR_MODERATE);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [circulateOpen, setCirculateOpen] = useState(false);

  if (!isManager) return null;

  return (
    <div className="border-t border-border/30 pt-3 mt-3">
      <LoreClaimManagerActionRow
        onCirculate={() => setCirculateOpen(true)}
        onToggleHistory={() => setHistoryOpen((v) => !v)}
        historyOpen={historyOpen}
      />
      {historyOpen ? (
        <ClaimCirculationHistoryPanel
          campaignHandle={campaignHandle}
          claimId={claim.id}
          flatPages={flatPages}
          calendarEvents={calendarEvents}
          onChanged={onCirculationChanged}
        />
      ) : null}
      <SpreadRumorModal
        campaignHandle={campaignHandle}
        open={circulateOpen}
        onClose={() => setCirculateOpen(false)}
        onSuccess={() => {
          setHistoryOpen(true);
          onCirculationChanged?.();
        }}
        sourceClaimId={claim.id}
        draft={{ statement: claim.statement, subjectPageId }}
        flatPages={flatPages}
      />
    </div>
  );
}
