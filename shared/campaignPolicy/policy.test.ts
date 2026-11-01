import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CampaignCapabilities } from './capabilities.js';
import { CampaignDiscoverability } from './discoverability.js';
import { MembershipRoles } from './membershipRoles.js';
import {
  buildCampaignActor,
  can,
  canAccessCampaignContainer,
  canEditPage,
  hasElevatedNarrativeView,
  resolveActorCapabilities,
} from './policy.js';
import { PageOwnerTypes } from './pageOwnership.js';
import {
  canChangeResourceVisibility,
  canViewVisibility,
  evaluateResourceAccess,
  normalizeVisibilityTier,
} from './resourceAccess.js';
import { MATRIX_SECTIONS, allMatrixCapabilities } from './matrixCatalog.js';

const campaignBase = {
  campaignOwnerUserId: 'owner-1',
  discoverability: CampaignDiscoverability.PRIVATE,
  allowPlayerChronologyManagement: true,
};

describe('campaign policy', () => {
  it('campaign owner with writer role evaluates as gamemaster plus transfer', () => {
    const actor = buildCampaignActor({
      kind: 'member',
      userId: 'owner-1',
      membershipRole: MembershipRoles.WRITER,
      ...campaignBase,
    });
    assert.equal(can(actor, CampaignCapabilities.CAMPAIGN_DELETE), true);
    assert.equal(can(actor, CampaignCapabilities.CAMPAIGN_SETTINGS_EDIT), true);
    assert.equal(can(actor, CampaignCapabilities.NARRATIVE_ELEVATED_VIEW), true);
    assert.equal(can(actor, CampaignCapabilities.CAMPAIGN_TRANSFER_OWNERSHIP), true);
  });

  it('owner as player has GM functional caps including elevated view', () => {
    const actor = buildCampaignActor({
      kind: 'member',
      userId: 'owner-1',
      membershipRole: MembershipRoles.PARTICIPANT,
      ...campaignBase,
    });
    assert.equal(can(actor, CampaignCapabilities.PAGE_EDIT_ANY), true);
    assert.equal(can(actor, CampaignCapabilities.CAMPAIGN_MANAGE_ROLES), true);
    assert.equal(hasElevatedNarrativeView(actor), true);
  });

  it('gamemaster without ownership has admin caps except transfer', () => {
    const actor = buildCampaignActor({
      kind: 'member',
      userId: 'gm-2',
      membershipRole: MembershipRoles.GAMEMASTER,
      ...campaignBase,
    });
    assert.equal(can(actor, CampaignCapabilities.CAMPAIGN_SETTINGS_EDIT), true);
    assert.equal(can(actor, CampaignCapabilities.CAMPAIGN_DELETE), true);
    assert.equal(can(actor, CampaignCapabilities.CAMPAIGN_VISIBILITY_EDIT), true);
    assert.equal(can(actor, CampaignCapabilities.CAMPAIGN_MANAGE_ROLES), true);
    assert.equal(can(actor, CampaignCapabilities.CAMPAIGN_TRANSFER_OWNERSHIP), false);
  });

  it('writer cannot administer or delete the campaign', () => {
    const actor = buildCampaignActor({
      kind: 'member',
      userId: 'w-1',
      membershipRole: MembershipRoles.WRITER,
      ...campaignBase,
    });
    assert.equal(can(actor, CampaignCapabilities.PAGE_EDIT_ANY), true);
    assert.equal(can(actor, CampaignCapabilities.CAMPAIGN_DELETE), false);
    assert.equal(can(actor, CampaignCapabilities.CAMPAIGN_MANAGE_ROLES), false);
    assert.equal(can(actor, CampaignCapabilities.CAMPAIGN_VISIBILITY_EDIT), false);
    assert.equal(can(actor, CampaignCapabilities.CAMPAIGN_SETTINGS_EDIT), false);
    assert.equal(can(actor, CampaignCapabilities.JOURNAL_PLANNER_ACCESS), true);
    assert.equal(can(actor, CampaignCapabilities.PAGE_CREATE), true);
    assert.equal(
      canEditPage(actor, {
        ownerType: PageOwnerTypes.USER,
        ownerUserId: 'other-user',
      }),
      true,
    );
  });

  it('participant chronology when campaign allows player management', () => {
    const actor = buildCampaignActor({
      kind: 'member',
      userId: 'p-1',
      membershipRole: MembershipRoles.PARTICIPANT,
      ...campaignBase,
    });
    assert.equal(can(actor, CampaignCapabilities.CHRONOLOGY_EDIT), true);
    const disabled = buildCampaignActor({
      kind: 'member',
      userId: 'p-2',
      membershipRole: MembershipRoles.PARTICIPANT,
      ...campaignBase,
      allowPlayerChronologyManagement: false,
    });
    assert.equal(can(disabled, CampaignCapabilities.CHRONOLOGY_EDIT), false);
  });

  it('anonymous private campaign has no access', () => {
    const actor = buildCampaignActor({
      kind: 'anonymous',
      ...campaignBase,
    });
    assert.equal(canAccessCampaignContainer(actor), false);
  });

  it('anonymous public campaign inherits observer reads', () => {
    const actor = buildCampaignActor({
      kind: 'anonymous',
      ...campaignBase,
      discoverability: CampaignDiscoverability.PUBLIC,
    });
    assert.equal(canAccessCampaignContainer(actor), true);
    assert.equal(can(actor, CampaignCapabilities.CAMPAIGN_VIEW), true);
    assert.equal(can(actor, CampaignCapabilities.WIKI_VIEW_PARTY), true);
    assert.equal(can(actor, CampaignCapabilities.ASSETS_VIEW), true);
    assert.equal(can(actor, CampaignCapabilities.PAGE_CREATE), false);
    assert.equal(can(actor, CampaignCapabilities.SAFETY_SUBMIT), false);
    assert.equal(can(actor, CampaignCapabilities.PAGE_EDIT_ANY), false);
  });

  it('anonymous public campaign honors observer wiki.view_party revoke', () => {
    const actor = buildCampaignActor({
      kind: 'anonymous',
      ...campaignBase,
      discoverability: CampaignDiscoverability.PUBLIC,
      roleCapabilityOverrides: [
        {
          role: MembershipRoles.OBSERVER,
          capability: CampaignCapabilities.WIKI_VIEW_PARTY,
          effect: 'REVOKE',
        },
      ],
    });
    assert.equal(can(actor, CampaignCapabilities.CAMPAIGN_VIEW), true);
    assert.equal(can(actor, CampaignCapabilities.WIKI_VIEW_PARTY), false);
    assert.equal(canViewVisibility(actor, 'Party'), false);
    assert.equal(canViewVisibility(actor, 'Public'), true);
  });

  it('legacy unlisted discoverability normalizes to private for anonymous', () => {
    const actor = buildCampaignActor({
      kind: 'anonymous',
      ...campaignBase,
      discoverability: 'unlisted',
    });
    assert.equal(canAccessCampaignContainer(actor), false);
  });

  it('unknown membership role grants nothing', () => {
    const actor = buildCampaignActor({
      kind: 'member',
      userId: 'x-1',
      membershipRole: 'NOT_A_ROLE',
      ...campaignBase,
    });
    assert.equal(actor.kind, 'member');
    if (actor.kind !== 'member') return;
    assert.equal(actor.membershipRole, null);
    assert.equal(can(actor, CampaignCapabilities.CAMPAIGN_VIEW), false);
    assert.equal(can(actor, CampaignCapabilities.WIKI_VIEW_PARTY), false);
    assert.equal(canAccessCampaignContainer(actor), false);
  });

  it('system admin is not consulted — player membership stays player', () => {
    const actor = buildCampaignActor({
      kind: 'member',
      userId: 'admin-player',
      membershipRole: MembershipRoles.PARTICIPANT,
      ...campaignBase,
    });
    assert.equal(hasElevatedNarrativeView(actor), false);
    assert.equal(canViewVisibility(actor, 'DM_Only'), false);
    assert.equal(canViewVisibility(actor, 'Party'), true);
  });

  it('elevated narrative view for gamemaster', () => {
    const actor = buildCampaignActor({
      kind: 'member',
      userId: 'gm-2',
      membershipRole: MembershipRoles.GAMEMASTER,
      ...campaignBase,
    });
    assert.equal(hasElevatedNarrativeView(actor), true);
  });

  it('participant can edit party-owned page with matching partyId', () => {
    const actor = buildCampaignActor({
      kind: 'member',
      userId: 'p-1',
      membershipRole: MembershipRoles.PARTICIPANT,
      partyId: 'party-1',
      ...campaignBase,
    });
    assert.equal(
      canEditPage(actor, {
        ownerType: PageOwnerTypes.PARTY,
        ownerPartyId: 'party-1',
      }),
      true,
    );
    assert.equal(
      canEditPage(actor, {
        ownerType: PageOwnerTypes.STAFF,
      }),
      false,
    );
  });

  it('revoked wiki.view_party hides party content for player', () => {
    const actor = buildCampaignActor({
      kind: 'member',
      userId: 'p-1',
      membershipRole: MembershipRoles.PARTICIPANT,
      ...campaignBase,
      roleCapabilityOverrides: [
        {
          role: MembershipRoles.PARTICIPANT,
          capability: CampaignCapabilities.WIKI_VIEW_PARTY,
          effect: 'REVOKE',
        },
      ],
    });
    assert.equal(canViewVisibility(actor, 'Party'), false);
    assert.equal(canViewVisibility(actor, 'Public'), true);
  });
});

