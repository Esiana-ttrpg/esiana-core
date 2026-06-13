import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { labelFromTagName, slugifyTagName } from './tagUtils.js';

export type WikiTagInput = {
  id?: string;
  name?: string;
  label?: string;
};

export type WikiTagRecord = {
  id: string;
  name: string;
  label: string;
  icon: string | null;
  color: string | null;
};

export const wikiTagSelect = {
  id: true,
  name: true,
  label: true,
  icon: true,
  color: true,
} as const;

export function formatTagsForApi(
  tags: {
    id: string;
    name: string;
    label: string;
    icon: string | null;
    color: string | null;
  }[],
): WikiTagRecord[] {
  return tags.map((t) => ({
    id: t.id,
    name: t.name,
    label: t.label,
    icon: t.icon,
    color: t.color,
  }));
}

function normalizeTagInput(
  input: WikiTagInput,
): { name: string; label: string } | null {
  if (input.id) return null;

  const rawName = typeof input.name === 'string' ? input.name.trim() : '';
  const rawLabel = typeof input.label === 'string' ? input.label.trim() : '';
  const name = rawName ? slugifyTagName(rawName) : slugifyTagName(rawLabel);
  if (!name) return null;

  const label = rawLabel || labelFromTagName(name) || name;
  return { name, label };
}

/**
 * Resolves tag inputs to campaign tag IDs, upserting new tags by slug name.
 */
export async function resolveWikiPageTagIds(
  campaignId: string,
  tagInputs: WikiTagInput[],
): Promise<string[]> {
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const input of tagInputs) {
    if (input.id && typeof input.id === 'string') {
      const id = input.id.trim();
      if (!id || seen.has(id)) continue;

      const existing = await prisma.tag.findFirst({
        where: { id, campaignId },
        select: { id: true },
      });
      if (!existing) {
        throw new Error('Invalid tag id for this campaign');
      }
      ids.push(id);
      seen.add(id);
      continue;
    }

    const normalized = normalizeTagInput(input);
    if (!normalized) continue;

    const tag = await prisma.tag.upsert({
      where: {
        campaignId_name: {
          campaignId,
          name: normalized.name,
        },
      },
      create: {
        campaignId,
        name: normalized.name,
        label: normalized.label,
      },
      update: {
        label: normalized.label,
      },
      select: { id: true },
    });

    if (!seen.has(tag.id)) {
      ids.push(tag.id);
      seen.add(tag.id);
    }
  }

  return ids;
}

export async function syncWikiPageTags(
  pageId: string,
  campaignId: string,
  tagInputs: WikiTagInput[],
): Promise<WikiTagRecord[]> {
  const tagIds = await resolveWikiPageTagIds(campaignId, tagInputs);

  const updated = await prisma.wikiPage.update({
    where: { id: pageId },
    data: {
      tags: {
        set: tagIds.map((id) => ({ id })),
      },
    },
    select: {
      tags: {
        select: wikiTagSelect,
        orderBy: { label: 'asc' },
      },
    },
  });

  return formatTagsForApi(updated.tags);
}

export function wikiPageVisibilityFilter(
  hasElevatedView: boolean,
): Prisma.WikiPageWhereInput | undefined {
  if (hasElevatedView) return undefined;
  return {
    visibility: {
      in: ['Public', 'Party'],
    },
  };
}
