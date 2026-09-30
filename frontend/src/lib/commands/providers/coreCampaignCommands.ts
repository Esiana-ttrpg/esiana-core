import { CampaignCapabilities } from '@shared/campaignPolicy/capabilities';
import type { Command, CommandProvider } from '../types.js';

export function buildCoreCampaignCommands(): Command[] {
  return [
    {
      id: 'core.campaign.advance-time',
      label: 'Advance Campaign Time',
      icon: 'clock',
      keywords: ['advance', 'time', 'clock', 'calendar'],
      group: 'campaign',
      description: 'Move the campaign clock forward',
      requires: [CampaignCapabilities.CHRONOLOGY_EDIT],
      action: { type: 'openDialog', dialog: { kind: 'advance-time' } },
    },
  ];
}

export const coreCampaignCommandProvider: CommandProvider = {
  id: 'core.campaign',
  commands: () => buildCoreCampaignCommands(),
};
