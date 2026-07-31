import type { CampaignSource, WizardStepDef } from './types';
import { isBlankCampaignSource } from './types';

export function buildWizardSteps(campaignSource: CampaignSource): WizardStepDef[] {
  const steps: WizardStepDef[] = [
    { id: 'identity', label: 'Identity' },
    { id: 'source', label: 'Source' },
  ];
  if (isBlankCampaignSource(campaignSource)) {
    steps.push(
      { id: 'party', label: 'Party', optional: true },
      { id: 'location', label: 'Location', optional: true },
      { id: 'tension', label: 'Tension', optional: true },
    );
  }
  steps.push({ id: 'scheduling', label: 'Scheduling', optional: true });
  steps.push({ id: 'review', label: 'Review' });
  return steps;
}
