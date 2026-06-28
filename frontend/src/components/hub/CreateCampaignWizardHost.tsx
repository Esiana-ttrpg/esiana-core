import { NewCampaignWizard } from '@/components/hub/NewCampaignWizard';
import type { CampaignSummary } from '@/types/campaign';

interface CreateCampaignWizardHostProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (campaign: CampaignSummary) => void;
}

export function CreateCampaignWizardHost({
  open,
  onClose,
  onCreated,
}: CreateCampaignWizardHostProps) {
  return (
    <NewCampaignWizard
      open={open}
      onClose={onClose}
      onCreated={(campaign) => {
        onCreated?.(campaign);
      }}
    />
  );
}
