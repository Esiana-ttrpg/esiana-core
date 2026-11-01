import { CampaignCapabilities, type CampaignCapability } from './capabilities.js';
import { MembershipRoles, type MembershipRole } from './membershipRoles.js';

export type MatrixSectionId =
  | 'campaign'
  | 'wiki'
  | 'adventure'
  | 'characters'
  | 'worldbuilding'
  | 'quests'
  | 'chronology'
  | 'maps'
  | 'sessions'
  | 'discoveries'
  | 'integrations';

export type MatrixRow = {
  capability: CampaignCapability;
  label: string;
  description: string;
  tooltip?: string;
  overridableRoles: readonly MembershipRole[];
  chronologyFlag?: boolean;
  observerUnavailable?: boolean;
  globalFeature?: 'audio';
  campaignFeatureHint?: string;
};

export type MatrixSection = {
  id: MatrixSectionId;
  title: string;
  scope: string;
  rows: readonly MatrixRow[];
};

const PLAYER_OBSERVER: readonly MembershipRole[] = [
  MembershipRoles.PARTICIPANT,
  MembershipRoles.OBSERVER,
];
const PLAYER_ONLY: readonly MembershipRole[] = [MembershipRoles.PARTICIPANT];
const NONE: readonly MembershipRole[] = [];

