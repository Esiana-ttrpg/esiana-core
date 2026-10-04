import { CampaignCapabilities } from '@shared/campaignPolicy/capabilities';
import {
  campaignChronologyPath,
  campaignNotesPath,
  campaignProgressionPath,
  campaignSettingsPath,
} from '@/lib/campaignPaths';
import { isSidebarSectionVisible } from '@/lib/sidebarConfig';
import type { Command, CommandContext, CommandProvider } from '../types.js';

export function buildCoreNavigationCommands(ctx: CommandContext): Command[] {
  const handle = ctx.campaignHandle;
  const commands: Command[] = [];

  if (isSidebarSectionVisible(ctx.sidebarConfig, 'sessionNotes')) {
    commands.push({
      id: 'core.navigate.sessions',
      label: 'Open Sessions',
      sidebarSectionId: 'sessionNotes',
      keywords: ['sessions', 'notes', 'session notes'],
      group: 'navigate',
      action: { type: 'navigate', href: campaignNotesPath(handle) },
    });
  }

  // Timeline lives in the always-visible TIMELINE zone (not a toggleable bucket item).
  commands.push({
    id: 'core.navigate.timeline',
    label: 'Open Timeline',
    sidebarSectionId: 'timeTracking',
    keywords: ['timeline', 'chronology', 'calendar'],
    group: 'navigate',
    action: {
      type: 'navigate',
      href: campaignChronologyPath(handle, 'timeline'),
    },
  });

  if (isSidebarSectionVisible(ctx.sidebarConfig, 'progression')) {
    commands.push(
      {
        id: 'core.navigate.trajectories',
        label: 'Open Trajectories',
        sidebarSectionId: 'progression',
        keywords: ['trajectories', 'progression', 'eras', 'faction directions'],
        group: 'navigate',
        action: {
          type: 'navigate',
          href: campaignProgressionPath(handle, 'trajectories'),
        },
      },
      {
        id: 'core.navigate.developments',
        label: 'Open Developments',
        sidebarSectionId: 'progression',
        keywords: ['developments', 'progression', 'pending'],
        group: 'navigate',
        action: {
          type: 'navigate',
          href: campaignProgressionPath(handle, 'developments'),
        },
      },
      {
        id: 'core.navigate.history',
        label: 'Open Development History',
        sidebarSectionId: 'progression',
        keywords: ['history', 'progression', 'developments', 'accepted'],
        group: 'navigate',
        action: {
          type: 'navigate',
          href: campaignProgressionPath(handle, 'history'),
        },
      },
    );
  }

  if (isSidebarSectionVisible(ctx.sidebarConfig, 'settings')) {
    commands.push({
      id: 'core.navigate.settings',
      label: 'Campaign Settings',
      sidebarSectionId: 'settings',
      keywords: ['settings', 'campaign', 'config'],
      group: 'navigate',
      requires: [CampaignCapabilities.CAMPAIGN_SETTINGS_EDIT],
      action: { type: 'navigate', href: campaignSettingsPath(handle) },
    });
  }

  return commands;
}

export const coreNavigationCommandProvider: CommandProvider = {
  id: 'core.navigate',
  commands: buildCoreNavigationCommands,
};
