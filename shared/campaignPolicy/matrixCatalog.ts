import { CampaignCapabilities, type CampaignCapability } from './capabilities.js';
import { MembershipRoles, type MembershipRole } from './membershipRoles.js';

export type MatrixSectionId =
  | 'campaign'
  | 'wiki'
  | 'adventure'
  | 'characters'
  | 'journals'
  | 'downtime'
  | 'chronology'
  | 'maps'
  | 'sessions'
  | 'discoveries'
  | 'worldbuilding'
  | 'integrations';

/** Published docs routes from `frontend/src/lib/docsLinks.ts`. Do not invent keys. */
export type MatrixDocsKey =
  | 'sessionRecordingsPrivacy'
  | 'discoveryRevelation'
  | 'mapsCartography'
  | 'narrativeThreads';

/** Campaign Settings tabs that actually host a required control. */
export type MatrixSettingsTab = 'audio' | 'safety-privacy';

export type MatrixHelp = {
  explanation?: string;
  docsKey?: MatrixDocsKey;
  docsLabel?: string;
};

export type MatrixDependency = {
  requiredCapability?: CampaignCapability;
  settingTab?: MatrixSettingsTab;
  settingLabel?: string;
  settingHash?: string;
};

export type MatrixCoverageNote = {
  uses: CampaignCapability;
  note: string;
};

export type MatrixRow = {
  capability: CampaignCapability;
  label: string;
  description: string;
  overridableRoles: readonly MembershipRole[];
  chronologyFlag?: boolean;
  observerUnavailable?: boolean;
  globalFeature?: 'audio';
  help?: MatrixHelp;
  dependency?: MatrixDependency;
  campaignFeature?: 'audio-contributors' | 'audio-chapters' | 'audio-transcripts' | 'audio-provider';
};

