function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return fallback;
}

const SUPPORTED_STORES = ['memory'] as const;
export type RateLimitStoreKind = (typeof SUPPORTED_STORES)[number];

function parseStore(value: string | undefined): RateLimitStoreKind {
  const normalized = (value ?? 'memory').trim().toLowerCase() || 'memory';
  if ((SUPPORTED_STORES as readonly string[]).includes(normalized)) {
    return normalized as RateLimitStoreKind;
  }
  throw new Error(
    `Unsupported rate-limit store "${normalized}". Only "memory" is supported in this release. ` +
      `A distributed adapter can be added later by extending the store factory.`,
  );
}

export function buildRateLimitEnv() {
  return {
    enabled: parseBoolean(process.env.RATE_LIMIT_ENABLED, true),
    store: parseStore(process.env.RATE_LIMIT_STORE),

    // Named policies (window defaults are 60s unless noted)
    authenticatedMax: parsePositiveInt(
      process.env.RATE_LIMIT_AUTHENTICATED_MAX,
      600,
    ),
    authenticatedWindowMs: parsePositiveInt(
      process.env.RATE_LIMIT_AUTHENTICATED_WINDOW_MS,
      60_000,
    ),
    mutationMax: parsePositiveInt(process.env.RATE_LIMIT_MUTATION_MAX, 120),
    mutationWindowMs: parsePositiveInt(
      process.env.RATE_LIMIT_MUTATION_WINDOW_MS,
      60_000,
    ),
    expensiveMax: parsePositiveInt(process.env.RATE_LIMIT_EXPENSIVE_MAX, 20),
    expensiveWindowMs: parsePositiveInt(
      process.env.RATE_LIMIT_EXPENSIVE_WINDOW_MS,
      60_000,
    ),
    publicMax: parsePositiveInt(process.env.RATE_LIMIT_PUBLIC_MAX, 120),
    publicWindowMs: parsePositiveInt(
      process.env.RATE_LIMIT_PUBLIC_WINDOW_MS,
      60_000,
    ),
    adminMax: parsePositiveInt(process.env.RATE_LIMIT_ADMIN_MAX, 60),
    adminWindowMs: parsePositiveInt(
      process.env.RATE_LIMIT_ADMIN_WINDOW_MS,
      60_000,
    ),
    apiKeyMax: parsePositiveInt(process.env.RATE_LIMIT_API_KEY_MAX, 300),
    apiKeyWindowMs: parsePositiveInt(
      process.env.RATE_LIMIT_API_KEY_WINDOW_MS,
      60_000,
    ),

    // Legacy / narrow credential guards
    loginMax: parsePositiveInt(process.env.RATE_LIMIT_LOGIN_MAX, 20),
    loginWindowMs: parsePositiveInt(
      process.env.RATE_LIMIT_LOGIN_WINDOW_MS,
      15 * 60 * 1000,
    ),
    loginEmailMax: parsePositiveInt(process.env.RATE_LIMIT_LOGIN_EMAIL_MAX, 30),
    loginEmailWindowMs: parsePositiveInt(
      process.env.RATE_LIMIT_LOGIN_EMAIL_WINDOW_MS,
      60 * 60 * 1000,
    ),
    registerMax: parsePositiveInt(process.env.RATE_LIMIT_REGISTER_MAX, 10),
    registerWindowMs: parsePositiveInt(
      process.env.RATE_LIMIT_REGISTER_WINDOW_MS,
      60 * 60 * 1000,
    ),
    passwordChangeMax: parsePositiveInt(
      process.env.RATE_LIMIT_PASSWORD_CHANGE_MAX,
      20,
    ),
    passwordChangeWindowMs: parsePositiveInt(
      process.env.RATE_LIMIT_PASSWORD_CHANGE_WINDOW_MS,
      60 * 60 * 1000,
    ),
    passwordResetMax: parsePositiveInt(
      process.env.RATE_LIMIT_PASSWORD_RESET_MAX,
      5,
    ),
    passwordResetWindowMs: parsePositiveInt(
      process.env.RATE_LIMIT_PASSWORD_RESET_WINDOW_MS,
      60 * 60 * 1000,
    ),
    inviteEmailPerCampaignMax: parsePositiveInt(
      process.env.RATE_LIMIT_INVITE_EMAIL_CAMPAIGN_MAX,
      10,
    ),
    inviteEmailPerCampaignWindowMs: parsePositiveInt(
      process.env.RATE_LIMIT_INVITE_EMAIL_CAMPAIGN_WINDOW_MS,
      60 * 60 * 1000,
    ),
    applyPerCampaignMax: parsePositiveInt(
      process.env.RATE_LIMIT_APPLY_CAMPAIGN_MAX,
      10,
    ),
    applyPerCampaignWindowMs: parsePositiveInt(
      process.env.RATE_LIMIT_APPLY_CAMPAIGN_WINDOW_MS,
      60 * 60 * 1000,
    ),
    applyGlobalMax: parsePositiveInt(process.env.RATE_LIMIT_APPLY_GLOBAL_MAX, 20),
    applyGlobalWindowMs: parsePositiveInt(
      process.env.RATE_LIMIT_APPLY_GLOBAL_WINDOW_MS,
      60 * 60 * 1000,
    ),
    tokenMintMax: parsePositiveInt(process.env.RATE_LIMIT_TOKEN_MINT_MAX, 10),
    tokenMintWindowMs: parsePositiveInt(
      process.env.RATE_LIMIT_TOKEN_MINT_WINDOW_MS,
      24 * 60 * 60 * 1000,
    ),
    oidcStartMax: parsePositiveInt(process.env.RATE_LIMIT_OIDC_START_MAX, 20),
    oidcStartWindowMs: parsePositiveInt(
      process.env.RATE_LIMIT_OIDC_START_WINDOW_MS,
      15 * 60 * 1000,
    ),
    oidcCallbackMax: parsePositiveInt(process.env.RATE_LIMIT_OIDC_CALLBACK_MAX, 40),
    oidcCallbackWindowMs: parsePositiveInt(
      process.env.RATE_LIMIT_OIDC_CALLBACK_WINDOW_MS,
      15 * 60 * 1000,
    ),
  };
}

export type RateLimitEnv = ReturnType<typeof buildRateLimitEnv>;
