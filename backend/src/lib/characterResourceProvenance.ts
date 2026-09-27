import type { CampaignScopedRequest } from '../middleware/campaignScope.js';

export type UserCreatedCharacterResourceOrigin = 'CUSTOM' | 'API';

export interface CharacterResourceProvenance {
  origin: UserCreatedCharacterResourceOrigin;
  apiSourceId: string | null;
  apiSourceName: string | null;
}

/** Resolve provenance from trusted authentication state, never request input. */
export function characterResourceProvenance(
  req: Pick<CampaignScopedRequest, 'authMethod' | 'apiTokenId' | 'apiTokenName'>,
): CharacterResourceProvenance {
  if (req.authMethod !== 'apiToken') {
    return { origin: 'CUSTOM', apiSourceId: null, apiSourceName: null };
  }
  return {
    origin: 'API',
    apiSourceId: req.apiTokenId ?? null,
    apiSourceName: req.apiTokenName?.trim() || null,
  };
}

export function isUserDeletableCharacterResource(origin: string): boolean {
  return origin === 'CUSTOM' || origin === 'API';
}