export const MATRIX_SECTIONS: readonly MatrixSection[] = [
  {
    id: 'campaign',
    title: 'Campaign & Members',
    scope:
      'Campaign container access, membership, settings, and discoverability. Ownership transfer stays on the member roster.',
    rows: [
      {
        capability: CampaignCapabilities.CAMPAIGN_VIEW,
        label: 'View campaign',
        description:
          'Open the campaign workspace when invited, or anonymously when both the instance login gate and campaign public access allow it.',
        overridableRoles: NONE,
      },
      {
        capability: CampaignCapabilities.CAMPAIGN_MANAGE_ROLES,
        label: 'Manage members and permissions',
        description: 'Invite, change roles, and save the Access matrix.',
        overridableRoles: NONE,
      },
      {
        capability: CampaignCapabilities.CAMPAIGN_SETTINGS_EDIT,
        label: 'Edit campaign settings',
        description: 'Theme, sidebar, scheduling, and operational module settings.',
        overridableRoles: NONE,
      },
      {
        capability: CampaignCapabilities.CAMPAIGN_VISIBILITY_EDIT,
        label: 'Change campaign visibility',
        description:
          'Campaign public access (anonymous Observer reads) and listing. Still requires the instance administrator to allow public access.',
        overridableRoles: NONE,
      },
      {
        capability: CampaignCapabilities.CAMPAIGN_DELETE,
        label: 'Delete campaign',
        description: 'Permanently delete this campaign container.',
        overridableRoles: NONE,
      },
    ],
  },
  {
    id: 'wiki',
    title: 'Wiki & Pages',
    scope:
      'Standalone wiki documents and their authoring. Does not open Adventure Board, Quests, or Characters workspaces.',
    rows: [
      {
        capability: CampaignCapabilities.WIKI_VIEW_PARTY,
        label: 'View campaign pages',
        description:
          'See Party/Campaign-tier standalone wiki pages. Also used when maps, chronology, and assets check party visibility. Does not grant unrelated module workspaces.',
        overridableRoles: PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.PAGE_CREATE,
        label: 'Create pages',
        description: 'Create standalone wiki documents.',
        overridableRoles: PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.PAGE_EDIT_OWNED,
        label: 'Edit own pages',
        description:
          'Edit USER-owned standalone wiki pages, and character identity pages that use the same ownership check.',
        overridableRoles: PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.PAGE_EDIT_PARTY,
        label: 'Edit party pages',
        description: 'Edit PARTY-owned standalone wiki pages for the member’s party.',
        overridableRoles: PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.PAGE_EDIT_ANY,
        label: 'Edit any page',
        description: 'Staff bypass for standalone wiki (and character bodies that use page ownership).',
        overridableRoles: NONE,
      },
      {
        capability: CampaignCapabilities.PAGE_VISIBILITY_EDIT,
        label: 'Manage page access',
        description:
          'Change Public / Campaign / GM-only on a resource the actor can manage. Players with edit do not get this automatically.',
        overridableRoles: NONE,
      },
    ],
  },
  {
    id: 'adventure',
    title: 'Adventure',
    scope: 'Adventure Board workspace layout. Linked quests and wiki pages still require their own authorization.',
    rows: [
      {
        capability: CampaignCapabilities.ADVENTURE_STORYBOARD_EDIT,
        label: 'Manage storyboard',
        description: 'Edit Adventure Board layout. Does not reveal restricted linked wiki pages or quests.',
        tooltip: 'Linked quests and wiki pages still require their own authorization.',
        overridableRoles: NONE,
      },
    ],
  },
  {
    id: 'quests',
    title: 'Quests & Threads',
    scope: 'Native quest and thread records. Opening a quest does not reveal a restricted linked wiki page.',
    rows: [
      {
        capability: CampaignCapabilities.QUEST_EDIT,
        label: 'Edit quests',
        description: 'Create and manage native quest records.',
        tooltip: 'Opening a quest does not reveal a restricted linked wiki page.',
        overridableRoles: PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.THREAD_EDIT,
        label: 'Edit threads',
        description: 'Create and manage narrative threads.',
        overridableRoles: PLAYER_OBSERVER,
      },
    ],
  },
  {
    id: 'chronology',
    title: 'Calendar & Chronology',
    scope: 'Events and eras. Linked wiki pages are checked separately.',
    rows: [
      {
        capability: CampaignCapabilities.CHRONOLOGY_EDIT,
        label: 'Manage chronology events',
        description: 'Create, edit, and delete chronology events and eras.',
        chronologyFlag: true,
        observerUnavailable: true,
        overridableRoles: PLAYER_ONLY,
      },
    ],
  },
  {
    id: 'maps',
    title: 'Maps & Assets',
    scope: 'Map workspace and campaign assets. Map pins inherit linked-page or asset visibility.',
    rows: [
      {
        capability: CampaignCapabilities.MAPS_EDIT,
        label: 'Edit maps',
        description: 'Edit layers, markers, and map workspace.',
        tooltip: 'Map pins inherit linked-page visibility.',
        overridableRoles: NONE,
      },
      {
        capability: CampaignCapabilities.ASSETS_VIEW,
        label: 'View assets',
        description: 'View campaign assets the actor is otherwise allowed to see.',
        overridableRoles: PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.ASSETS_UPLOAD,
        label: 'Upload assets',
        description: 'Upload campaign assets. Audio uploads also require audio manage or the campaign contributor setting.',
        campaignFeatureHint: 'Session audio uploads also require Campaign Audio contributor settings.',
        overridableRoles: PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.ASSETS_DELETE_OWNED,
        label: 'Delete own assets',
        description: 'Delete assets the member uploaded.',
        overridableRoles: PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.ASSETS_DELETE_ANY,
        label: 'Delete any asset',
        description: 'Staff delete for campaign assets.',
        overridableRoles: NONE,
      },
    ],
  },
  {
    id: 'sessions',
    title: 'Sessions & Audio',
    scope:
      'Session notes and recordings. Playback and downloads share one read gate. Providers and quotas stay in Audio Settings.',
    rows: [
      {
        capability: CampaignCapabilities.NOTES_MODERATE,
        label: 'Manage session notes',
        description: 'Staff manage session notes. Authors may still edit their own notes without this grant.',
        overridableRoles: NONE,
      },
      {
        capability: CampaignCapabilities.AUDIO_MANAGE,
        label: 'Manage recordings',
        description: 'Recording metadata, deletion, and manager-level playback of restricted recordings.',
        globalFeature: 'audio',
        overridableRoles: NONE,
      },
      {
        capability: CampaignCapabilities.AUDIO_CHAPTERS_EDIT,
        label: 'Edit chapters',
        description: 'Edit recording chapters when the campaign allows chapter contributions.',
        globalFeature: 'audio',
        campaignFeatureHint: 'Also requires Campaign Audio chapter contributions to be enabled.',
        overridableRoles: PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.AUDIO_TRANSCRIPT_EDIT,
        label: 'Edit transcripts',
        description: 'Edit recording transcripts when the campaign allows transcript contributions.',
        globalFeature: 'audio',
        campaignFeatureHint: 'Also requires Campaign Audio transcript contributions to be enabled.',
        overridableRoles: PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.AUDIO_TRANSCRIPT_PUBLISH,
        label: 'Publish revisions',
        description: 'Publish transcript revisions.',
        globalFeature: 'audio',
        overridableRoles: PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.AUDIO_TRANSCRIBE,
        label: 'Request transcription',
        description: 'Request permitted transcription. Does nothing if no provider is configured.',
        globalFeature: 'audio',
        overridableRoles: PLAYER_OBSERVER,
      },
    ],
  },
  {
    id: 'discoveries',
    title: 'Discoveries',
    scope: 'Revelation of hidden narrative content. Linked records keep their own visibility.',
    rows: [
      {
        capability: CampaignCapabilities.DISCOVERY_REVEAL,
        label: 'Reveal discoveries',
        description: 'Reveal hidden or draft narrative presence.',
        overridableRoles: NONE,
      },
    ],
  },
  {
    id: 'integrations',
    title: 'Integrations & Safety',
    scope: 'Safety reports and reviewer access. Plugin hosts cannot bypass campaign or resource visibility.',
    rows: [
      {
        capability: CampaignCapabilities.SAFETY_SUBMIT,
        label: 'Submit safety concerns',
        description: 'Submit safety or privacy concerns for this campaign.',
        overridableRoles: PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.SAFETY_MANAGE,
        label: 'Manage safety reports',
        description: 'Review and manage safety reports. Also configurable from Safety reviewer grants.',
        overridableRoles: PLAYER_OBSERVER,
      },
    ],
  },
];

export function allMatrixCapabilities(): CampaignCapability[] {
  return MATRIX_SECTIONS.flatMap((section) =>
    section.rows.map((row) => row.capability),
  );
}
