import { env } from './env.js';
import { isSecretBoxConfigured } from '../lib/crypto/secretBox.js';

/** Stable id for the environment-managed OIDC provider row. */
export const ENV_MANAGED_OIDC_PROVIDER_ID = 'oidc';

export const OIDC_CONFIGURATION_DOCS_URL =
  'https://github.com/Esiana-ttrpg/docs/blob/main/options/federated-identity.md';

export type OidcManagementMode = 'admin-managed' | 'env-managed' | 'force-disabled';

export type OidcEnvConfig = {
  managementMode: OidcManagementMode;
  localLoginEnabled: boolean;
  /** When set, controls OIDC first-time signup; when unset, use SystemSettings.allowRegistrations. */
  oidcAllowSignup: boolean | null;
  oidcAutoRedirect: boolean;
  providerDisplayName: string;
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  userGroup: string | null;
  adminGroup: string | null;
};

function trimEnv(value: string | undefined): string {
  return value?.trim() ?? '';
}

/** Empty string means unset (Admin-managed for OIDC_ENABLED). */
export function parseOidcManagementMode(
  raw: string | undefined,
): OidcManagementMode {
  const v = trimEnv(raw).toLowerCase();
  if (v === '') return 'admin-managed';
  if (v === 'true') return 'env-managed';
  if (v === 'false') return 'force-disabled';
  throw new Error(
    `OIDC_ENABLED must be unset, "true" (environment-managed), or "false" (force disabled). See ${OIDC_CONFIGURATION_DOCS_URL}`,
  );
}

export function parseStrictBoolEnv(
  raw: string | undefined,
): boolean | null {
  const v = trimEnv(raw).toLowerCase();
  if (v === '') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return null;
}

function parseIssuerUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url;
  } catch {
    return null;
  }
}

export function loadOidcEnvConfig(): OidcEnvConfig {
  const managementMode = parseOidcManagementMode(process.env.OIDC_ENABLED);
  const localLoginRaw = parseStrictBoolEnv(process.env.LOCAL_LOGIN_ENABLED);
  const localLoginEnabled = localLoginRaw ?? true;

  const allowSignupRaw = parseStrictBoolEnv(process.env.OIDC_ALLOW_SIGNUP);
  const autoRedirectRaw = parseStrictBoolEnv(process.env.OIDC_AUTO_REDIRECT);

  return {
    managementMode,
    localLoginEnabled,
    oidcAllowSignup: allowSignupRaw,
    oidcAutoRedirect: autoRedirectRaw ?? false,
    providerDisplayName:
      trimEnv(process.env.OIDC_PROVIDER_NAME) || 'OpenID Connect',
    issuerUrl: trimEnv(process.env.OIDC_ISSUER_URL),
    clientId: trimEnv(process.env.OIDC_CLIENT_ID),
    clientSecret: trimEnv(process.env.OIDC_CLIENT_SECRET),
    userGroup: trimEnv(process.env.OIDC_USER_GROUP) || null,
    adminGroup: trimEnv(process.env.OIDC_ADMIN_GROUP) || null,
  };
}

let cachedConfig: OidcEnvConfig | null = null;

export function getOidcEnvConfig(): OidcEnvConfig {
  if (!cachedConfig) {
    cachedConfig = loadOidcEnvConfig();
  }
  return cachedConfig;
}

/** Test helper — reset cached config after mutating process.env. */
export function resetOidcEnvConfigCache(): void {
  cachedConfig = null;
}

export function isOidcForceDisabled(): boolean {
  return getOidcEnvConfig().managementMode === 'force-disabled';
}

export function isOidcEnvManaged(): boolean {
  return getOidcEnvConfig().managementMode === 'env-managed';
}

export function isEnvManagedProviderId(providerId: string): boolean {
  return isOidcEnvManaged() && providerId === ENV_MANAGED_OIDC_PROVIDER_ID;
}

export class AuthEnvValidationError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(formatAuthEnvValidationError(problems));
    this.name = 'AuthEnvValidationError';
    this.problems = problems;
  }
}

export function formatAuthEnvValidationError(problems: string[]): string {
  const lines = [
    'Authentication environment configuration is invalid:',
    ...problems.map((p) => `  - ${p}`),
    `See ${OIDC_CONFIGURATION_DOCS_URL}`,
  ];
  return lines.join('\n');
}

export function validateAuthEnvContract(options?: {
  enabledOidcProviderCount?: number;
}): void {
  const cfg = getOidcEnvConfig();
  const problems: string[] = [];

  if (cfg.managementMode === 'env-managed') {
    if (!cfg.issuerUrl) {
      problems.push('OIDC_ISSUER_URL is required when OIDC_ENABLED=true');
    } else if (!parseIssuerUrl(cfg.issuerUrl)) {
      problems.push(
        'OIDC_ISSUER_URL must be a valid http or https URL (OIDC discovery issuer)',
      );
    }
    if (!cfg.clientId) {
      problems.push('OIDC_CLIENT_ID is required when OIDC_ENABLED=true');
    }
    if (!cfg.clientSecret) {
      problems.push('OIDC_CLIENT_SECRET is required when OIDC_ENABLED=true');
    }
    if (env.nodeEnv === 'production' && !isSecretBoxConfigured()) {
      problems.push(
        'AUTH_SECRETS_KEY is required in production when OIDC_ENABLED=true',
      );
    }
  }

  const oidcAvailable =
    cfg.managementMode === 'env-managed' ||
    (cfg.managementMode === 'admin-managed' &&
      (options?.enabledOidcProviderCount ?? 0) > 0);

  if (!cfg.localLoginEnabled && !oidcAvailable) {
    problems.push(
      'At least one sign-in method must be enabled: set LOCAL_LOGIN_ENABLED=true and/or configure OIDC (OIDC_ENABLED=true or Admin Identity Providers)',
    );
  }

  if (cfg.managementMode === 'force-disabled' && !cfg.localLoginEnabled) {
    problems.push(
      'LOCAL_LOGIN_ENABLED=false with OIDC_ENABLED=false leaves no sign-in method available',
    );
  }

  if (problems.length > 0) {
    throw new AuthEnvValidationError(problems);
  }
}

export function resolveOidcAllowSignupForNewUser(
  cfg: OidcEnvConfig,
  systemAllowRegistrations: boolean,
): boolean {
  if (cfg.oidcAllowSignup !== null) {
    return cfg.oidcAllowSignup;
  }
  return systemAllowRegistrations;
}

export function isLocalLoginEnabled(): boolean {
  return getOidcEnvConfig().localLoginEnabled;
}
