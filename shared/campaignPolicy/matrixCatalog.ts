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
  campaignFeature?: 'audio-enabled' | 'audio-provider';
  /** When true, Edit-style grants imply Edit Own in UI help. */
  impliesEditOwn?: boolean;
};

export type MatrixSection = {
  id: MatrixSectionId;
  title: string;
  scope: string;
  rows: readonly MatrixRow[];
  coverage?: readonly MatrixCoverageNote[];
};

/** Non-owner roles that may receive or revoke ordinary capabilities. */
const WRITER_PLAYER_OBSERVER: readonly MembershipRole[] = [
  MembershipRoles.WRITER,
  MembershipRoles.PARTICIPANT,
  MembershipRoles.OBSERVER,
];
const WRITER_PLAYER: readonly MembershipRole[] = [
  MembershipRoles.WRITER,
  MembershipRoles.PARTICIPANT,
];
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
        description: 'Access this campaign and its permitted content.',
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
          explanation: 'Public campaign access is on Sharing & Invites.',
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
        overridableRoles: WRITER_PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.NARRATIVE_ELEVATED_VIEW,
        label: 'View GM-only content',
        description: 'See GM-only wiki, maps, and staff recordings.',
        help: {
          explanation:
            'Does not grant campaign administration. Visibility always takes precedence over edit.',
        },
        overridableRoles: WRITER_PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.PAGE_CREATE,
        label: 'Create pages',
        description: 'Create standalone wiki documents and journal library drafts.',
        overridableRoles: WRITER_PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.PAGE_EDIT_OWNED,
        label: 'Edit own',
        description:
          'Edit USER-owned wiki pages and character identity pages you own.',
        overridableRoles: WRITER_PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.PAGE_EDIT_PARTY,
        label: 'Edit party pages',
        description:
          'Edit PARTY-owned collaborative wiki pages for your party. Distinct from Edit own because party ownership is a separate ownership type.',
        overridableRoles: WRITER_PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.PAGE_EDIT_ANY,
        label: 'Edit',
        description:
          'Edit accessible wiki and character pages regardless of ownership. Includes Edit own.',
        help: {
          explanation:
            'Does not bypass GM-only visibility. Currently includes USER-owned journal pages; there is no private-journal capability.',
        },
        impliesEditOwn: true,
        overridableRoles: WRITER_PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.PAGE_VISIBILITY_EDIT,
        label: 'Manage page access',
        description: 'Change Public / Campaign / GM-only on a resource you can manage.',
        overridableRoles: WRITER_PLAYER_OBSERVER,
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
        overridableRoles: WRITER_PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.QUEST_EDIT,
        label: 'Edit quests',
        description: 'Create and manage native quest records.',
        overridableRoles: WRITER_PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.THREAD_EDIT,
        label: 'Edit threads',
        description: 'Create and manage narrative threads.',
        help: {
          docsKey: 'narrativeThreads',
          docsLabel: 'Narrative threads',
        },
        overridableRoles: WRITER_PLAYER_OBSERVER,
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
        note: 'Identity-page edits use the same ownership checks as standalone wiki pages (Edit own).',
      },
      {
        uses: CampaignCapabilities.PAGE_EDIT_ANY,
        note: 'Staff Edit grants edit regardless of character ownership without separate sheet permissions.',
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
        overridableRoles: WRITER_PLAYER_OBSERVER,
      },
    ],
    coverage: [
      {
        uses: CampaignCapabilities.PAGE_CREATE,
        note: 'Journal library drafts use Create pages, not a separate journal-author capability.',
      },
      {
        uses: CampaignCapabilities.PAGE_EDIT_OWNED,
        note: 'Editing your own journal drafts uses Edit own via page ownership.',
      },
    ],
  },
  {
    id: 'downtime',
    title: 'Downtime',
    scope:
      'Havens, projects, hirelings, and the ledger. Nested spaces, upgrades, and progress inherit the parent resource’s authorization.',
    rows: [
      {
        capability: CampaignCapabilities.DOWNTIME_DELETE_OWNED,
        label: 'Delete own downtime resources',
        description: 'Delete your USER-owned resources. Shared resources require Manage downtime.',
        overridableRoles: WRITER_PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.DOWNTIME_CREATE,
        label: 'Create downtime resources',
        description:
          'Create havens, projects, and hireling relationships. Does not grant Manage downtime.',
        overridableRoles: WRITER_PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.DOWNTIME_MANAGE,
        label: 'Manage downtime',
        description:
          'Administer any downtime resource, including other users’ personal havens/projects, ledger settings, and scheduled effects.',
        overridableRoles: WRITER_PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.LEDGER_CONTRIBUTE,
        label: 'Contribute to ledger',
        description: 'Add ledger entries.',
        help: {
          explanation: 'Linked haven or project pages still require their own view.',
        },
        overridableRoles: WRITER_PLAYER_OBSERVER,
      },
    ],
    coverage: [
      {
        uses: CampaignCapabilities.PAGE_EDIT_OWNED,
        note: 'Editing your USER-owned haven or project (spaces, upgrades, progress, hirelings on your characters) uses Edit own via linked wiki ownership.',
      },
      {
        uses: CampaignCapabilities.PAGE_EDIT_PARTY,
        note: 'Collaborating on PARTY-owned downtime pages uses Edit party pages.',
      },
      {
        uses: CampaignCapabilities.WIKI_VIEW_PARTY,
        note: 'Viewing downtime pages still requires campaign-tier or GM-only view for that page.',
      },
    ],
  },
  {
    id: 'chronology',
    title: 'Calendar & Chronology',
    scope:
      'Event contribution is separate from structural chronology management (eras, timelines, calendars).',
    rows: [
      {
        capability: CampaignCapabilities.CHRONOLOGY_EVENT_CREATE,
        label: 'Create events',
        description:
          'Create chronology events (birthdays, discoveries, shared history). Does not require Manage chronology.',
        overridableRoles: WRITER_PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.CHRONOLOGY_EVENT_EDIT_OWNED,
        label: 'Edit own events',
        description: 'Edit chronology events you created.',
        overridableRoles: WRITER_PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.CHRONOLOGY_EVENT_EDIT,
        label: 'Edit events',
        description: 'Edit accessible chronology events regardless of authorship. Includes Edit own events.',
        impliesEditOwn: true,
        overridableRoles: WRITER_PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.CHRONOLOGY_EVENT_DELETE_OWNED,
        label: 'Delete own events',
        description: 'Delete chronology events you created.',
        overridableRoles: WRITER_PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.CHRONOLOGY_ERA_CREATE,
        label: 'Create eras',
        description: 'Create eras without full chronology management.',
        overridableRoles: WRITER_PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.CHRONOLOGY_EDIT,
        label: 'Manage chronology',
        description:
          'Structural management: eras, timelines, calendar configuration, and staff event controls. Implies all event contribution capabilities.',
        chronologyFlag: true,
        observerUnavailable: true,
        help: {
          explanation:
            'The Player checkbox for this row is the legacy allowPlayerChronologyManagement campaign control. Prefer Create events for ordinary Player contributions. Legacy management flag is retained for compatibility and intended for eventual consolidation into this matrix.',
        },
        overridableRoles: WRITER_PLAYER,
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
        overridableRoles: WRITER_PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.ASSETS_VIEW,
        label: 'View assets',
        description: 'View campaign files the actor is otherwise allowed to see.',
        overridableRoles: WRITER_PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.ASSETS_UPLOAD,
        label: 'Upload assets',
        description: 'Upload campaign files.',
        overridableRoles: WRITER_PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.ASSETS_DELETE_OWNED,
        label: 'Delete own assets',
        description: 'Delete files you uploaded.',
        overridableRoles: WRITER_PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.ASSETS_DELETE_ANY,
        label: 'Delete any asset',
        description: 'Delete campaign files regardless of uploader. Includes Delete own assets.',
        impliesEditOwn: true,
        overridableRoles: WRITER_PLAYER_OBSERVER,
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
        description:
          'Staff-manage session notes. Authors can still edit their own notes without this grant.',
        overridableRoles: WRITER_PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.AUDIO_MANAGE,
        label: 'Manage recordings',
        description:
          'Recording metadata, deletion, and manager playback of restricted recordings.',
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
        overridableRoles: WRITER_PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.AUDIO_UPLOAD,
        label: 'Upload recordings',
        description: 'Create recordings and upload audio files.',
        globalFeature: 'audio',
        campaignFeature: 'audio-enabled',
        help: {
          explanation:
            'Instance and campaign recording enablement still apply. Managers can upload to any recording; other roles upload to recordings they created.',
        },
        dependency: {
          settingTab: 'audio',
          settingLabel: 'Campaign recordings',
          settingHash: 'campaign-audio',
        },
        overridableRoles: WRITER_PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.AUDIO_CHAPTERS_EDIT,
        label: 'Edit chapters',
        description: 'Edit recording chapters.',
        globalFeature: 'audio',
        overridableRoles: WRITER_PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.AUDIO_TRANSCRIPT_EDIT,
        label: 'Edit transcripts',
        description: 'Edit recording transcripts.',
        globalFeature: 'audio',
        overridableRoles: WRITER_PLAYER_OBSERVER,
      },
      {
        capability: CampaignCapabilities.AUDIO_TRANSCRIPT_PUBLISH,
        label: 'Publish revisions',
        description: 'Publish transcript revisions.',
        globalFeature: 'audio',
        overridableRoles: WRITER_PLAYER_OBSERVER,
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
        overridableRoles: WRITER_PLAYER_OBSERVER,
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
        overridableRoles: WRITER_PLAYER_OBSERVER,
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
        overridableRoles: WRITER_PLAYER_OBSERVER,
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
        overridableRoles: WRITER_PLAYER_OBSERVER,
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
        overridableRoles: WRITER_PLAYER_OBSERVER,
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

/** Capabilities that appear as editable cells for at least one non-GM role. */
export function overridableMatrixCapabilities(): CampaignCapability[] {
  const caps = new Set<CampaignCapability>();
  for (const section of MATRIX_SECTIONS) {
    for (const row of section.rows) {
      if (row.overridableRoles.length > 0) caps.add(row.capability);
    }
  }
  return [...caps];
}

export function matrixRowFor(
  capability: CampaignCapability,
): MatrixRow | null {
  for (const section of MATRIX_SECTIONS) {
    const row = section.rows.find((item) => item.capability === capability);
    if (row) return row;
  }
  return null;
}
