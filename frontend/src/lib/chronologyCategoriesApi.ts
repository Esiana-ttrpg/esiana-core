import { apiFetch } from './api';

export interface ChronologyCategoryRecord {
  id: string;
  campaignId: string;
  name: string;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listChronologyCategories(
  campaignHandle: string,
): Promise<ChronologyCategoryRecord[]> {
  const data = await apiFetch<{ categories: ChronologyCategoryRecord[] }>(
    `/campaigns/${campaignHandle}/chronology/categories`,
  );
  return data.categories ?? [];
}

export async function createChronologyCategory(
  campaignHandle: string,
  payload: { name: string; color?: string | null },
): Promise<ChronologyCategoryRecord> {
  const data = await apiFetch<{ category: ChronologyCategoryRecord }>(
    `/campaigns/${campaignHandle}/chronology/categories`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return data.category;
}

export async function updateChronologyCategory(
  campaignHandle: string,
  categoryId: string,
  payload: Partial<{ name: string; color: string | null }>,
): Promise<ChronologyCategoryRecord> {
  const data = await apiFetch<{ category: ChronologyCategoryRecord }>(
    `/campaigns/${campaignHandle}/chronology/categories/${categoryId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
  return data.category;
}

export async function deleteChronologyCategory(
  campaignHandle: string,
  categoryId: string,
): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/campaigns/${campaignHandle}/chronology/categories/${categoryId}`, {
    method: 'DELETE',
  });
}