describe('resource access', () => {
  it('normalizes visibility dialects and denies unknown', () => {
    assert.equal(normalizeVisibilityTier('Public'), 'public');
    assert.equal(normalizeVisibilityTier('PARTY'), 'campaign');
    assert.equal(normalizeVisibilityTier('DM_Only'), 'gmOnly');
    assert.equal(normalizeVisibilityTier('GM_ONLY'), 'gmOnly');
    assert.equal(normalizeVisibilityTier('staff'), 'gmOnly');
    assert.equal(normalizeVisibilityTier('campaign'), 'campaign');
    assert.equal(normalizeVisibilityTier('nope'), 'unknown');
    const player = buildCampaignActor({
      kind: 'member',
      userId: 'p-1',
      membershipRole: MembershipRoles.PARTICIPANT,
      ...campaignBase,
    });
    assert.equal(canViewVisibility(player, 'mystery'), false);
  });

  it('unrestricted resources follow live module defaults', () => {
    const player = buildCampaignActor({
      kind: 'member',
      userId: 'p-1',
      membershipRole: MembershipRoles.PARTICIPANT,
      ...campaignBase,
    });
    const open = evaluateResourceAccess(player, {
      module: 'wiki',
      visibility: 'Party',
      ownership: { ownerType: PageOwnerTypes.USER, ownerUserId: 'p-1' },
    });
    assert.equal(open.canView, true);
    assert.equal(open.canManage, true);
    assert.equal(open.canManageAccess, false);
  });

  it('explicit gm-only restriction survives player module defaults', () => {
    const player = buildCampaignActor({
      kind: 'member',
      userId: 'p-1',
      membershipRole: MembershipRoles.PARTICIPANT,
      ...campaignBase,
    });
    const hidden = evaluateResourceAccess(player, {
      module: 'wiki',
      visibility: 'DM_Only',
      ownership: { ownerType: PageOwnerTypes.USER, ownerUserId: 'p-1' },
    });
    assert.equal(hidden.canView, false);
    assert.equal(hidden.canManage, false);
  });

  it('player cannot change page visibility even when they can edit', () => {
    const player = buildCampaignActor({
      kind: 'member',
      userId: 'p-1',
      membershipRole: MembershipRoles.PARTICIPANT,
      ...campaignBase,
    });
    assert.equal(
      canChangeResourceVisibility(
        player,
        {
          module: 'wiki',
          visibility: 'Party',
          ownership: { ownerType: PageOwnerTypes.USER, ownerUserId: 'p-1' },
        },
        'Public',
      ),
      false,
    );
  });

  it('writer can change visibility on a page they can manage', () => {
    const writer = buildCampaignActor({
      kind: 'member',
      userId: 'w-1',
      membershipRole: MembershipRoles.WRITER,
      ...campaignBase,
    });
    assert.equal(
      canChangeResourceVisibility(
        writer,
        {
          module: 'wiki',
          visibility: 'Party',
          ownership: { ownerType: PageOwnerTypes.STAFF },
        },
        'DM_Only',
      ),
      true,
    );
  });

  it('quest edit does not view a restricted linked wiki page', () => {
    const writer = buildCampaignActor({
      kind: 'member',
      userId: 'w-1',
      membershipRole: MembershipRoles.WRITER,
      ...campaignBase,
    });
    const player = buildCampaignActor({
      kind: 'member',
      userId: 'p-1',
      membershipRole: MembershipRoles.PARTICIPANT,
      ...campaignBase,
    });
    assert.equal(
      evaluateResourceAccess(writer, { module: 'quest', visibility: 'Party' }).canManage,
      true,
    );
    assert.equal(canViewVisibility(player, 'DM_Only'), false);
    assert.equal(
      evaluateResourceAccess(player, { module: 'wiki', visibility: 'DM_Only' }).canView,
      false,
    );
  });

  it('page.create does not imply adventure or quest workspace access', () => {
    const player = buildCampaignActor({
      kind: 'member',
      userId: 'p-1',
      membershipRole: MembershipRoles.PARTICIPANT,
      ...campaignBase,
    });
    assert.equal(can(player, CampaignCapabilities.PAGE_CREATE), true);
    assert.equal(can(player, CampaignCapabilities.ADVENTURE_STORYBOARD_EDIT), false);
    assert.equal(can(player, CampaignCapabilities.QUEST_EDIT), false);
  });
});

