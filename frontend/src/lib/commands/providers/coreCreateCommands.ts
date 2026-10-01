import { CampaignCapabilities } from '@shared/campaignPolicy/capabilities';
import type { CampaignWorkspace } from '@shared/campaignWorkspace';
import { CampaignWorkspace as Workspace } from '@shared/campaignWorkspace';
import { listCreatableCodexPageTypes } from '@/lib/campaignWorkspaceRoutes';
import { createItemLabel } from '@/lib/wikiLabels';
import type { Command, CommandContext, CommandProvider } from '../types.js';

/** Optional presentation icons — missing entries use the generic page icon. */
const CREATE_ICON_BY_WORKSPACE: Partial<Record<CampaignWorkspace, string>> = {
  [Workspace.CHARACTERS]: 'user',
  [Workspace.BESTIARY]: 'paw-print',
  [Workspace.ANCESTRIES]: 'users',
  [Workspace.ORGANIZATIONS]: 'building',
  [Workspace.LOCATIONS]: 'map-pin',
  [Workspace.OBJECTS]: 'package',
  [Workspace.FAMILIES]: 'heart',
  [Workspace.RULES_RESOURCES]: 'scroll-text',
};

const GENERIC_CREATE_ICON = 'file-text';

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

  for (const type of listCreatableCodexPageTypes()) {
    if (!ctx.resolveCategoryPageId(type.categoryTitle)) continue;
    const itemLabel = createItemLabel(type.categoryTitle);
    commands.push({
      id: `core.create.${type.segment}`,
      label: `Create ${itemLabel}`,
      icon: CREATE_ICON_BY_WORKSPACE[type.workspace] ?? GENERIC_CREATE_ICON,
      keywords: keywordsForCreate(type.categoryTitle, itemLabel, type.segment),
      group: 'create',
      requires: [CampaignCapabilities.PAGE_CREATE],
      action: {
        type: 'openDialog',
        dialog: { kind: 'create-page', categoryTitle: type.categoryTitle },
      },
    });
  }

  commands.push({
    id: 'core.create.session-note',
    label: 'New Session Note',
    icon: 'notebook-pen',
    keywords: ['session', 'note', 'new', 'write'],
    group: 'create',
    requires: [CampaignCapabilities.PAGE_CREATE],
    action: { type: 'openDialog', dialog: { kind: 'session-note' } },
  });

  return commands;
}

export const coreCreateCommandProvider: CommandProvider = {
  id: 'core.create',
  commands: buildCoreCreateCommands,
};
