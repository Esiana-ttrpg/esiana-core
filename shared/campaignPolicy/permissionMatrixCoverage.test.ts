import { evaluateResourceAccess } from './resourceAccess.js';
/**
 * PERMISSION_MATRIX_COVERAGE — living inventory for #460.
 * Asserts catalog completeness and documents page.edit_* / chronology semantics.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_CAMPAIGN_CAPABILITIES,
  CampaignCapabilities,
  CHRONOLOGY_CONTRIBUTION_CAPABILITIES,
} from './capabilities.js';
import { NON_OVERRIDABLE_CAPABILITIES } from './capabilityOverrides.js';
import { MembershipRoles } from './membershipRoles.js';
import {
  MATRIX_SECTIONS,
  allMatrixCapabilities,
  matrixRowFor,
  overridableMatrixCapabilities,
} from './matrixCatalog.js';
import {
  buildCampaignActor,
  can,
  canCreateChronologyEvent,
  canDeleteChronologyEvent,
  canEditChronologyEvent,
  canEditPage,
  canManageChronology,
} from './policy.js';
import { PageOwnerTypes } from './pageOwnership.js';
import { ROLE_GRANTS, roleCapabilitiesFor } from './roleGrants.js';
import { CampaignDiscoverability } from './discoverability.js';

const campaignBase = {
  campaignOwnerUserId: 'owner-1',
  discoverability: CampaignDiscoverability.PRIVATE,
  allowPlayerChronologyManagement: false,
};

/** Caps intentionally omitted from the Collaboration matrix UI. */
const MATRIX_EXCLUDED = new Set<string>([
  CampaignCapabilities.CAMPAIGN_TRANSFER_OWNERSHIP,
  CampaignCapabilities.BILLING_MANAGE,
  CampaignCapabilities.CODEX_VIEW_PUBLIC,
]);

