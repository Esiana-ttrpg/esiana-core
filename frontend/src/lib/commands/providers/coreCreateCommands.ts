import { CampaignCapabilities } from '@shared/campaignPolicy/capabilities';
import { listCreatableCodexPageTypes } from '@/lib/campaignWorkspaceRoutes';
import {
  isSidebarSectionVisible,
  type SidebarSectionId,
} from '@/lib/sidebarConfig';
import { createItemLabel } from '@/lib/wikiLabels';
import type { Command, CommandContext, CommandProvider } from '../types.js';

function keywordsForCreate(categoryTitle: string, itemLabel: string, segment: string): string[] {
  const words = [
    'new',
    'create',
    itemLabel.toLowerCase(),
    ...categoryTitle.toLowerCase().split(/[\s/]+/),
    ...segment.split('-'),
  ];
  return [...new Set(words.filter(Boolean))];
}

export function buildCoreCreateCommands(ctx: CommandContext): Command[] {
  const commands: Command[] = [];

  commands.push({
    id: 'core.create.page',
    label: 'Page',
    icon: 'file-text',
    keywords: ['new', 'page', 'draft', 'write', 'workshop', 'blank'],
    group: 'create',
    requires: [CampaignCapabilities.PAGE_CREATE],
    action: { type: 'workshop.newBlank' },
  });

  for (const type of listCreatableCodexPageTypes()) {
    if (!ctx.resolveCategoryPageId(type.categoryTitle)) continue;
    if (!isSidebarSectionVisible(ctx.sidebarConfig, type.sidebarId)) continue;
    const itemLabel = createItemLabel(type.categoryTitle);
    commands.push({
      id: `core.create.${type.segment}`,
      label: `Create ${itemLabel}`,
      sidebarSectionId: type.sidebarId as SidebarSectionId,
      keywords: keywordsForCreate(type.categoryTitle, itemLabel, type.segment),
      group: 'create',
      requires: [CampaignCapabilities.PAGE_CREATE],
      action: {
        type: 'openDialog',
        dialog: { kind: 'create-page', categoryTitle: type.categoryTitle },
      },
    });
  }

  if (isSidebarSectionVisible(ctx.sidebarConfig, 'sessionNotes')) {
    commands.push({
      id: 'core.create.session-note',
      label: 'New Session Note',
      sidebarSectionId: 'sessionNotes',
      keywords: ['session', 'note', 'new', 'write'],
      group: 'create',
      requires: [CampaignCapabilities.PAGE_CREATE],
      action: { type: 'openDialog', dialog: { kind: 'session-note' } },
    });
  }

  return commands;
}

export const coreCreateCommandProvider: CommandProvider = {
  id: 'core.create',
  commands: buildCoreCreateCommands,
};
