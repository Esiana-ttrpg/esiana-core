import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import type { TemporalAuthority, WriteProvenance } from './temporalProvenance.js';

type Tx = Prisma.TransactionClient;

export const NarrativeEventType = {
  PAGE_CREATED: 'PAGE_CREATED',
  PAGE_EDITED: 'PAGE_EDITED',
  LINK_CREATED: 'LINK_CREATED',
  STUB_RESOLVED: 'STUB_RESOLVED',
  ALIAS_ADDED: 'ALIAS_ADDED',
  LORE_KNOWLEDGE_UPDATED: 'LORE_KNOWLEDGE_UPDATED',
} as const;

export type NarrativeEventTypeValue =
  (typeof NarrativeEventType)[keyof typeof NarrativeEventType];

export async function appendNarrativeEvent(
  tx: Tx | typeof prisma,
  input: {
    campaignId: string;
    type: NarrativeEventTypeValue | string;
    source?: WriteProvenance | string;
    actorUserId?: string | null;
    pageId?: string | null;
    targetPageId?: string | null;
    metadata?: Record<string, unknown> | null;
    createdAt?: Date;
    authority?: TemporalAuthority;
  },
): Promise<void> {
  const metadata =
    input.metadata || input.authority
      ? {
          ...(input.metadata ?? {}),
          ...(input.authority ? { authority: input.authority } : {}),
        }
      : undefined;

  await tx.narrativeEvent.create({
    data: {
      campaignId: input.campaignId,
      type: input.type,
      source: input.source ?? 'user',
      actorUserId: input.actorUserId ?? null,
      pageId: input.pageId ?? null,
      targetPageId: input.targetPageId ?? null,
      metadata: (metadata ?? undefined) as import('@prisma/client').Prisma.InputJsonValue | undefined,
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    },
  });
}

/** Spoiler-safe campaign activity counts for Layer 3. */
export async function getSpoilerSafeWorldActivitySummary(
  campaignId: string,
  since: Date,
): Promise<{
  pagesEdited: number;
  linksCreated: number;
  stubsResolved: number;
}> {
  const events = await prisma.narrativeEvent.groupBy({
    by: ['type'],
    where: {
      campaignId,
      createdAt: { gte: since },
      type: {
        in: [
          NarrativeEventType.PAGE_EDITED,
          NarrativeEventType.LINK_CREATED,
          NarrativeEventType.STUB_RESOLVED,
        ],
      },
    },
    _count: { _all: true },
  });

  const countByType = new Map(events.map((e) => [e.type, e._count._all]));

  return {
    pagesEdited: countByType.get(NarrativeEventType.PAGE_EDITED) ?? 0,
    linksCreated: countByType.get(NarrativeEventType.LINK_CREATED) ?? 0,
    stubsResolved: countByType.get(NarrativeEventType.STUB_RESOLVED) ?? 0,
  };
}
