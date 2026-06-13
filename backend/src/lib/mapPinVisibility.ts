import {
  CampaignMemberRoles,
  type CampaignMemberRole,
} from '../types/domain.js';
import { canViewWikiPage } from './wikiTree.js';

export interface MapPinVisibilityContext {
  id: string;
  targetPageId: string | null;
  targetAssetId: string | null;
  targetPage: {
    visibility: string;
  } | null;
  targetAsset: {
    id: string;
    type: string;
    visibility?: string;
    interactiveMapPages: { visibility: string }[];
  } | null;
}

export function isElevatedMapRole(
  role: CampaignMemberRole | null | undefined,
): boolean {
  return (
    role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER
  );
}

function resolveNestedAssetVisibility(
  targetAsset: MapPinVisibilityContext['targetAsset'],
): string | null {
  if (!targetAsset) return null;
  const hostPage = targetAsset.interactiveMapPages[0];
  return hostPage?.visibility ?? null;
}

export function isPinVisibleToRole(
  pin: MapPinVisibilityContext,
  role: CampaignMemberRole | null,
): boolean {
  if (pin.targetPage && !canViewWikiPage(pin.targetPage.visibility, role)) {
    return false;
  }

  if (
    pin.targetAsset?.visibility &&
    !canViewWikiPage(pin.targetAsset.visibility, role)
  ) {
    return false;
  }

  const nestedVisibility = resolveNestedAssetVisibility(pin.targetAsset);
  if (
    nestedVisibility &&
    !canViewWikiPage(nestedVisibility, role)
  ) {
    return false;
  }

  return Boolean(pin.targetPageId || pin.targetAssetId);
}

/** Party-visible proxy for isSecret derivation on DM payloads. */
export function isPinSecretFromPartyPerspective(
  pin: MapPinVisibilityContext,
): boolean {
  return !isPinVisibleToRole(pin, CampaignMemberRoles.PARTICIPANT);
}

export interface SerializedMapPin {
  id: string;
  x: number;
  y: number;
  label: string | null;
  pinType: string;
  targetPageId: string | null;
  targetAssetId: string | null;
  targetPageTitle: string | null;
  targetMapTitle: string | null;
  isSecret?: boolean;
}

export function serializeMapPinForRole(
  pin: MapPinVisibilityContext & {
    x_coordinate: number;
    y_coordinate: number;
    label: string | null;
    pinType: string;
    targetPage: { id: string; title: string; visibility: string } | null;
  targetAsset: {
    id: string;
    type: string;
    displayName: string | null;
    interactiveMapPages: { title: string; visibility: string }[];
  } | null;
  },
  role: CampaignMemberRole | null,
): SerializedMapPin | null {
  if (!pin.targetPageId && !pin.targetAssetId) return null;

  const elevated = isElevatedMapRole(role);
  const visible = isPinVisibleToRole(pin, role);

  if (!visible && !elevated) return null;

  const targetMapTitle =
    pin.targetAsset?.displayName?.trim() ||
    pin.targetAsset?.interactiveMapPages[0]?.title ||
    null;

  const serialized: SerializedMapPin = {
    id: pin.id,
    x: pin.x_coordinate,
    y: pin.y_coordinate,
    label: pin.label,
    pinType: pin.pinType,
    targetPageId: pin.targetPageId,
    targetAssetId: pin.targetAssetId,
    targetPageTitle: pin.targetPage?.title ?? null,
    targetMapTitle,
  };

  if (!elevated) {
    if (
      pin.targetPage &&
      !canViewWikiPage(pin.targetPage.visibility, role)
    ) {
      serialized.targetPageId = null;
      serialized.targetPageTitle = null;
    }
    if (
      pin.targetAsset?.visibility &&
      !canViewWikiPage(pin.targetAsset.visibility, role)
    ) {
      serialized.targetAssetId = null;
      serialized.targetMapTitle = null;
    }
    const nestedVisibility = resolveNestedAssetVisibility(pin.targetAsset);
    if (nestedVisibility && !canViewWikiPage(nestedVisibility, role)) {
      serialized.targetAssetId = null;
      serialized.targetMapTitle = null;
    }
  }

  if (elevated) {
    serialized.isSecret = isPinSecretFromPartyPerspective(pin);
  }

  return serialized;
}
