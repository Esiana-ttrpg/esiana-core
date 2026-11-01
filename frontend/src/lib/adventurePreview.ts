import {
  buildCampaignActor,
  can as policyCan,
  resolveActorCapabilities,
  type CampaignActor,
} from '@shared/campaignPolicy/policy';
import type { CampaignCapability } from '@shared/campaignPolicy/capabilities';
import { allowsAnonymousCampaignView } from '@shared/campaignPolicy/discoverability';
import {
  instanceRequiresLogin,
  resolvePublicPreviewGate,
  type PublicPreviewGate,
} from '@shared/campaignPolicy/publicAccess';
import { canViewVisibilityFromCaps } from '@shared/campaignPolicy/resourceAccess';
import type { CampaignRoleCapabilityOverrideRow } from '@shared/campaignPolicy/capabilityOverrides';

export type AdventurePreviewPerspective = 'dm' | 'party' | 'public';

export function isAdventurePreviewPerspective(
  value: unknown,
): value is AdventurePreviewPerspective {
  return value === 'dm' || value === 'party' || value === 'public';
}

export function adventureHidesGmChrome(
  perspective: AdventurePreviewPerspective,
): boolean {
  return perspective !== 'dm';
}

export function isAdventurePublicPreview(
  perspective: AdventurePreviewPerspective,
): boolean {
  return perspective === 'public';
}

export function adventurePublicPreviewEligible(
  discoverability: string | null | undefined,
): boolean {
  return allowsAnonymousCampaignView(discoverability ?? 'private');
}

export function adventurePublicPreviewGate(
  discoverability: string | null | undefined,
  requireLogin = instanceRequiresLogin(),
): PublicPreviewGate {
  return resolvePublicPreviewGate({
    instanceRequiresLogin: requireLogin,
    campaignAllowsPublic: adventurePublicPreviewEligible(discoverability),
  });
}

export function buildAdventurePublicPreviewActor(campaign: {
  campaignOwnerUserId: string;
  discoverability?: string | null;
  allowPlayerChronologyManagement?: boolean;
  roleCapabilityOverrides?: readonly CampaignRoleCapabilityOverrideRow[];
}): CampaignActor {
  return buildCampaignActor({
    kind: 'anonymous',
    campaignOwnerUserId: campaign.campaignOwnerUserId,
    discoverability: campaign.discoverability ?? 'private',
    allowPlayerChronologyManagement:
      campaign.allowPlayerChronologyManagement ?? false,
    roleCapabilityOverrides: campaign.roleCapabilityOverrides,
  });
}

export function adventurePublicPreviewCapabilities(
  campaign: Parameters<typeof buildAdventurePublicPreviewActor>[0],
): ReadonlySet<CampaignCapability> {
  return resolveActorCapabilities(buildAdventurePublicPreviewActor(campaign));
}

export function adventurePublicPreviewCan(
  campaign: Parameters<typeof buildAdventurePublicPreviewActor>[0],
  capability: CampaignCapability,
): boolean {
  return policyCan(buildAdventurePublicPreviewActor(campaign), capability);
}

export function filterNodesByPreviewVisibility<
  T extends { visibility: string; children?: T[] },
>(nodes: readonly T[], caps: ReadonlySet<CampaignCapability>): T[] {
  return nodes.flatMap((node) => {
    if (!canViewVisibilityFromCaps(caps, node.visibility)) return [];
    const children = node.children
      ? filterNodesByPreviewVisibility(node.children, caps)
      : node.children;
    return children ? [{ ...node, children }] : [node];
  });
}
