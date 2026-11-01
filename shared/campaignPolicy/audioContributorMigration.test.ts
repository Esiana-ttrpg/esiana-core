import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CampaignCapabilities } from './capabilities.ts';
import { CapabilityOverrideEffect } from './capabilityOverrides.ts';
import { MembershipRoles } from './membershipRoles.ts';
import {
  audioContributorMigrationPlan,
  canUploadSessionAudio,
} from './audioContributorMigration.ts';

const flagsOff = {
  allowContributors: false,
  allowChapters: false,
  allowTranscripts: false,
};

function upsertsFor(
  flags: Parameters<typeof audioContributorMigrationPlan>[0],
  overrides: Parameters<typeof audioContributorMigrationPlan>[1] = [],
) {
  return audioContributorMigrationPlan(flags, overrides).upserts;
}

test('default campaigns keep staff audio upload and do not grant player upload', () => {
  const plan = audioContributorMigrationPlan(flagsOff);
  assert.deepEqual(plan.upserts, []);
});

test('contributor uploads become a Player grant only when assets.upload was already effective', () => {
  assert.deepEqual(upsertsFor({ ...flagsOff, allowContributors: true }), [
    {
      role: MembershipRoles.PARTICIPANT,
      capability: CampaignCapabilities.AUDIO_UPLOAD,
      effect: CapabilityOverrideEffect.GRANT,
    },
  ]);
});

test('inert Player chapter grants reset to the Player default when the switch was off', () => {
  const plan = audioContributorMigrationPlan(flagsOff, [
    {
      role: MembershipRoles.PARTICIPANT,
      capability: CampaignCapabilities.AUDIO_CHAPTERS_EDIT,
      effect: CapabilityOverrideEffect.GRANT,
    },
  ]);
  assert.deepEqual(plan.upserts, []);
  assert.ok(
    plan.resetToDefault.some(
      (row) =>
        row.role === MembershipRoles.PARTICIPANT &&
        row.capability === CampaignCapabilities.AUDIO_CHAPTERS_EDIT,
    ),
  );
});

test('Player chapter grants stay when the campaign already allowed chapter contributions', () => {
  assert.deepEqual(
    upsertsFor(
      { ...flagsOff, allowChapters: true },
      [
        {
          role: MembershipRoles.PARTICIPANT,
          capability: CampaignCapabilities.AUDIO_CHAPTERS_EDIT,
          effect: CapabilityOverrideEffect.GRANT,
        },
      ],
    ),
    [
      {
        role: MembershipRoles.PARTICIPANT,
        capability: CampaignCapabilities.AUDIO_CHAPTERS_EDIT,
        effect: CapabilityOverrideEffect.GRANT,
      },
    ],
  );
});

test('revoking staff asset upload also revokes the new recording-upload grant', () => {
  assert.deepEqual(
    upsertsFor(flagsOff, [
      {
        role: MembershipRoles.WRITER,
        capability: CampaignCapabilities.ASSETS_UPLOAD,
        effect: CapabilityOverrideEffect.REVOKE,
      },
    ]),
    [
      {
        role: MembershipRoles.WRITER,
        capability: CampaignCapabilities.AUDIO_UPLOAD,
        effect: CapabilityOverrideEffect.REVOKE,
      },
    ],
  );
});

test('staff without manage still keep chapter edit only when the old switch allowed it', () => {
  const revokedManage = [
    {
      role: MembershipRoles.WRITER,
      capability: CampaignCapabilities.AUDIO_MANAGE,
      effect: CapabilityOverrideEffect.REVOKE,
    },
  ];
  assert.deepEqual(upsertsFor(flagsOff, revokedManage), [
    {
      role: MembershipRoles.WRITER,
      capability: CampaignCapabilities.AUDIO_UPLOAD,
      effect: CapabilityOverrideEffect.REVOKE,
    },
    {
      role: MembershipRoles.WRITER,
      capability: CampaignCapabilities.AUDIO_CHAPTERS_EDIT,
      effect: CapabilityOverrideEffect.REVOKE,
    },
    {
      role: MembershipRoles.WRITER,
      capability: CampaignCapabilities.AUDIO_TRANSCRIPT_EDIT,
      effect: CapabilityOverrideEffect.REVOKE,
    },
  ]);
  assert.deepEqual(
    upsertsFor({ ...flagsOff, allowChapters: true, allowTranscripts: true }, revokedManage),
    [
      {
        role: MembershipRoles.WRITER,
        capability: CampaignCapabilities.AUDIO_UPLOAD,
        effect: CapabilityOverrideEffect.REVOKE,
      },
    ],
  );
});

test('recording file upload requires audio.upload and does not treat assets.upload as sufficient', () => {
  const ownerOnly = new Set([CampaignCapabilities.AUDIO_UPLOAD]);
  assert.equal(canUploadSessionAudio(ownerOnly, { recordingOwner: true }), true);
  assert.equal(canUploadSessionAudio(ownerOnly, { recordingOwner: false }), false);
  assert.equal(
    canUploadSessionAudio(
      new Set([CampaignCapabilities.AUDIO_UPLOAD, CampaignCapabilities.AUDIO_MANAGE]),
      { recordingOwner: false },
    ),
    true,
  );
  assert.equal(
    canUploadSessionAudio(new Set([CampaignCapabilities.ASSETS_UPLOAD]), { recordingOwner: true }),
    false,
  );
});
