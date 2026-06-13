import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CampaignCapabilities } from './capabilities.js';
import { MembershipRoles } from './membershipRoles.js';
import {
  CapabilityOverrideEffect,
  normalizeCapabilityOverrides,
  resolveRoleCapability,
} from './capabilityOverrides.js';

const COLLAB_ROLES = [
  MembershipRoles.PARTICIPANT,
  MembershipRoles.OBSERVER,
] as const;

const COLLAB_CAPS = [
  CampaignCapabilities.PAGE_CREATE,
  CampaignCapabilities.PAGE_EDIT_OWNED,
  CampaignCapabilities.PAGE_EDIT_PARTY,
  CampaignCapabilities.QUEST_EDIT,
  CampaignCapabilities.THREAD_EDIT,
  CampaignCapabilities.ASSETS_UPLOAD,
  CampaignCapabilities.CHRONOLOGY_EDIT,
] as const;

describe('resolveRoleCapability', () => {
  it('participant defaults include collaborative page and asset caps', () => {
    const flags = { allowPlayerChronologyManagement: false };
    assert.equal(
      resolveRoleCapability(
        MembershipRoles.PARTICIPANT,
        CampaignCapabilities.PAGE_CREATE,
        [],
        flags,
      ),
      true,
    );
    assert.equal(
      resolveRoleCapability(
        MembershipRoles.PARTICIPANT,
        CampaignCapabilities.ASSETS_UPLOAD,
        [],
        flags,
      ),
      true,
    );
    assert.equal(
      resolveRoleCapability(
        MembershipRoles.PARTICIPANT,
        CampaignCapabilities.QUEST_EDIT,
        [],
        flags,
      ),
      false,
    );
    assert.equal(
      resolveRoleCapability(
        MembershipRoles.PARTICIPANT,
        CampaignCapabilities.CHRONOLOGY_EDIT,
        [],
        flags,
      ),
      false,
    );
  });

  it('participant chronology when campaign flag enabled', () => {
    assert.equal(
      resolveRoleCapability(
        MembershipRoles.PARTICIPANT,
        CampaignCapabilities.CHRONOLOGY_EDIT,
        [],
        { allowPlayerChronologyManagement: true },
      ),
      true,
    );
  });

  it('revoke removes a default capability', () => {
    assert.equal(
      resolveRoleCapability(
        MembershipRoles.PARTICIPANT,
        CampaignCapabilities.PAGE_CREATE,
        [
          {
            role: MembershipRoles.PARTICIPANT,
            capability: CampaignCapabilities.PAGE_CREATE,
            effect: CapabilityOverrideEffect.REVOKE,
          },
        ],
        { allowPlayerChronologyManagement: false },
      ),
      false,
    );
  });

  it('grant adds a non-default capability', () => {
    assert.equal(
      resolveRoleCapability(
        MembershipRoles.PARTICIPANT,
        CampaignCapabilities.QUEST_EDIT,
        [
          {
            role: MembershipRoles.PARTICIPANT,
            capability: CampaignCapabilities.QUEST_EDIT,
            effect: CapabilityOverrideEffect.GRANT,
          },
        ],
        { allowPlayerChronologyManagement: false },
      ),
      true,
    );
  });

  it('observer defaults deny collaborative caps', () => {
    assert.equal(
      resolveRoleCapability(
        MembershipRoles.OBSERVER,
        CampaignCapabilities.PAGE_CREATE,
        [],
        { allowPlayerChronologyManagement: false },
      ),
      false,
    );
  });
});

describe('normalizeCapabilityOverrides', () => {
  it('strips redundant grant and revoke rows', () => {
    const flags = { allowPlayerChronologyManagement: false };
    const normalized = normalizeCapabilityOverrides(
      [
        {
          role: MembershipRoles.PARTICIPANT,
          capability: CampaignCapabilities.PAGE_CREATE,
          effect: CapabilityOverrideEffect.GRANT,
        },
        {
          role: MembershipRoles.PARTICIPANT,
          capability: CampaignCapabilities.QUEST_EDIT,
          effect: CapabilityOverrideEffect.REVOKE,
        },
        {
          role: MembershipRoles.PARTICIPANT,
          capability: CampaignCapabilities.QUEST_EDIT,
          effect: CapabilityOverrideEffect.GRANT,
        },
      ],
      flags,
      COLLAB_ROLES,
      COLLAB_CAPS,
    );
    assert.deepEqual(normalized, [
      {
        role: MembershipRoles.PARTICIPANT,
        capability: CampaignCapabilities.QUEST_EDIT,
        effect: CapabilityOverrideEffect.GRANT,
      },
    ]);
  });
});
