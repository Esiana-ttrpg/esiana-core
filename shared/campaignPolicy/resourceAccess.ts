import { CampaignCapabilities, type CampaignCapability } from './capabilities.js';
import { can, hasElevatedNarrativeView, type CampaignActor } from './policy.js';
import {
  canEditPage,
  type PageOwnershipFields,
} from './pageOwnership.js';

export type VisibilityEvaluationTier =
  | 'public'
  | 'campaign'
  | 'gmOnly'
  | 'uploader'
  | 'unknown';

export type ResourceModule =
  | 'wiki'
  | 'quest'
  | 'thread'
  | 'adventure'
  | 'map'
  | 'chronology'
  | 'session_note'
  | 'audio'
  | 'character'
  | 'discovery'
  | 'asset';

export type ResourceAccessInput = {
  module: ResourceModule;
  visibility?: string | null;
  ownership?: PageOwnershipFields;
  uploadedByUserId?: string | null;
  actorUserId?: string | null;
};

export type ResourceAccess = {
  canView: boolean;
  canManage: boolean;
  canDelete: boolean;
  canManageAccess: boolean;
  visibilityTier: VisibilityEvaluationTier;
};

const PUBLIC_VALUES = new Set(['public']);
const CAMPAIGN_VALUES = new Set(['party', 'campaign']);
const GM_ONLY_VALUES = new Set([
  'dm_only',
  'gm_only',
  'elevated_only',
  'secret',
  'staff',
]);
const UPLOADER_VALUES = new Set(['uploader_and_managers']);

export function normalizeVisibilityTier(
  visibility: string | null | undefined,
): VisibilityEvaluationTier {
  if (visibility == null || String(visibility).trim() === '') {
    return 'unknown';
  }
  const normalized = String(visibility).trim().toLowerCase().replace(/-/g, '_');
  if (PUBLIC_VALUES.has(normalized)) return 'public';
  if (CAMPAIGN_VALUES.has(normalized)) return 'campaign';
  if (GM_ONLY_VALUES.has(normalized)) return 'gmOnly';
  if (UPLOADER_VALUES.has(normalized)) return 'uploader';
  return 'unknown';
}

export function canViewVisibilityFromCaps(
  caps: ReadonlySet<CampaignCapability>,
  visibility: string | null | undefined,
  options?: { uploader?: boolean },
): boolean {
  const tier = normalizeVisibilityTier(visibility);
  if (tier === 'unknown') return false;
  if (!caps.has(CampaignCapabilities.CAMPAIGN_VIEW)) return false;
  if (caps.has(CampaignCapabilities.NARRATIVE_ELEVATED_VIEW)) return true;
  if (tier === 'public') return true;
  if (tier === 'campaign') {
    return caps.has(CampaignCapabilities.WIKI_VIEW_PARTY);
  }
  if (tier === 'gmOnly') {
    return caps.has(CampaignCapabilities.NARRATIVE_ELEVATED_VIEW);
  }
  if (tier === 'uploader') {
    return Boolean(options?.uploader) || caps.has(CampaignCapabilities.AUDIO_MANAGE);
  }
  return false;
}

export function canViewVisibility(
  actor: CampaignActor,
  visibility: string | null | undefined,
  options?: { uploader?: boolean },
): boolean {
  const caps = new Set(
    [
      CampaignCapabilities.CAMPAIGN_VIEW,
      CampaignCapabilities.WIKI_VIEW_PARTY,
      CampaignCapabilities.NARRATIVE_ELEVATED_VIEW,
      CampaignCapabilities.ASSETS_VIEW,
      CampaignCapabilities.AUDIO_MANAGE,
    ].filter((cap) => can(actor, cap)),
  );
  return canViewVisibilityFromCaps(caps, visibility, options);
}

function moduleManageCap(module: ResourceModule): CampaignCapability | null {
  switch (module) {
    case 'quest':
      return CampaignCapabilities.QUEST_EDIT;
    case 'thread':
      return CampaignCapabilities.THREAD_EDIT;
    case 'adventure':
      return CampaignCapabilities.ADVENTURE_STORYBOARD_EDIT;
    case 'map':
      return CampaignCapabilities.MAPS_EDIT;
    case 'chronology':
      return CampaignCapabilities.CHRONOLOGY_EDIT;
    case 'session_note':
      return CampaignCapabilities.NOTES_MODERATE;
    case 'audio':
      return CampaignCapabilities.AUDIO_MANAGE;
    case 'discovery':
      return CampaignCapabilities.DISCOVERY_REVEAL;
    case 'asset':
      return CampaignCapabilities.ASSETS_UPLOAD;
    case 'wiki':
    case 'character':
      return null;
    default:
      return null;
  }
}

function moduleDeleteCap(module: ResourceModule): CampaignCapability | null {
  switch (module) {
    case 'audio':
      return CampaignCapabilities.AUDIO_MANAGE;
    case 'asset':
      return CampaignCapabilities.ASSETS_DELETE_ANY;
    case 'session_note':
      return CampaignCapabilities.NOTES_MODERATE;
    default:
      return moduleManageCap(module);
  }
}

export function evaluateResourceAccess(
  actor: CampaignActor,
  resource: ResourceAccessInput,
): ResourceAccess {
  const visibilityTier = normalizeVisibilityTier(resource.visibility);
  const canView = canViewVisibility(actor, resource.visibility, {
    uploader:
      actor.kind === 'member' &&
      resource.uploadedByUserId != null &&
      actor.userId === resource.uploadedByUserId,
  });

  const manageCap = moduleManageCap(resource.module);
  let canManage = false;
  if (resource.module === 'wiki' || resource.module === 'character') {
    canManage = resource.ownership
      ? canEditPage(actor, resource.ownership)
      : can(actor, CampaignCapabilities.PAGE_EDIT_ANY);
  } else if (manageCap) {
    canManage = can(actor, manageCap);
  }

  const deleteCap = moduleDeleteCap(resource.module);
  let canDelete = false;
  if (resource.module === 'wiki' || resource.module === 'character') {
    canDelete = can(actor, CampaignCapabilities.PAGE_EDIT_ANY);
  } else if (resource.module === 'asset') {
    canDelete =
      can(actor, CampaignCapabilities.ASSETS_DELETE_ANY) ||
      (can(actor, CampaignCapabilities.ASSETS_DELETE_OWNED) &&
        actor.kind === 'member' &&
        resource.uploadedByUserId === actor.userId);
  } else if (deleteCap) {
    canDelete = can(actor, deleteCap);
  }

  const canManageAccess =
    canManage &&
    can(actor, CampaignCapabilities.PAGE_VISIBILITY_EDIT) &&
    (hasElevatedNarrativeView(actor) || visibilityTier !== 'gmOnly');

  return {
    canView,
    canManage: canView && canManage,
    canDelete: canView && canDelete,
    canManageAccess: canView && canManageAccess,
    visibilityTier,
  };
}

export function canChangeResourceVisibility(
  actor: CampaignActor,
  resource: ResourceAccessInput,
  nextVisibility: string,
): boolean {
  const current = evaluateResourceAccess(actor, resource);
  if (!current.canManageAccess) return false;
  if (normalizeVisibilityTier(nextVisibility) === 'unknown') return false;
  return canViewVisibility(actor, nextVisibility, {
    uploader:
      actor.kind === 'member' &&
      resource.uploadedByUserId != null &&
      actor.userId === resource.uploadedByUserId,
  });
}
