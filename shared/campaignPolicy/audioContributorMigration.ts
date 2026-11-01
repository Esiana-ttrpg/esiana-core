import { CampaignCapabilities, type CampaignCapability } from './capabilities.js';
import { MembershipRoles, type MembershipRole } from './membershipRoles.js';
import { CapabilityOverrideEffect } from './capabilityOverrides.js';
import { roleCapabilitiesFor } from './roleGrants.js';

const AUDIO_MIGRATION_ROLES: readonly MembershipRole[] = [
  MembershipRoles.GAMEMASTER,
  MembershipRoles.WRITER,
  MembershipRoles.PARTICIPANT,
  MembershipRoles.OBSERVER,
];

const AUDIO_UPLOAD = CampaignCapabilities.AUDIO_UPLOAD;
const AUDIO_CHAPTERS_EDIT = CampaignCapabilities.AUDIO_CHAPTERS_EDIT;
const AUDIO_TRANSCRIPT_EDIT = CampaignCapabilities.AUDIO_TRANSCRIPT_EDIT;
const AUDIO_MANAGE = CampaignCapabilities.AUDIO_MANAGE;
const ASSETS_UPLOAD = CampaignCapabilities.ASSETS_UPLOAD;

export type AudioContributorFlagState = {
  allowContributors: boolean;
  allowChapters: boolean;
  allowTranscripts: boolean;
};

export type AudioContributorOverrideInput = {
  role: string;
  capability: string;
  effect: string;
};

export type AudioContributorOverrideDraft = {
  role: MembershipRole;
  capability:
    | typeof AUDIO_UPLOAD
    | typeof AUDIO_CHAPTERS_EDIT
    | typeof AUDIO_TRANSCRIPT_EDIT;
  effect: typeof CapabilityOverrideEffect.GRANT | typeof CapabilityOverrideEffect.REVOKE;
};

function effectiveHas(
  role: MembershipRole,
  capability: CampaignCapability,
  overrides: readonly AudioContributorOverrideInput[],
): boolean {
  const fallback = roleCapabilitiesFor(role).has(capability);
  const row = overrides.find((entry) => entry.role === role && entry.capability === capability);
  if (row?.effect === CapabilityOverrideEffect.GRANT) return true;
  if (row?.effect === CapabilityOverrideEffect.REVOKE) return false;
  return fallback;
}

export type AudioContributorMigrationPlan = {
  upserts: AudioContributorOverrideDraft[];
  resetToDefault: Array<{
    role: MembershipRole;
    capability: AudioContributorOverrideDraft['capability'];
  }>;
};

function planCap(
  role: MembershipRole,
  capability: AudioContributorOverrideDraft['capability'],
  want: boolean,
  plan: AudioContributorMigrationPlan,
): void {
  const isDefault = roleCapabilitiesFor(role).has(capability);
  if (want === isDefault) {
    plan.resetToDefault.push({ role, capability });
    return;
  }
  plan.upserts.push({
    role,
    capability,
    effect: want ? CapabilityOverrideEffect.GRANT : CapabilityOverrideEffect.REVOKE,
  });
}

/**
 * Map pre-matrix contributor AND-gates onto role grants without expanding access.
 * `audio.upload` is new; chapter/transcript rows keep their current effective access.
 */
export function audioContributorMigrationPlan(
  flags: AudioContributorFlagState,
  overrides: readonly AudioContributorOverrideInput[] = [],
): AudioContributorMigrationPlan {
  const plan: AudioContributorMigrationPlan = { upserts: [], resetToDefault: [] };
  for (const role of AUDIO_MIGRATION_ROLES) {
    const hasAssetsUpload = effectiveHas(role, ASSETS_UPLOAD, overrides);
    const hasAudioManage = effectiveHas(role, AUDIO_MANAGE, overrides);
    const hasChapters = effectiveHas(role, AUDIO_CHAPTERS_EDIT, overrides);
    const hasTranscripts = effectiveHas(role, AUDIO_TRANSCRIPT_EDIT, overrides);

    const wantUpload = hasAssetsUpload && (hasAudioManage || flags.allowContributors);
    const wantChapters = hasChapters && (hasAudioManage || flags.allowChapters);
    const wantTranscripts = hasTranscripts && (hasAudioManage || flags.allowTranscripts);

    planCap(role, AUDIO_UPLOAD, wantUpload, plan);
    planCap(role, AUDIO_CHAPTERS_EDIT, wantChapters, plan);
    planCap(role, AUDIO_TRANSCRIPT_EDIT, wantTranscripts, plan);
  }
  return plan;
}

export function canUploadSessionAudio(
  caps: ReadonlySet<CampaignCapability>,
  options?: { recordingOwner?: boolean },
): boolean {
  if (!caps.has(AUDIO_UPLOAD)) return false;
  if (caps.has(AUDIO_MANAGE)) return true;
  return Boolean(options?.recordingOwner);
}
