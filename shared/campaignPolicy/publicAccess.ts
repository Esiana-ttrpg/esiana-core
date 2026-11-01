/**
 * Two public-access gates. Both must allow before an anonymous visitor
 * can see campaign content.
 *
 * 1. Instance login gate (Global Admin): whether visitors must sign in
 *    before accessing public-facing Esiana at all.
 * 2. Campaign public access (GM): whether this campaign permits anonymous
 *    viewing of Observer-eligible content.
 *
 * A publicly accessible instance is not an instance where everyone can see
 * everything. Campaign access, Observer read capabilities, and resource
 * restrictions still apply.
 *
 * `SystemSetting.requireLogin` stores the instance gate (default true).
 * Until Pass 4, anonymous campaign routes are not enabled even when this
 * is false. Pass 4 must evaluate both gates; campaign public access alone
 * is never sufficient.
 */

export const INSTANCE_REQUIRES_LOGIN_DEFAULT = true;

export type InstancePublicAccessSettings = {
  requireLogin?: boolean;
};

/** True when Global Admin requires sign-in before public-facing campaign content. */
export function instanceRequiresLogin(
  settings?: InstancePublicAccessSettings | null,
): boolean {
  if (settings && typeof settings.requireLogin === 'boolean') {
    return settings.requireLogin;
  }
  return INSTANCE_REQUIRES_LOGIN_DEFAULT;
}

export type AnonymousCampaignAccessDecision =
  | 'allowed'
  | 'blocked-instance'
  | 'blocked-campaign';

/**
 * Actual anonymous admission. Instance login is checked first so Pass 4 can
 * fail closed before campaign content is considered.
 */
export function resolveAnonymousCampaignAccess(input: {
  instanceRequiresLogin?: boolean;
  campaignAllowsPublic: boolean;
}): AnonymousCampaignAccessDecision {
  const requireLogin =
    input.instanceRequiresLogin === undefined
      ? instanceRequiresLogin()
      : input.instanceRequiresLogin;
  if (requireLogin) return 'blocked-instance';
  if (!input.campaignAllowsPublic) return 'blocked-campaign';
  return 'allowed';
}

export function allowsAnonymousCampaignAccess(input: {
  instanceRequiresLogin?: boolean;
  campaignAllowsPublic: boolean;
}): boolean {
  return resolveAnonymousCampaignAccess(input) === 'allowed';
}

/**
 * Adventure Public preview stays selectable regardless of the instance gate.
 * Campaign-off is an empty state. Instance-off is a notice over eligible content.
 */
export type PublicPreviewGate = 'none' | 'campaign' | 'instance-notice';

export function resolvePublicPreviewGate(input: {
  instanceRequiresLogin?: boolean;
  campaignAllowsPublic: boolean;
}): PublicPreviewGate {
  if (!input.campaignAllowsPublic) return 'campaign';
  const requireLogin =
    input.instanceRequiresLogin === undefined
      ? instanceRequiresLogin()
      : input.instanceRequiresLogin;
  if (requireLogin) return 'instance-notice';
  return 'none';
}
