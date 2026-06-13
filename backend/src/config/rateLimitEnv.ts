function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function buildRateLimitEnv() {
  return {
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
  };
}

export type RateLimitEnv = ReturnType<typeof buildRateLimitEnv>;
