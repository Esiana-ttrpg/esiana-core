import type { WikiTreeNode } from '@/types/wiki';
import { ScheduledNarrativePanel } from '@/components/progression/ScheduledNarrativePanel';

interface ScheduledEffectsProgressionSectionProps {
  campaignHandle: string;
  organizationPages: WikiTreeNode[];
  canManage: boolean;
}

export function ScheduledEffectsProgressionSection({
  campaignHandle,
  organizationPages,
  canManage,
}: ScheduledEffectsProgressionSectionProps) {
  return (
    <ScheduledNarrativePanel
      campaignHandle={campaignHandle}
      organizationPages={organizationPages}
      canManage={canManage}
    />
  );
}
