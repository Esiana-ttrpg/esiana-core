import { CampaignCapabilities } from '@shared/campaignPolicy/capabilities';
import {
  campaignChronologyPath,
  campaignNotesPath,
  campaignProgressionPath,
  campaignSettingsPath,
} from '@/lib/campaignPaths';
import type { Command, CommandContext, CommandProvider } from '../types.js';

export function buildCoreNavigationCommands(ctx: CommandContext): Command[] {
  const handle = ctx.campaignHandle;
  return [
    {
      id: 'core.navigate.sessions',
      label: 'Open Sessions',
      icon: 'scroll-text',
      keywords: ['sessions', 'notes', 'session notes'],
      group: 'navigate',
      action: { type: 'navigate', href: campaignNotesPath(handle) },
    },
    {
      id: 'core.navigate.timeline',
      label: 'Open Timeline',
      icon: 'calendar',
      keywords: ['timeline', 'chronology', 'calendar'],
      group: 'navigate',
      action: {
        type: 'navigate',
        href: campaignChronologyPath(handle, 'timeline'),
      },
    },
    {
      id: 'core.navigate.developments',
      label: 'Open Developments',
      icon: 'git-branch',
      keywords: ['developments', 'progression', 'pending'],
      group: 'navigate',
      action: {
        type: 'navigate',
        href: campaignProgressionPath(handle, 'developments'),
      },
    },
    {
      id: 'core.navigate.settings',
      label: 'Campaign Settings',
      icon: 'landmark',
      keywords: ['settings', 'campaign', 'config'],
      group: 'navigate',
      requires: [CampaignCapabilities.CAMPAIGN_SETTINGS_EDIT],
      action: { type: 'navigate', href: campaignSettingsPath(handle) },
    },
  ];
}

export const coreNavigationCommandProvider: CommandProvider = {
  id: 'core.navigate',
  commands: buildCoreNavigationCommands,
};
