/**
 * Curated campaign integrations (chat, tabletop, …) — single source of truth for operational links.
 */

export const CHAT_PROVIDERS = [
  'discord',
  'slack',
  'matrix',
  'telegram',
  'stoat',
  'gitter',
  'discourse',
] as const;

export type ChatProvider = (typeof CHAT_PROVIDERS)[number];

export const TABLETOP_PROVIDERS = ['foundry', 'roll20', 'owlbear'] as const;

export type TabletopProvider = (typeof TABLETOP_PROVIDERS)[number];

export type IntegrationProviderId = ChatProvider | TabletopProvider;

export type IntegrationSlotId = 'chat' | 'tabletop';

export type IntegrationLink<P extends string> = {
  provider: P;
  url: string;
};

export type CampaignIntegrations = {
  chat?: IntegrationLink<ChatProvider> | null;
  tabletop?: IntegrationLink<TabletopProvider> | null;
};

export type IntegrationProviderMeta = {
  id: IntegrationProviderId;
  slot: IntegrationSlotId;
  label: string;
};

export const INTEGRATION_PROVIDERS: IntegrationProviderMeta[] = [
  { id: 'discord', slot: 'chat', label: 'Discord' },
  { id: 'slack', slot: 'chat', label: 'Slack' },
  { id: 'matrix', slot: 'chat', label: 'Matrix' },
  { id: 'telegram', slot: 'chat', label: 'Telegram' },
  { id: 'stoat', slot: 'chat', label: 'Stoat' },
  { id: 'gitter', slot: 'chat', label: 'Gitter' },
  { id: 'discourse', slot: 'chat', label: 'Discourse' },
  { id: 'foundry', slot: 'tabletop', label: 'Foundry VTT' },
  { id: 'roll20', slot: 'tabletop', label: 'Roll20' },
  { id: 'owlbear', slot: 'tabletop', label: 'Owlbear Rodeo' },
];

export const INTEGRATION_SLOTS: IntegrationSlotId[] = ['chat', 'tabletop'];

export const INTEGRATION_SLOT_META: Record<
  IntegrationSlotId,
  { label: string; settingsDescription: string }
> = {
  chat: {
    label: 'Chat',
    settingsDescription: 'Voice or text channel for the table.',
  },
  tabletop: {
    label: 'Tabletop',
    settingsDescription: 'Virtual tabletop or play surface link.',
  },
};

const PROVIDER_BY_ID = new Map(
  INTEGRATION_PROVIDERS.map((entry) => [entry.id, entry] as const),
);

const CHAT_PROVIDER_SET = new Set<string>(CHAT_PROVIDERS);
const TABLETOP_PROVIDER_SET = new Set<string>(TABLETOP_PROVIDERS);

const BLOCKED_URL_PROTOCOLS = new Set(['javascript:', 'data:', 'vbscript:']);
export const INTEGRATION_URL_MAX_LENGTH = 2048;

export type IntegrationUrlValidation = {
  ok: boolean;
  error?: string;
  warnHttp?: boolean;
};

export function providersForSlot(slot: IntegrationSlotId): IntegrationProviderMeta[] {
  return INTEGRATION_PROVIDERS.filter((entry) => entry.slot === slot);
}

export function providerLabel(id: IntegrationProviderId): string {
  return PROVIDER_BY_ID.get(id)?.label ?? id;
}

export function isChatProvider(value: string): value is ChatProvider {
  return CHAT_PROVIDER_SET.has(value);
}

export function isTabletopProvider(value: string): value is TabletopProvider {
  return TABLETOP_PROVIDER_SET.has(value);
}

export function validateIntegrationUrl(url: string): IntegrationUrlValidation {
  const trimmed = url.trim();
  if (!trimmed) {
    return { ok: false, error: 'URL is required.' };
  }
  if (trimmed.length > INTEGRATION_URL_MAX_LENGTH) {
    return { ok: false, error: `URL must be at most ${INTEGRATION_URL_MAX_LENGTH} characters.` };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: 'Enter a valid URL.' };
  }

  const protocol = parsed.protocol.toLowerCase();
  if (BLOCKED_URL_PROTOCOLS.has(protocol)) {
    return { ok: false, error: 'URL protocol is not allowed.' };
  }
  if (protocol !== 'http:' && protocol !== 'https:') {
    return { ok: false, error: 'URL must use http or https.' };
  }

  return {
    ok: true,
    warnHttp: protocol === 'http:',
  };
}

function sanitizeIntegrationLink<P extends string>(
  raw: unknown,
  isProvider: (value: string) => value is P,
): IntegrationLink<P> | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const provider = typeof record.provider === 'string' ? record.provider.trim() : '';
  const url = typeof record.url === 'string' ? record.url.trim() : '';
  if (!provider && !url) return null;
  if (!provider || !url) {
    throw new Error('Integration requires both provider and URL.');
  }
  if (!isProvider(provider)) {
    throw new Error(`Invalid provider: ${provider}`);
  }
  const urlCheck = validateIntegrationUrl(url);
  if (!urlCheck.ok) {
    throw new Error(urlCheck.error ?? 'Invalid URL.');
  }
  return { provider, url };
}

export function sanitizeCampaignIntegrations(raw: unknown): CampaignIntegrations | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'object') {
    throw new Error('campaignIntegrations must be an object.');
  }

  const record = raw as Record<string, unknown>;
  const chat =
    record.chat === null || record.chat === undefined
      ? null
      : sanitizeIntegrationLink(record.chat, isChatProvider);
  const tabletop =
    record.tabletop === null || record.tabletop === undefined
      ? null
      : sanitizeIntegrationLink(record.tabletop, isTabletopProvider);

  if (!chat && !tabletop) return null;

  const result: CampaignIntegrations = {};
  if (chat) result.chat = chat;
  if (tabletop) result.tabletop = tabletop;
  return result;
}

export function deriveExternalToolLabels(
  integrations: CampaignIntegrations | null | undefined,
): string[] {
  if (!integrations) return [];

  const labels: string[] = [];
  for (const slot of INTEGRATION_SLOTS) {
    const link = integrations[slot];
    if (link?.provider) {
      labels.push(providerLabel(link.provider));
    }
  }
  return labels;
}

/** Public recruitment projection — provider ids only when URL is configured. */
export function deriveIntegrationProviders(
  integrations: CampaignIntegrations | null | undefined,
): IntegrationProviderId[] {
  if (!integrations) return [];

  const providers: IntegrationProviderId[] = [];
  for (const slot of INTEGRATION_SLOTS) {
    const link = integrations[slot];
    if (link?.provider && link.url?.trim()) {
      providers.push(link.provider);
    }
  }
  return providers;
}

export function parseLegacyExternalTools(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(trimmed);
  }
  return labels;
}

/** Recruitment DTO projection — integrations first, legacy column fallback. */
export function resolveExternalToolLabels(
  integrations: CampaignIntegrations | null | undefined,
  legacyExternalTools: unknown,
): string[] {
  const derived = deriveExternalToolLabels(integrations);
  if (derived.length > 0) return derived;
  return parseLegacyExternalTools(legacyExternalTools);
}

export function hasConfiguredIntegrations(
  integrations: CampaignIntegrations | null | undefined,
): boolean {
  if (!integrations) return false;
  return INTEGRATION_SLOTS.some((slot) => Boolean(integrations[slot]?.url));
}

/** Lenient read parser for persisted JSON. */
export function parseCampaignIntegrations(raw: unknown): CampaignIntegrations | null {
  if (raw === null || raw === undefined) return null;
  try {
    return sanitizeCampaignIntegrations(raw);
  } catch {
    return null;
  }
}
