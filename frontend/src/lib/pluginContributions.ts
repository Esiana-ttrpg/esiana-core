/**
 * Declarative plugin contribution stores (nav, cards, page extensions).
 * Distinct from free-form UI slots — Core owns chrome; plugins declare metadata/render.
 */

import type { PluginSlotRenderer } from '@/plugins/slots/types';
import { CampaignMemberRoles } from '@/types/domain';

export type PluginRegistrationScope = 'global' | 'campaign' | 'both';

/** Closed Core-owned visibility hints — Core evaluates; plugins do not invent auth. */
export type PluginRequires = 'authenticated' | 'campaignAdmin';

export type PluginPageTarget =
  | 'character.detail'
  | 'location.detail'
  | 'quest.detail'
  | 'organization.detail'
  | 'campaign.dashboard';

export interface PluginAppHomeCardDefinition {
  id: string;
  pluginId: string;
  render: PluginSlotRenderer;
  requires?: PluginRequires;
}

export interface PluginHeaderPageDefinition {
  id: string;
  pluginId: string;
  label: string;
  icon?: string;
  pageId: string;
  scope: PluginRegistrationScope;
  requires?: PluginRequires;
}

export interface PluginPageSectionDefinition {
  id: string;
  pluginId: string;
  target: PluginPageTarget;
  render: PluginSlotRenderer;
  requires?: PluginRequires;
}

export interface PluginPageActionDefinition {
  id: string;
  pluginId: string;
  target: PluginPageTarget;
  label: string;
  icon?: string;
  pageId?: string;
  href?: string;
  requires?: PluginRequires;
}

const appHomeCards = new Map<string, PluginAppHomeCardDefinition>();
const headerPages = new Map<string, PluginHeaderPageDefinition>();
const pageSections = new Map<string, PluginPageSectionDefinition>();
const pageActions = new Map<string, PluginPageActionDefinition>();

function key(pluginId: string, id: string): string {
  return `${pluginId}:${id}`;
}

export function registerAppHomeCard(
  pluginId: string,
  definition: Omit<PluginAppHomeCardDefinition, 'pluginId'>,
): void {
  appHomeCards.set(key(pluginId, definition.id), { ...definition, pluginId });
}

export function listAppHomeCards(): PluginAppHomeCardDefinition[] {
  return [...appHomeCards.values()];
}

export function registerHeaderPage(
  pluginId: string,
  definition: Omit<PluginHeaderPageDefinition, 'pluginId'>,
): void {
  headerPages.set(key(pluginId, definition.id), { ...definition, pluginId });
}

export function listHeaderPages(filter?: {
  context: 'global' | 'campaign';
}): PluginHeaderPageDefinition[] {
  const all = [...headerPages.values()];
  if (!filter) return all;
  return all.filter((entry) => {
    if (entry.scope === 'both') return true;
    return entry.scope === filter.context;
  });
}

export function registerPageSection(
  pluginId: string,
  definition: Omit<PluginPageSectionDefinition, 'pluginId'>,
): void {
  pageSections.set(key(pluginId, definition.id), { ...definition, pluginId });
}

export function listPageSections(target?: PluginPageTarget): PluginPageSectionDefinition[] {
  const all = [...pageSections.values()];
  return target ? all.filter((entry) => entry.target === target) : all;
}

export function registerPageAction(
  pluginId: string,
  definition: Omit<PluginPageActionDefinition, 'pluginId'>,
): void {
  pageActions.set(key(pluginId, definition.id), { ...definition, pluginId });
}

export function listPageActions(target?: PluginPageTarget): PluginPageActionDefinition[] {
  const all = [...pageActions.values()];
  return target ? all.filter((entry) => entry.target === target) : all;
}

export function clearPluginContributionRegistries(): void {
  appHomeCards.clear();
  headerPages.clear();
  pageSections.clear();
  pageActions.clear();
}

export function meetsPluginRequires(
  requires: PluginRequires | undefined,
  context: {
    isAuthenticated: boolean;
    campaignRole?: string | null;
  },
): boolean {
  if (!requires) return true;
  if (requires === 'authenticated') return context.isAuthenticated;
  if (requires === 'campaignAdmin') {
    return (
      context.isAuthenticated &&
      (context.campaignRole === CampaignMemberRoles.GAMEMASTER ||
        context.campaignRole === 'GAMEMASTER')
    );
  }
  return false;
}

/** Persistable sidebar order id for a plugin nav registration. */
export function pluginSidebarOrderId(pluginId: string, itemId: string): string {
  return `plugin:${pluginId}:${itemId}`;
}

export function parsePluginSidebarOrderId(
  orderId: string,
): { pluginId: string; itemId: string } | null {
  if (!orderId.startsWith('plugin:')) return null;
  const rest = orderId.slice('plugin:'.length);
  const colon = rest.indexOf(':');
  if (colon <= 0) return null;
  return {
    pluginId: rest.slice(0, colon),
    itemId: rest.slice(colon + 1),
  };
}

export function isPluginSidebarOrderId(id: string): boolean {
  return parsePluginSidebarOrderId(id) !== null;
}

/** Map entity surface key to a page extension target. */
export function resolvePluginPageTarget(
  surfaceKey?: string | null,
): PluginPageTarget | undefined {
  switch (surfaceKey) {
    case 'character':
      return 'character.detail';
    case 'location':
      return 'location.detail';
    case 'quest':
      return 'quest.detail';
    case 'organization':
      return 'organization.detail';
    default:
      return undefined;
  }
}
