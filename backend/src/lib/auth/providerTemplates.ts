export const PROVIDER_TEMPLATES = [
  'oidc',
  'authentik',
  'keycloak',
  'azure',
  'google',
  'discord',
] as const;

export type ProviderTemplate = (typeof PROVIDER_TEMPLATES)[number];

export type IdentityProviderDraft = {
  template?: string;
  displayName?: string;
  issuerUrl?: string;
  scopes?: string;
  tenantId?: string;
  groupsClaim?: string | null;
};

const WELL_KNOWN_ISSUERS: Partial<Record<ProviderTemplate, string>> = {
  google: 'https://accounts.google.com',
  discord: 'https://discord.com',
};

export function isProviderTemplate(value: string): value is ProviderTemplate {
  return (PROVIDER_TEMPLATES as readonly string[]).includes(value);
}

export function getDefaultGroupsClaim(template: string): string | null {
  switch (template) {
    case 'azure':
    case 'authentik':
    case 'keycloak':
    case 'oidc':
      return 'groups';
    case 'google':
    case 'discord':
    default:
      return null;
  }
}

export function applyProviderTemplate(
  template: string,
  input: IdentityProviderDraft = {},
): IdentityProviderDraft {
  const t = isProviderTemplate(template) ? template : 'oidc';
  const base: IdentityProviderDraft = {
    template: t,
    scopes: input.scopes ?? 'openid profile email',
    groupsClaim:
      input.groupsClaim !== undefined
        ? input.groupsClaim
        : getDefaultGroupsClaim(t),
  };

  if (input.displayName) base.displayName = input.displayName;
  if (input.issuerUrl) base.issuerUrl = input.issuerUrl;
  if (input.tenantId) base.tenantId = input.tenantId;

  if (!base.issuerUrl && WELL_KNOWN_ISSUERS[t]) {
    base.issuerUrl = WELL_KNOWN_ISSUERS[t];
  }

  if (t === 'azure' && input.tenantId && !base.issuerUrl) {
    base.issuerUrl = `https://login.microsoftonline.com/${input.tenantId.trim()}/v2.0`;
  }

  if (!base.displayName) {
    const labels: Record<string, string> = {
      oidc: 'OIDC Provider',
      authentik: 'Authentik',
      keycloak: 'Keycloak',
      azure: 'Microsoft Entra ID',
      google: 'Google',
      discord: 'Discord',
    };
    base.displayName = labels[t] ?? 'External identity provider';
  }

  return base;
}

export function resolveIssuerUrl(row: {
  issuerUrl: string;
  template: string;
  tenantId: string | null;
}): string {
  const trimmed = row.issuerUrl.trim();
  if (trimmed) return trimmed.replace(/\/+$/, '');
  if (row.template === 'azure' && row.tenantId?.trim()) {
    return `https://login.microsoftonline.com/${row.tenantId.trim()}/v2.0`;
  }
  return trimmed;
}