describe('PERMISSION_MATRIX_COVERAGE', () => {
  it('every matrix capability is registered and unique', () => {
    const listed = allMatrixCapabilities();
    assert.equal(new Set(listed).size, listed.length);
    for (const cap of listed) {
      assert.ok(
        (ALL_CAMPAIGN_CAPABILITIES as readonly string[]).includes(cap),
        `unknown matrix capability ${cap}`,
      );
    }
  });

  it('registered capabilities appear in matrix or explicit exclusion set', () => {
    const listed = new Set(allMatrixCapabilities());
    for (const cap of ALL_CAMPAIGN_CAPABILITIES) {
      if (MATRIX_EXCLUDED.has(cap)) continue;
      assert.ok(listed.has(cap), `capability ${cap} missing from matrix`);
    }
  });

  it('non-overridable owner caps stay locked in the matrix', () => {
    for (const cap of NON_OVERRIDABLE_CAPABILITIES) {
      if (MATRIX_EXCLUDED.has(cap)) continue;
      const row = matrixRowFor(cap);
      if (!row) continue;
      assert.deepEqual(row.overridableRoles, []);
    }
  });

  it('Writer, Player, and Observer can override ordinary creative caps', () => {
    const creative = [
      CampaignCapabilities.PAGE_CREATE,
      CampaignCapabilities.PAGE_EDIT_OWNED,
      CampaignCapabilities.MAPS_EDIT,
      CampaignCapabilities.JOURNAL_PLANNER_ACCESS,
      CampaignCapabilities.CHRONOLOGY_EVENT_CREATE,
      CampaignCapabilities.NOTES_MODERATE,
    ];
    for (const cap of creative) {
      const row = matrixRowFor(cap);
      assert.ok(row, cap);
      assert.ok(row!.overridableRoles.includes(MembershipRoles.WRITER), cap);
      assert.ok(row!.overridableRoles.includes(MembershipRoles.PARTICIPANT), cap);
      assert.ok(row!.overridableRoles.includes(MembershipRoles.OBSERVER), cap);
    }
  });

  it('page.edit_owned / party / any semantics stay ownership-distinct', () => {
    const player = buildCampaignActor({
      kind: 'member',
      userId: 'p-1',
      membershipRole: MembershipRoles.PARTICIPANT,
      partyId: 'party-1',
      ...campaignBase,
    });
    assert.equal(
      canEditPage(player, {
        ownerType: PageOwnerTypes.USER,
        ownerUserId: 'p-1',
      }),
      true,
    );
    assert.equal(
      canEditPage(player, {
        ownerType: PageOwnerTypes.USER,
        ownerUserId: 'other',
      }),
      false,
    );
    assert.equal(
      canEditPage(player, {
        ownerType: PageOwnerTypes.PARTY,
        ownerPartyId: 'party-1',
      }),
      true,
    );
    assert.equal(
      canEditPage(player, {
        ownerType: PageOwnerTypes.PARTY,
        ownerPartyId: 'other-party',
      }),
      false,
    );
    assert.equal(
      canEditPage(player, { ownerType: PageOwnerTypes.STAFF }),
      false,
    );

    const withEdit = buildCampaignActor({
      kind: 'member',
      userId: 'p-2',
      membershipRole: MembershipRoles.PARTICIPANT,
      partyId: 'party-1',
      ...campaignBase,
      roleCapabilityOverrides: [
        {
          role: MembershipRoles.PARTICIPANT,
          capability: CampaignCapabilities.PAGE_EDIT_ANY,
          effect: 'GRANT',
        },
      ],
    });
    assert.equal(
      canEditPage(withEdit, {
        ownerType: PageOwnerTypes.USER,
        ownerUserId: 'other',
      }),
      true,
    );
    assert.equal(
      canEditPage(withEdit, { ownerType: PageOwnerTypes.STAFF }),
      true,
    );
  });

  it('Edit does not bypass GM-only visibility', () => {
    const player = buildCampaignActor({
      kind: 'member',
      userId: 'p-1',
      membershipRole: MembershipRoles.PARTICIPANT,
      ...campaignBase,
      roleCapabilityOverrides: [
        {
          role: MembershipRoles.PARTICIPANT,
          capability: CampaignCapabilities.PAGE_EDIT_ANY,
          effect: 'GRANT',
        },
      ],
    });
    assert.equal(can(player, CampaignCapabilities.PAGE_EDIT_ANY), true);
    assert.equal(can(player, CampaignCapabilities.NARRATIVE_ELEVATED_VIEW), false);
    const access = evaluateResourceAccess(player, { module: 'wiki', visibility: 'DM_Only',
      ownership: { ownerType: PageOwnerTypes.USER, ownerUserId: 'other' } });
    assert.equal(access.canView, false);
    assert.equal(access.canManage, false);
  });

  it('players create events without chronology management by default', () => {
    const player = buildCampaignActor({
      kind: 'member',
      userId: 'p-1',
      membershipRole: MembershipRoles.PARTICIPANT,
      ...campaignBase,
    });
    assert.equal(canManageChronology(player), false);
    assert.equal(canCreateChronologyEvent(player), true);
    assert.equal(canEditChronologyEvent(player, 'p-1'), true);
    assert.equal(canEditChronologyEvent(player, 'other'), false);
    assert.equal(canDeleteChronologyEvent(player, 'p-1'), true);
    assert.equal(can(player, CampaignCapabilities.CHRONOLOGY_ERA_CREATE), false);
  });

  it('legacy allowPlayerChronologyManagement still grants manage + contribution', () => {
    const player = buildCampaignActor({
      kind: 'member',
      userId: 'p-1',
      membershipRole: MembershipRoles.PARTICIPANT,
      ...campaignBase,
      allowPlayerChronologyManagement: true,
    });
    assert.equal(canManageChronology(player), true);
    assert.equal(canCreateChronologyEvent(player), true);
    assert.equal(can(player, CampaignCapabilities.CHRONOLOGY_ERA_CREATE), true);
    assert.equal(canEditChronologyEvent(player, 'other'), true);
  });

  it('chronology.edit implies contribution capabilities', () => {
    const writer = buildCampaignActor({
      kind: 'member',
      userId: 'w-1',
      membershipRole: MembershipRoles.WRITER,
      ...campaignBase,
    });
    for (const cap of CHRONOLOGY_CONTRIBUTION_CAPABILITIES) {
      assert.equal(can(writer, cap), true, cap);
    }
    const player = buildCampaignActor({ kind: 'member', userId: 'p-1', membershipRole: MembershipRoles.PARTICIPANT,
      ...campaignBase, allowPlayerChronologyManagement: false,
      roleCapabilityOverrides: [{ role: MembershipRoles.PARTICIPANT, capability: CampaignCapabilities.CHRONOLOGY_EDIT, effect: 'GRANT' }] });
    for (const cap of CHRONOLOGY_CONTRIBUTION_CAPABILITIES) assert.equal(can(player, cap), true, cap);
  });

  it('chronology management respects explicit contribution revocations', () => {
    for (const role of [MembershipRoles.WRITER, MembershipRoles.PARTICIPANT]) {
      const actor = buildCampaignActor({ kind: 'member', userId: 'p-1', membershipRole: role, ...campaignBase,
        allowPlayerChronologyManagement: false,
        roleCapabilityOverrides: [
          { role, capability: CampaignCapabilities.CHRONOLOGY_EDIT, effect: 'GRANT' },
          { role, capability: CampaignCapabilities.CHRONOLOGY_EVENT_CREATE, effect: 'REVOKE' },
        ] });
      assert.equal(canManageChronology(actor), true);
      assert.equal(canCreateChronologyEvent(actor), false);
      assert.equal(can(actor, CampaignCapabilities.CHRONOLOGY_ERA_CREATE), true);
    }
  });

  it('event Edit alone never grants Delete for other creators', () => {
    const actor = buildCampaignActor({ kind: 'member', userId: 'p-1', membershipRole: MembershipRoles.PARTICIPANT, ...campaignBase,
      roleCapabilityOverrides: [{ role: MembershipRoles.PARTICIPANT, capability: CampaignCapabilities.CHRONOLOGY_EVENT_EDIT, effect: 'GRANT' }] });
    assert.equal(canEditChronologyEvent(actor, 'other'), true);
    assert.equal(canDeleteChronologyEvent(actor, 'other'), false);
    assert.equal(canDeleteChronologyEvent(actor, 'p-1'), true);
  });

  it('overridableMatrixCapabilities excludes owner-locked rows', () => {
    const overridable = new Set(overridableMatrixCapabilities());
    assert.equal(overridable.has(CampaignCapabilities.CAMPAIGN_DELETE), false);
    assert.equal(overridable.has(CampaignCapabilities.CAMPAIGN_MANAGE_ROLES), false);
    assert.ok(overridable.has(CampaignCapabilities.CHRONOLOGY_EVENT_CREATE));
    assert.ok(overridable.has(CampaignCapabilities.MAPS_EDIT));
  });

  it('role defaults favor cooperative storytelling for players', () => {
    const caps = roleCapabilitiesFor(MembershipRoles.PARTICIPANT);
    assert.ok(caps.has(CampaignCapabilities.PAGE_CREATE));
    assert.ok(caps.has(CampaignCapabilities.PAGE_EDIT_OWNED));
    assert.ok(caps.has(CampaignCapabilities.PAGE_EDIT_PARTY));
    assert.ok(caps.has(CampaignCapabilities.CHRONOLOGY_EVENT_CREATE));
    assert.equal(caps.has(CampaignCapabilities.PAGE_EDIT_ANY), false);
    assert.equal(caps.has(CampaignCapabilities.NARRATIVE_ELEVATED_VIEW), false);
    assert.equal(caps.has(CampaignCapabilities.CHRONOLOGY_EDIT), false);
  });

  it('matrix chronology section documents contribution vs management', () => {
    const section = MATRIX_SECTIONS.find((s) => s.id === 'chronology');
    assert.ok(section);
    assert.ok(
      section!.rows.some(
        (r) => r.capability === CampaignCapabilities.CHRONOLOGY_EVENT_CREATE,
      ),
    );
    assert.ok(
      section!.rows.some(
        (r) => r.capability === CampaignCapabilities.CHRONOLOGY_EDIT,
      ),
    );
    const manage = matrixRowFor(CampaignCapabilities.CHRONOLOGY_EDIT);
    assert.equal(manage?.chronologyFlag, true);
    assert.match(manage?.help?.explanation ?? '', /legacy/i);
  });

  it('ROLE_GRANTS stay aligned with roleCapabilitiesFor empty flags', () => {
    for (const role of Object.values(MembershipRoles)) {
      const fromFn = roleCapabilitiesFor(role);
      const fromTable = new Set(ROLE_GRANTS[role]);
      assert.deepEqual([...fromFn].sort(), [...fromTable].sort(), role);
    }
  });
});

/**
 * Prioritized hardcoded-role fix list (consumed by Pass 2–3):
 * 1. calendarEventsController canManageChronology(role, flag) without ACL context
 * 2. canViewWikiPage(visibility, roleString) skipping overrides
 * 3. buildNarrativeViewerCapabilities role+flag only
 * 4. MapViewerPage / maps hubs GM||WRITER vs MAPS_EDIT
 * 5. ChronologyPage gating create on CHRONOLOGY_EDIT
 * 6. Character overview/trajectory isDMUser vs page canEdit
 */