export type MatrixSection = {
  id: MatrixSectionId;
  title: string;
  scope: string;
  rows: readonly MatrixRow[];
  coverage?: readonly MatrixCoverageNote[];
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
    scope: 'Who can open, configure, and administer this campaign.',
    rows: [
      {
        capability: CampaignCapabilities.CAMPAIGN_VIEW,
        label: 'View campaign',
        description: 'Open the campaign workspace when invited.',
        help: {
          explanation:
            'Anonymous visitors also need both public-access gates. Public campaign access is the toggle above this matrix.',
        },
        overridableRoles: NONE,
      },
      {
        capability: CampaignCapabilities.CAMPAIGN_MANAGE_ROLES,
        label: 'Manage members and permissions',
        description: 'Invite members, change roles, and save this matrix.',
        overridableRoles: NONE,
      },
      {
        capability: CampaignCapabilities.CAMPAIGN_SETTINGS_EDIT,
        label: 'Edit campaign settings',
        description: 'Change theme, sidebar, scheduling, and module settings.',
        overridableRoles: NONE,
      },
      {
        capability: CampaignCapabilities.CAMPAIGN_VISIBILITY_EDIT,
        label: 'Change campaign visibility',
        description: 'Decide whether this campaign allows public Observer reads.',
        help: {
          explanation: 'Public campaign access is the toggle above this matrix.',
        },
        overridableRoles: NONE,
      },
      {
        capability: CampaignCapabilities.CAMPAIGN_DELETE,
        label: 'Delete campaign',
        description: 'Permanently delete this campaign.',
        overridableRoles: NONE,
      },
    ],
  },
  {
    id: 'wiki',
    title: 'Wiki & Pages',
    scope: 'Standalone wiki documents and the shared visibility used by other modules.',
    rows: [
      {
        capability: CampaignCapabilities.WIKI_VIEW_PARTY,
        label: 'View campaign-tier content',
        description:
          'See Campaign-tier wiki, maps, chronology, and assets that check party visibility.',
        overridableRoles: PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.NARRATIVE_ELEVATED_VIEW,
        label: 'View GM-only content',
        description: 'See GM-only wiki, maps, and staff recordings.',
        help: {
          explanation: 'Does not grant campaign administration.',
        },
        overridableRoles: NONE,
      },
      {
        capability: CampaignCapabilities.PAGE_CREATE,
        label: 'Create pages',
        description: 'Create standalone wiki documents and journal library drafts.',
        overridableRoles: PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.PAGE_EDIT_OWNED,
        label: 'Edit own pages',
        description: 'Edit USER-owned wiki pages and character identity pages you own.',
        overridableRoles: PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.PAGE_EDIT_PARTY,
        label: 'Edit party pages',
        description: 'Edit PARTY-owned wiki pages for your party.',
        overridableRoles: PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.PAGE_EDIT_ANY,
        label: 'Edit any page',
        description: 'Staff edit for standalone wiki and character bodies that use page ownership.',
        help: {
          explanation:
            'This staff grant currently includes USER-owned journal pages. There is no private-journal capability.',
        },
        overridableRoles: NONE,
      },
      {
        capability: CampaignCapabilities.PAGE_VISIBILITY_EDIT,
        label: 'Manage page access',
        description: 'Change Public / Campaign / GM-only on a resource you can manage.',
        overridableRoles: NONE,
      },
    ],
  },
  {
    id: 'adventure',
    title: 'Adventure',
    scope: 'Adventure Board, quests, and threads from the campaign Play navigation.',
    rows: [
      {
        capability: CampaignCapabilities.ADVENTURE_STORYBOARD_EDIT,
        label: 'Manage storyboard',
        description: 'Edit Adventure Board layout.',
        overridableRoles: NONE,
      },
      {
        capability: CampaignCapabilities.QUEST_EDIT,
        label: 'Edit quests',
        description: 'Create and manage native quest records.',
        overridableRoles: PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.THREAD_EDIT,
        label: 'Edit threads',
        description: 'Create and manage narrative threads.',
        help: {
          docsKey: 'narrativeThreads',
          docsLabel: 'Narrative threads',
        },
        overridableRoles: PLAYER_OBSERVER,
      },
    ],
  },
  {
    id: 'characters',
    title: 'Characters & Party',
    scope: 'Character and party workspaces reuse the shared wiki and page capabilities.',
    rows: [],
    coverage: [
      {
        uses: CampaignCapabilities.WIKI_VIEW_PARTY,
        note: 'Opening a character or party page still requires campaign-tier or GM-only view for that page.',
      },
      {
        uses: CampaignCapabilities.PAGE_EDIT_OWNED,
        note: 'Identity-page edits use the same ownership checks as standalone wiki pages.',
      },
    ],
  },
  {
    id: 'journals',
    title: 'Journals',
    scope: 'Campaign publications and the Journal Planner.',
    rows: [
      {
        capability: CampaignCapabilities.JOURNAL_PLANNER_ACCESS,
        label: 'Manage journal planner',
        description: 'Create series, schedule releases, and orchestrate planned publications.',
        overridableRoles: NONE,
      },
    ],
    coverage: [
      {
        uses: CampaignCapabilities.PAGE_CREATE,
        note: 'Journal library drafts use Create pages, not a separate journal-author capability.',
      },
      {
        uses: CampaignCapabilities.PAGE_EDIT_ANY,
        note: 'Staff Edit any page currently includes USER-owned journal pages. There is no private-journal capability.',
      },
    ],
  },
  {
    id: 'downtime',
    title: 'Downtime',
    scope: 'Projects, havens, and the shared campaign ledger.',
    rows: [
      {
        capability: CampaignCapabilities.DOWNTIME_MANAGE,
        label: 'Manage downtime',
        description: 'Create and manage downtime projects and havens.',
        overridableRoles: NONE,
      },
      {
        capability: CampaignCapabilities.LEDGER_CONTRIBUTE,
        label: 'Contribute to ledger',
        description: 'Add ledger entries.',
        help: {
          explanation: 'Linked haven or project pages still require their own view.',
        },
        overridableRoles: PLAYER_OBSERVER,
      },
    ],
  },
  {
    id: 'chronology',
    title: 'Calendar & Chronology',
    scope:
      'Current controls cover chronology events and eras. Broader calendar permissions are planned.',
    rows: [
      {
        capability: CampaignCapabilities.CHRONOLOGY_EDIT,
        label: 'Manage chronology',
        description: 'Create, edit, and delete chronology events and eras.',
        chronologyFlag: true,
        observerUnavailable: true,
        help: {
          explanation:
            'The Player grant on this row is the campaign control. Broader calendar permissions are planned.',
        },
        overridableRoles: PLAYER_ONLY,
      },
    ],
  },
  {
    id: 'maps',
    title: 'Maps & Assets',
    scope: 'Map workspace and campaign files from the World navigation.',
    rows: [
      {
        capability: CampaignCapabilities.MAPS_EDIT,
        label: 'Edit maps',
        description: 'Edit layers, markers, and the map workspace.',
        help: {
          docsKey: 'mapsCartography',
          docsLabel: 'Maps and cartography',
        },
        overridableRoles: NONE,
      },
      {
        capability: CampaignCapabilities.ASSETS_VIEW,
        label: 'View assets',
        description: 'View campaign files the actor is otherwise allowed to see.',
        overridableRoles: PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.ASSETS_UPLOAD,
        label: 'Upload assets',
        description: 'Upload campaign files.',
        campaignFeature: 'audio-contributors',
        dependency: {
          settingTab: 'audio',
          settingLabel: 'Contributor uploads',
          settingHash: 'allowContributors',
        },
        overridableRoles: PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.ASSETS_DELETE_OWNED,
        label: 'Delete own assets',
        description: 'Delete files you uploaded.',
        overridableRoles: PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.ASSETS_DELETE_ANY,
        label: 'Delete any asset',
        description: 'Staff delete for campaign files.',
        overridableRoles: NONE,
      },
    ],
  },
  {
    id: 'sessions',
    title: 'Sessions & Audio',
    scope: 'Session notes and recordings from the Play navigation.',
    rows: [
      {
        capability: CampaignCapabilities.NOTES_MODERATE,
        label: 'Manage session notes',
        description: 'Staff-manage session notes. Authors can still edit their own notes.',
        overridableRoles: NONE,
      },
      {
        capability: CampaignCapabilities.AUDIO_MANAGE,
        label: 'Manage recordings',
        description: 'Recording metadata, deletion, and manager playback of restricted recordings.',
        globalFeature: 'audio',
        help: {
          docsKey: 'sessionRecordingsPrivacy',
          docsLabel: 'Session recordings privacy',
        },
        dependency: {
          settingTab: 'audio',
          settingLabel: 'Campaign Audio',
          settingHash: 'campaign-audio',
        },
        overridableRoles: NONE,
      },
      {
        capability: CampaignCapabilities.AUDIO_CHAPTERS_EDIT,
        label: 'Edit chapters',
        description: 'Edit recording chapters.',
        globalFeature: 'audio',
        campaignFeature: 'audio-chapters',
        dependency: {
          settingTab: 'audio',
          settingLabel: 'Chapter contributions',
          settingHash: 'allowChapters',
        },
        overridableRoles: PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.AUDIO_TRANSCRIPT_EDIT,
        label: 'Edit transcripts',
        description: 'Edit recording transcripts.',
        globalFeature: 'audio',
        campaignFeature: 'audio-transcripts',
        dependency: {
          settingTab: 'audio',
          settingLabel: 'Transcript contributions',
          settingHash: 'allowTranscripts',
        },
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
        description: 'Request permitted transcription.',
        globalFeature: 'audio',
        help: {
          docsKey: 'sessionRecordingsPrivacy',
          docsLabel: 'Session recordings privacy',
        },
        campaignFeature: 'audio-provider',
        dependency: {
          settingTab: 'audio',
          settingLabel: 'Transcription provider',
          settingHash: 'transcription-provider',
        },
        overridableRoles: PLAYER_OBSERVER,
      },
    ],
  },
  {
    id: 'discoveries',
    title: 'Discoveries',
    scope: 'Revelation of hidden narrative content.',
    rows: [
      {
        capability: CampaignCapabilities.DISCOVERY_REVEAL,
        label: 'Reveal discoveries',
        description: 'Reveal hidden or draft narrative presence.',
        help: {
          docsKey: 'discoveryRevelation',
          docsLabel: 'Discovery and revelation',
        },
        overridableRoles: NONE,
      },
    ],
  },
  {
    id: 'worldbuilding',
    title: 'Worldbuilding',
    scope: 'Locations, organizations, and related World modules use Wiki & Pages.',
    rows: [
      {
        capability: CampaignCapabilities.RUMOR_MODERATE,
        label: 'Moderate rumors',
        description: 'Staff-moderate rumor records.',
        overridableRoles: NONE,
      },
    ],
    coverage: [
      {
        uses: CampaignCapabilities.WIKI_VIEW_PARTY,
        note: 'Locations, organizations, bestiary, families, objects, ancestries, and similar lore pages use View campaign-tier content.',
      },
      {
        uses: CampaignCapabilities.PAGE_CREATE,
        note: 'Creating those lore pages uses Create pages. Progression, Relations, and Visual Atlas have no separate capability.',
      },
    ],
  },
  {
    id: 'integrations',
    title: 'Integrations & Safety',
    scope: 'Safety reports. Plugins cannot bypass campaign or resource visibility.',
    rows: [
      {
        capability: CampaignCapabilities.SAFETY_SUBMIT,
        label: 'Submit safety concerns',
        description: 'Submit a safety or privacy concern for this campaign.',
        overridableRoles: PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.SAFETY_MANAGE,
        label: 'Manage safety reports',
        description: 'Review and manage safety reports.',
        dependency: {
          settingTab: 'safety-privacy',
          settingLabel: 'Safety reviewer grants',
          settingHash: 'safety-reviewer-grants',
        },
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

export function matrixCapabilityLabel(capability: CampaignCapability): string | null {
  for (const section of MATRIX_SECTIONS) {
    const row = section.rows.find((item) => item.capability === capability);
    if (row) return row.label;
  }
  return null;
}
