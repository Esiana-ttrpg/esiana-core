import { apiFetch } from '@/lib/api';
import type {
  PortfolioCharacter,
  PortfolioListResponse,
  PublicPortfolioCharacterPage,
} from '@/types/portfolio';
import type { PublicPortfolioCharacterProjection } from '@shared/portfolioCharacter';

export async function listPortfolioCharacters(params?: {
  filter?: 'all' | 'active' | 'past' | 'unassigned';
  q?: string;
  includeArchived?: boolean;
  favorite?: boolean;
  showcased?: boolean;
}): Promise<PortfolioListResponse> {
  const qs = new URLSearchParams();
  if (params?.filter && params.filter !== 'all') qs.set('filter', params.filter);
  if (params?.q) qs.set('q', params.q);
  if (params?.includeArchived) qs.set('includeArchived', '1');
  if (params?.favorite) qs.set('favorite', '1');
  if (params?.showcased) qs.set('showcased', '1');
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch(`/user/portfolio/characters${suffix}`);
}

export async function createPortfolioCharacter(input: {
  name: string;
  biography?: string;
  tagline?: string | null;
  roleLabel?: string | null;
  levelLabel?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<PortfolioCharacter> {
  const data = await apiFetch<{ character: PortfolioCharacter }>(
    '/user/portfolio/characters',
    { method: 'POST', body: JSON.stringify(input) },
  );
  return data.character;
}

export async function fetchPortfolioCharacter(id: string): Promise<PortfolioCharacter> {
  const data = await apiFetch<{ character: PortfolioCharacter }>(
    `/user/portfolio/characters/${id}`,
  );
  return data.character;
}

export async function updatePortfolioCharacter(
  id: string,
  input: Partial<{
    name: string;
    biography: string;
    tagline: string | null;
    roleLabel: string | null;
    levelLabel: string | null;
    metadata: Record<string, unknown>;
  }>,
): Promise<PortfolioCharacter> {
  const data = await apiFetch<{ character: PortfolioCharacter }>(
    `/user/portfolio/characters/${id}`,
    { method: 'PATCH', body: JSON.stringify(input) },
  );
  return data.character;
}

export async function deletePortfolioCharacter(id: string): Promise<void> {
  await apiFetch(`/user/portfolio/characters/${id}`, { method: 'DELETE' });
}

export async function duplicatePortfolioCharacter(
  id: string,
  copyMedia = false,
): Promise<PortfolioCharacter> {
  const data = await apiFetch<{ character: PortfolioCharacter }>(
    `/user/portfolio/characters/${id}/duplicate`,
    { method: 'POST', body: JSON.stringify({ copyMedia }) },
  );
  return data.character;
}

export async function setPortfolioFavorite(
  id: string,
  favorite: boolean,
): Promise<PortfolioCharacter> {
  const data = await apiFetch<{ character: PortfolioCharacter }>(
    `/user/portfolio/characters/${id}/favorite`,
    { method: 'POST', body: JSON.stringify({ favorite }) },
  );
  return data.character;
}

export async function setPortfolioArchived(
  id: string,
  archive: boolean,
): Promise<PortfolioCharacter> {
  const data = await apiFetch<{ character: PortfolioCharacter }>(
    `/user/portfolio/characters/${id}/archive`,
    { method: 'POST', body: JSON.stringify({ archive }) },
  );
  return data.character;
}

export async function setPortfolioShowcased(
  id: string,
  showcased: boolean,
): Promise<PortfolioCharacter> {
  const data = await apiFetch<{ character: PortfolioCharacter }>(
    `/user/portfolio/characters/${id}/showcase`,
    { method: 'POST', body: JSON.stringify({ showcased }) },
  );
  return data.character;
}

export async function reorderPortfolioShowcase(
  orderedIds: string[],
): Promise<PortfolioCharacter[]> {
  const data = await apiFetch<{ characters: PortfolioCharacter[] }>(
    '/user/portfolio/showcase/reorder',
    { method: 'PATCH', body: JSON.stringify({ orderedIds }) },
  );
  return data.characters;
}

export async function bulkPortfolioAction(
  ids: string[],
  action:
    | 'favorite'
    | 'unfavorite'
    | 'archive'
    | 'unarchive'
    | 'showcase'
    | 'unshowcase',
): Promise<PortfolioCharacter[]> {
  const data = await apiFetch<{ characters: PortfolioCharacter[] }>(
    '/user/portfolio/characters/bulk',
    { method: 'POST', body: JSON.stringify({ ids, action }) },
  );
  return data.characters;
}

export async function addPortfolioToCampaign(
  id: string,
  campaignId: string,
): Promise<{
  portfolioCharacter: PortfolioCharacter;
  campaignCharacterPageId: string;
  adventureId: string;
}> {
  return apiFetch(`/user/portfolio/characters/${id}/add-to-campaign`, {
    method: 'POST',
    body: JSON.stringify({ campaignId }),
  });
}

export async function addCampaignCharacterToPortfolio(
  campaignHandle: string,
  pageId: string,
): Promise<{
  portfolioCharacter: PortfolioCharacter;
  adventureId: string;
}> {
  return apiFetch(`/campaigns/${campaignHandle}/wiki/${pageId}/add-to-portfolio`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function endPortfolioAdventure(
  adventureId: string,
  levelEnd?: string | null,
): Promise<PortfolioCharacter> {
  const data = await apiFetch<{ character: PortfolioCharacter }>(
    `/user/portfolio/adventures/${adventureId}/end`,
    { method: 'POST', body: JSON.stringify({ levelEnd }) },
  );
  return data.character;
}

export async function exportPortfolioCharacter(id: string): Promise<unknown> {
  return apiFetch(`/user/portfolio/characters/${id}/export`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function uploadPortfolioMedia(
  id: string,
  file: File,
  kind: 'PORTRAIT' | 'GALLERY',
  caption?: string,
): Promise<PortfolioCharacter> {
  const form = new FormData();
  form.append('file', file);
  form.append('kind', kind);
  if (caption) form.append('caption', caption);
  const data = await apiFetch<{ character: PortfolioCharacter }>(
    `/user/portfolio/characters/${id}/media`,
    { method: 'POST', body: form },
  );
  return data.character;
}

export async function deletePortfolioMedia(
  id: string,
  mediaId: string,
): Promise<PortfolioCharacter> {
  const data = await apiFetch<{ character: PortfolioCharacter }>(
    `/user/portfolio/characters/${id}/media/${mediaId}`,
    { method: 'DELETE' },
  );
  return data.character;
}

export async function fetchPublicPortfolioCharacter(
  userId: string,
  characterId: string,
): Promise<PublicPortfolioCharacterPage> {
  return apiFetch(`/users/${userId}/characters/${characterId}`);
}

export type { PublicPortfolioCharacterProjection };
