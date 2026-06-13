import { provenanceForActivityEntityType } from './temporalProvenance.js';
import { prisma } from './prisma.js';
import {
  logCampaignActivity,
  type CampaignActivityActionType,
} from './campaignActivity.js';

/** UTF-8 byte length of extractable wiki block text (safe for empty / malformed blocks). */
export function computeWikiContentSizeBytes(blocks: unknown): number {
  if (!Array.isArray(blocks)) return 0;

  const parts: string[] = [];
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    const row = block as Record<string, unknown>;
    const content = row.content;
    if (!content || typeof content !== 'object') continue;
    const contentObj = content as Record<string, unknown>;

    if (typeof contentObj.markdown === 'string') {
      parts.push(contentObj.markdown);
    } else if (typeof contentObj.text === 'string') {
      parts.push(contentObj.text);
    }
  }

  if (parts.length === 0) return 0;
  try {
    return new TextEncoder().encode(parts.join('\n')).length;
  } catch {
    return parts.join('\n').length;
  }
}

export async function resolveWikiParentContext(
  campaignId: string,
  parentId: string | null | undefined,
): Promise<string | null> {
  if (!parentId) return null;
  const parent = await prisma.wikiPage.findFirst({
    where: { id: parentId, campaignId },
    select: { title: true },
  });
  const title = parent?.title?.trim();
  return title || null;
}

export function wikiEntityTypeFromParent(parentContext: string | null): 'WIKI_PAGE' | 'CHARACTER' {
  if (parentContext?.toLowerCase() === 'characters') return 'CHARACTER';
  return 'WIKI_PAGE';
}

export function logWikiPageActivity(input: {
  campaignId: string;
  userId: string;
  actionType: CampaignActivityActionType;
  entityId: string;
  entityName: string;
  parentId?: string | null;
  parentContext?: string | null;
  newBlocks?: unknown;
  previousBlocks?: unknown | null;
  provenance?: import('./temporalProvenance.js').WriteProvenance;
}): void {
  queueMicrotask(async () => {
    try {
      const parentContext =
        input.parentContext ??
        (await resolveWikiParentContext(input.campaignId, input.parentId ?? null));

      const pageSizeBytes =
        input.newBlocks !== undefined
          ? computeWikiContentSizeBytes(input.newBlocks)
          : null;

      let deltaBytes: number | null = null;
      if (input.newBlocks !== undefined) {
        const next = computeWikiContentSizeBytes(input.newBlocks);
        const prev =
          input.previousBlocks !== undefined && input.previousBlocks !== null
            ? computeWikiContentSizeBytes(input.previousBlocks)
            : 0;
        deltaBytes = next - prev;
      }

      logCampaignActivity({
        campaignId: input.campaignId,
        userId: input.userId,
        actionType: input.actionType,
        entityType: input.provenance
          ? provenanceForActivityEntityType(input.provenance)
          : wikiEntityTypeFromParent(parentContext),
        entityId: input.entityId,
        entityName: input.entityName,
        parentContext,
        pageSizeBytes,
        deltaBytes,
      });
    } catch {
      // Never disrupt primary request flow.
    }
  });
}
