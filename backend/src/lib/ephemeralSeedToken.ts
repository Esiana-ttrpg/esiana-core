import {
  API_TOKEN_SCOPES,
  generateApiTokenSecret,
  hashApiToken,
} from './apiToken.js';
import { prisma } from './prisma.js';

/** Mint a short-lived bearer token for host-orchestrated campaign seed jobs. */
export async function createEphemeralSeedToken(userId: string): Promise<string> {
  const rawToken = generateApiTokenSecret();
  const tokenHash = hashApiToken(rawToken);
  const expiresAt = new Date();
  expiresAt.setUTCHours(expiresAt.getUTCHours() + 4);

  await prisma.userToken.create({
    data: {
      userId,
      name: 'campaign-generator-ephemeral',
      tokenHash,
      expiresAt,
      scopes: [API_TOKEN_SCOPES.CAMPAIGN_WRITE, API_TOKEN_SCOPES.CAMPAIGN_SEED],
    },
  });

  return rawToken;
}

/** Best-effort cleanup after generator job completes. */
export async function revokeEphemeralSeedTokens(userId: string): Promise<void> {
  await prisma.userToken.deleteMany({
    where: { userId, name: 'campaign-generator-ephemeral' },
  });
}
