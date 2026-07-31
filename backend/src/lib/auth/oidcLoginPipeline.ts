import type { IdentityProvider } from '@prisma/client';
import { getOidcEnvConfig } from '../../config/oidcEnv.js';
import { extractGroupsFromClaims } from './oidcGroupSync.js';

export type OidcLoginPipelineRejectCode =
  | 'group_not_allowed'
  | 'registration_disabled';

export type OidcLoginPipelinePreLoginResult =
  | { ok: true; groups: string[]; isFirstTimeUser: boolean }
  | { ok: false; code: OidcLoginPipelineRejectCode; message: string };

export function extractIdpGroups(
  provider: IdentityProvider,
  claims: Record<string, unknown>,
): string[] {
  const cfg = getOidcEnvConfig();
  const claimPath =
    provider.groupsClaim?.trim() ||
    (cfg.userGroup || cfg.adminGroup ? 'groups' : null);
  return extractGroupsFromClaims(claims, claimPath);
}

/**
 * Steps 2–3 of the OIDC login pipeline (after IdP authentication, before user create).
 */
export async function runOidcLoginPipelinePreUser(params: {
  provider: IdentityProvider;
  claims: Record<string, unknown>;
  isFirstTimeUser: boolean;
  oidcAllowSignup: boolean;
}): Promise<OidcLoginPipelinePreLoginResult> {
  const cfg = getOidcEnvConfig();
  const groups = extractIdpGroups(params.provider, params.claims);

  if (cfg.userGroup) {
    const inUserGroup = groups.includes(cfg.userGroup);
    const inAdminGroup = cfg.adminGroup
      ? groups.includes(cfg.adminGroup)
      : false;
    if (!inUserGroup && !inAdminGroup) {
      return {
        ok: false,
        code: 'group_not_allowed',
        message:
          'Your account is not authorized to sign in to this instance.',
      };
    }
  }

  if (params.isFirstTimeUser && !params.oidcAllowSignup) {
    return {
      ok: false,
      code: 'registration_disabled',
      message:
        'New account registration is currently disabled on this instance.',
    };
  }

  return { ok: true, groups, isFirstTimeUser: params.isFirstTimeUser };
}
