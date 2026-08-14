import { UserRoles } from '../../types/domain.js';
import { prisma } from '../prisma.js';
import {
  ENV_MANAGED_OIDC_PROVIDER_ID,
  getOidcEnvConfig,
  isOidcEnvManaged,
} from '../../config/oidcEnv.js';
import { encryptSecretOrDevStore } from '../crypto/secretBox.js';

export async function syncEnvManagedIdentityProvider(): Promise<void> {
  if (!isOidcEnvManaged()) return;

  const cfg = getOidcEnvConfig();
  const groupsClaim =
    cfg.userGroup || cfg.adminGroup ? 'groups' : null;

  const groupRoleMappings: Record<string, string> = {};
  if (cfg.adminGroup) {
    groupRoleMappings[cfg.adminGroup] = UserRoles.SYSTEM_ADMIN;
  }

  const clientSecretEnc = encryptSecretOrDevStore(cfg.clientSecret);

  await prisma.identityProvider.upsert({
    where: { id: ENV_MANAGED_OIDC_PROVIDER_ID },
    create: {
      id: ENV_MANAGED_OIDC_PROVIDER_ID,
      template: 'oidc',
      enabled: true,
      displayName: cfg.providerDisplayName,
      issuerUrl: cfg.issuerUrl,
      clientId: cfg.clientId,
      clientSecretEnc,
      scopes: 'openid profile email',
      groupsClaim,
      groupRoleMappings,
      sortOrder: 0,
    },
    update: {
      template: 'oidc',
      enabled: true,
      displayName: cfg.providerDisplayName,
      issuerUrl: cfg.issuerUrl,
      clientId: cfg.clientId,
      clientSecretEnc,
      scopes: 'openid profile email',
      groupsClaim,
      groupRoleMappings,
    },
  });
}
