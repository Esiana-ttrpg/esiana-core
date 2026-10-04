import type { CampaignCapability } from '@shared/campaignPolicy/capabilities';
import type { SidebarConfig, SidebarSectionId } from '@/lib/sidebarConfig';

/** Snapshot of the page WikiPage is currently rendering (published via ActivePageContext). */
export interface ActivePageSnapshot {
  pageId: string;
  title: string;
  /** Canonical public path (no origin). */
  href: string;
  /** === WikiPage's pageCanEdit */
  canEdit: boolean;
  isEditing: boolean;
}

/** Category folder title for CreatePageModal (from creatable codex catalog). */
export type CreatePageCategoryTitle = string;

export interface CommandContext {
  campaignHandle: string;
  campaignId: string | null;
  pathname: string;
  workspaceSegment: string | null;
  can: (cap: CampaignCapability) => boolean;
  /** Category page id for a known content type; undefined = not present in this campaign. */
  resolveCategoryPageId: (
    categoryTitle: CreatePageCategoryTitle,
  ) => string | undefined;
  activePage: ActivePageSnapshot | null;
  /** Campaign sidebar config — used for create/nav visibility and icons. */
  sidebarConfig: SidebarConfig;
}

/** Declarative, serializable. Only CommandActionHost interprets these. */
export type CommandAction =
  | { type: 'navigate'; href: string }
  | {
      type: 'openDialog';
      dialog:
        | { kind: 'create-page'; categoryTitle: CreatePageCategoryTitle }
        | { kind: 'session-note' }
        | { kind: 'advance-time' };
    }
  | { type: 'page.enterEdit'; pageId: string }
  | { type: 'copyLink'; href: string; successMessage: string };

export type CommandGroup = 'page' | 'create' | 'navigate' | 'campaign';

export const COMMAND_GROUP_ORDER: readonly CommandGroup[] = [
  'page',
  'create',
  'navigate',
  'campaign',
];

export interface Command {
  id: string;
  label: string;
  /** Lucide catalog name when not tied to a sidebar section. */
  icon?: string;
  /**
   * When set, CommandRow resolves the icon via SidebarNavIcon (defaults + campaign overrides).
   */
  sidebarSectionId?: SidebarSectionId;
  keywords?: readonly string[];
  group: CommandGroup;
  description?: string;
  requires?: readonly CampaignCapability[];
  action: CommandAction;
}

export interface CommandProvider {
  id: string;
  commands: (ctx: CommandContext) => Command[];
}