describe('matrix catalog', () => {
  it('lists each capability once and groups adventure navigation together', () => {
    const caps = allMatrixCapabilities();
    assert.equal(new Set(caps).size, caps.length);
    assert.ok(MATRIX_SECTIONS.every((section) => section.scope.length > 0));
    const adventure = MATRIX_SECTIONS.find((section) => section.id === 'adventure');
    assert.ok(adventure);
    assert.deepEqual(
      adventure.rows.map((row) => row.capability),
      [
        CampaignCapabilities.ADVENTURE_STORYBOARD_EDIT,
        CampaignCapabilities.QUEST_EDIT,
        CampaignCapabilities.THREAD_EDIT,
      ],
    );
    const chronology = MATRIX_SECTIONS.find((section) => section.id === 'chronology');
    assert.ok(chronology);
    assert.match(chronology.scope, /Broader calendar permissions are planned/);
    const journals = MATRIX_SECTIONS.find((section) => section.id === 'journals');
    assert.ok(journals?.rows.some((row) => row.capability === CampaignCapabilities.JOURNAL_PLANNER_ACCESS));
    const sessions = MATRIX_SECTIONS.find((section) => section.id === 'sessions');
    assert.ok(sessions);
    assert.deepEqual(
      sessions.rows.map((row) => row.capability),
      [
        CampaignCapabilities.NOTES_MODERATE,
        CampaignCapabilities.AUDIO_MANAGE,
        CampaignCapabilities.AUDIO_UPLOAD,
        CampaignCapabilities.AUDIO_CHAPTERS_EDIT,
        CampaignCapabilities.AUDIO_TRANSCRIPT_EDIT,
        CampaignCapabilities.AUDIO_TRANSCRIPT_PUBLISH,
        CampaignCapabilities.AUDIO_TRANSCRIBE,
      ],
    );
  });
});
