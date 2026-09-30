import type { Command, CommandContext, CommandProvider } from '../types.js';

export function buildCorePageCommands(ctx: CommandContext): Command[] {
  const page = ctx.activePage;
  if (!page) return [];

  const commands: Command[] = [];

  if (page.canEdit && !page.isEditing) {
    commands.push({
      id: 'core.page.edit',
      label: `Edit ${page.title}`,
      icon: 'pen-line',
      keywords: ['edit', 'modify', page.title],
      group: 'page',
      action: { type: 'page.enterEdit', pageId: page.pageId },
    });
  }

  commands.push({
    id: 'core.page.copy-link',
    label: `Copy link to ${page.title}`,
    icon: 'bookmark',
    keywords: ['copy', 'link', 'share', 'url', page.title],
    group: 'page',
    action: {
      type: 'copyLink',
      href: page.href,
      successMessage: 'Link copied',
    },
  });

  return commands;
}

export const corePageCommandProvider: CommandProvider = {
  id: 'core.page',
  commands: buildCorePageCommands,
};
