import { CampaignCapabilities, type CampaignCapability } from './capabilities.js';
import { MembershipRoles, type MembershipRole } from './membershipRoles.js';

const GM_WRITER_STAFF_PAGE: readonly CampaignCapability[] = [
  CampaignCapabilities.PAGE_CREATE,
  CampaignCapabilities.PAGE_EDIT_OWNED,
  CampaignCapabilities.PAGE_EDIT_PARTY,
  CampaignCapabilities.PAGE_EDIT_ANY,
  CampaignCapabilities.PAGE_VISIBILITY_EDIT,
];

const GM_WRITER_DOMAIN: readonly CampaignCapability[] = [
  CampaignCapabilities.QUEST_EDIT,
  CampaignCapabilities.THREAD_EDIT,
  CampaignCapabilities.MAPS_EDIT,
  CampaignCapabilities.DOWNTIME_MANAGE,
  CampaignCapabilities.ADVENTURE_STORYBOARD_EDIT,
  CampaignCapabilities.ASSETS_UPLOAD,
  CampaignCapabilities.ASSETS_DELETE_ANY,
  CampaignCapabilities.ASSETS_DELETE_OWNED,
  CampaignCapabilities.ASSETS_VIEW,
  CampaignCapabilities.LEDGER_CONTRIBUTE,
];

const GM_WRITER_NARRATIVE_STAFF: readonly CampaignCapability[] = [
  CampaignCapabilities.CHRONOLOGY_EDIT,
  CampaignCapabilities.DISCOVERY_REVEAL,
  CampaignCapabilities.NARRATIVE_ELEVATED_VIEW,
  CampaignCapabilities.RUMOR_MODERATE,
  CampaignCapabilities.NOTES_MODERATE,
];

const GM_WRITER_OPERATIONAL: readonly CampaignCapability[] = [
  ...GM_WRITER_NARRATIVE_STAFF,
  ...GM_WRITER_STAFF_PAGE,
  ...GM_WRITER_DOMAIN,
];

const PARTICIPANT_COLLABORATIVE: readonly CampaignCapability[] = [
  CampaignCapabilities.PAGE_CREATE,
  CampaignCapabilities.PAGE_EDIT_OWNED,
  CampaignCapabilities.PAGE_EDIT_PARTY,
  CampaignCapabilities.ASSETS_UPLOAD,
  CampaignCapabilities.ASSETS_DELETE_OWNED,
  CampaignCapabilities.ASSETS_VIEW,
  CampaignCapabilities.LEDGER_CONTRIBUTE,
];

const PARTICIPANT_BASE: readonly CampaignCapability[] = [
  CampaignCapabilities.CAMPAIGN_VIEW,
  CampaignCapabilities.WIKI_VIEW_PARTY,
  ...PARTICIPANT_COLLABORATIVE,
];

const OBSERVER_BASE: readonly CampaignCapability[] = [
  CampaignCapabilities.CAMPAIGN_VIEW,
  CampaignCapabilities.WIKI_VIEW_PARTY,
  CampaignCapabilities.ASSETS_VIEW,
];

export type MemberCapabilityFlags = {
  chronologyContributor?: boolean;
  allowPlayerChronologyManagement?: boolean;
};

export function roleCapabilitiesFor(
  role: MembershipRole | null | undefined,
  flags: MemberCapabilityFlags = {},
): ReadonlySet<CampaignCapability> {
  const caps = new Set<CampaignCapability>();

  if (!role) return caps;

  switch (role) {
    case MembershipRoles.GAMEMASTER:
      caps.add(CampaignCapabilities.CAMPAIGN_VIEW);
      caps.add(CampaignCapabilities.CAMPAIGN_SETTINGS_EDIT);
      for (const c of GM_WRITER_OPERATIONAL) caps.add(c);
      break;
    case MembershipRoles.WRITER:
      caps.add(CampaignCapabilities.CAMPAIGN_VIEW);
      for (const c of GM_WRITER_OPERATIONAL) caps.add(c);
      break;
    case MembershipRoles.PARTICIPANT:
      for (const c of PARTICIPANT_BASE) caps.add(c);
      if (flags.allowPlayerChronologyManagement) {
        caps.add(CampaignCapabilities.CHRONOLOGY_EDIT);
      }
      break;
    case MembershipRoles.OBSERVER:
      for (const c of OBSERVER_BASE) caps.add(c);
      break;
    default:
      break;
  }

  return caps;
}

export const ROLE_GRANTS: Record<MembershipRole, readonly CampaignCapability[]> = {
  [MembershipRoles.GAMEMASTER]: [
    CampaignCapabilities.CAMPAIGN_VIEW,
    CampaignCapabilities.CAMPAIGN_SETTINGS_EDIT,
    ...GM_WRITER_OPERATIONAL,
  ],
  [MembershipRoles.WRITER]: [
    CampaignCapabilities.CAMPAIGN_VIEW,
    ...GM_WRITER_OPERATIONAL,
  ],
  [MembershipRoles.PARTICIPANT]: [...PARTICIPANT_BASE],
  [MembershipRoles.OBSERVER]: [...OBSERVER_BASE],
};
