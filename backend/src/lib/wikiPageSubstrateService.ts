import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import {
  countWordsInBlocks,
  extractSocialMentionsFromBlocks,
  extractUnresolvedWikilinksFromBlocks,
  extractWikiEdgesFromBlocks,
} from './wikiLinkExtract.js';
import { filterValidWikiTargetIds } from './wikiLinkService.js';
import {
  appendNarrativeEvent,
  NarrativeEventType,
} from './narrativeEventService.js';
import { wikiLinkPeerVisibilityFilter, isElevatedWikiRole } from './wikiLinkService.js';
import type { WriteProvenance } from './temporalProvenance.js';
import { buildSaveWordDeltaMetadata } from './stats/revisionMetrics.js';
import { incrementDailyRollup } from './stats/userWritingDailyRollup.js';

type Tx = Prisma.TransactionClient;

export async function syncWikiPageSubstrate(
  tx: Tx | typeof prisma,
  input: {
    campaignId: string;
    sourcePageId: string;
    blocks: Array<Record<string, unknown>>;
    actorUserId?: string | null;
    emitEvents?: boolean;
    suppressSocialNotifications?: boolean;
    narrativeSource?: WriteProvenance | string;
    narrativeAuthority?: import('./temporalProvenance.js').TemporalAuthority;
    eventAt?: Date;
    isInitialCreate?: boolean;
  },
): Promise<void> {
  const edges = extractWikiEdgesFromBlocks(input.blocks);
  const rawTargetIds = edges.map((e) => e.targetPageId);
  const targetPageIds = await filterValidWikiTargetIds(
    input.campaignId,
    rawTargetIds,
  );
  const validIdSet = new Set(targetPageIds);

  const previousLinks = await tx.wikiLink.findMany({
    where: { sourcePageId: input.sourcePageId },
    select: { targetPageId: true },
  });
  const previousTargetIds = new Set(previousLinks.map((l) => l.targetPageId));

  const existingStats = await tx.wikiPageStats.findUnique({
    where: { pageId: input.sourcePageId },
    select: { wordCount: true },
  });
  const previousWordCount = existingStats?.wordCount ?? 0;
  const { wordCount, characterCount } = countWordsInBlocks(input.blocks);
  const wordDeltaMeta = buildSaveWordDeltaMetadata(
    previousWordCount,
    wordCount,
    !input.isInitialCreate,
  );
  const newLinkCount = targetPageIds.filter((id) => !previousTargetIds.has(id)).length;

  await tx.wikiLink.deleteMany({
    where: { sourcePageId: input.sourcePageId },
  });

  if (targetPageIds.length > 0) {
    const edgeByTarget = new Map(
      edges.filter((e) => validIdSet.has(e.targetPageId)).map((e) => [e.targetPageId, e]),
    );
    await tx.wikiLink.createMany({
      data: targetPageIds.map((targetPageId) => {
        const edge = edgeByTarget.get(targetPageId);
        return {
          campaignId: input.campaignId,
          sourcePageId: input.sourcePageId,
          targetPageId,
          aliasText: edge?.aliasText ?? null,
          createdByUserId: input.actorUserId ?? null,
        };
      }),
    });
  }

  if (input.emitEvents !== false && input.actorUserId) {
    const eventSource = input.narrativeSource ?? 'user';
    const eventAt = input.eventAt ?? new Date();
    const eventBase = {
      campaignId: input.campaignId,
      source: eventSource,
      actorUserId: input.actorUserId,
      createdAt: eventAt,
      authority: input.narrativeAuthority,
    };

    if (input.isInitialCreate) {
      await appendNarrativeEvent(tx, {
        ...eventBase,
        type: NarrativeEventType.PAGE_CREATED,
        pageId: input.sourcePageId,
        metadata: wordDeltaMeta,
      });
    }

    for (const targetPageId of targetPageIds) {
      if (!previousTargetIds.has(targetPageId)) {
        await appendNarrativeEvent(tx, {
          ...eventBase,
          type: NarrativeEventType.LINK_CREATED,
          pageId: input.sourcePageId,
          targetPageId,
        });
      }
    }
    if (!input.isInitialCreate) {
      await appendNarrativeEvent(tx, {
        ...eventBase,
        type: NarrativeEventType.PAGE_EDITED,
        pageId: input.sourcePageId,
        metadata: wordDeltaMeta,
      });
    }
  }

  const unresolved = extractUnresolvedWikilinksFromBlocks(input.blocks);
  const existingIgnored = await tx.unresolvedWikilink.findMany({
    where: {
      campaignId: input.campaignId,
      sourcePageId: input.sourcePageId,
      status: 'IGNORED',
    },
    select: { normalizedText: true },
  });
  const ignoredSet = new Set(existingIgnored.map((r) => r.normalizedText));

  await tx.unresolvedWikilink.deleteMany({
    where: {
      campaignId: input.campaignId,
      sourcePageId: input.sourcePageId,
      status: { not: 'IGNORED' },
    },
  });

  const now = input.eventAt ?? new Date();
  for (const row of unresolved) {
    if (ignoredSet.has(row.normalizedText)) continue;
    await tx.unresolvedWikilink.upsert({
      where: {
        campaignId_sourcePageId_normalizedText: {
          campaignId: input.campaignId,
          sourcePageId: input.sourcePageId,
          normalizedText: row.normalizedText,
        },
      },
      create: {
        campaignId: input.campaignId,
        sourcePageId: input.sourcePageId,
        rawText: row.rawText,
        normalizedText: row.normalizedText,
        occurrenceCount: row.occurrenceCount,
        status: 'OPEN',
        firstSeenAt: now,
        lastSeenAt: now,
      },
      update: {
        rawText: row.rawText,
        occurrenceCount: row.occurrenceCount,
        lastSeenAt: now,
        status: 'OPEN',
      },
    });
  }

  const socialMentions = extractSocialMentionsFromBlocks(input.blocks);
  await tx.socialMention.deleteMany({
    where: { sourcePageId: input.sourcePageId },
  });
  if (socialMentions.length > 0) {
    await tx.socialMention.createMany({
      data: socialMentions.map((m) => ({
        campaignId: input.campaignId,
        sourcePageId: input.sourcePageId,
        mentionType: m.mentionType,
        targetUserId: m.targetUserId ?? null,
        identityPageId: m.identityPageId ?? null,
        label: m.label,
        createdByUserId: input.actorUserId ?? null,
      })),
    });
  }

  if (!input.suppressSocialNotifications && socialMentions.length > 0) {
    const { dispatchSocialMentionNotifications } = await import(
      './socialMentionNotifications.js'
    );
    await dispatchSocialMentionNotifications({
      campaignId: input.campaignId,
      sourcePageId: input.sourcePageId,
      mentions: socialMentions,
      actorUserId: input.actorUserId,
    });
  }

  const outboundLinkCount = targetPageIds.length;
  const inboundLinkCount = await tx.wikiLink.count({
    where: { targetPageId: input.sourcePageId },
  });
  const unresolvedWikilinkCount = await tx.unresolvedWikilink.count({
    where: {
      sourcePageId: input.sourcePageId,
      status: 'OPEN',
    },
  });

  const page = await tx.wikiPage.findUnique({
    where: { id: input.sourcePageId },
    select: { createdAt: true, updatedAt: true, stats: { select: { editCount: true } } },
  });

  const statsNow = input.eventAt ?? page?.updatedAt ?? now;
  const editCount = (page?.stats?.editCount ?? 0) + (input.isInitialCreate ? 0 : 1);

  await tx.wikiPageStats.upsert({
    where: { pageId: input.sourcePageId },
    create: {
      pageId: input.sourcePageId,
      campaignId: input.campaignId,
      wordCount,
      characterCount,
      outboundLinkCount,
      inboundLinkCount,
      unresolvedWikilinkCount,
      editCount: input.isInitialCreate ? 0 : 1,
      firstCreatedAt: page?.createdAt ?? statsNow,
      lastEditedAt: statsNow,
      lastEditedByUserId: input.actorUserId ?? null,
      statsComputedAt: now,
    },
    update: {
      wordCount,
      characterCount,
      outboundLinkCount,
      inboundLinkCount,
      unresolvedWikilinkCount,
      editCount: input.isInitialCreate ? undefined : editCount,
      lastEditedAt: statsNow,
      lastEditedByUserId: input.actorUserId ?? null,
      statsComputedAt: now,
    },
  });

  await recalcInboundStatsForTargets(tx, input.campaignId, [
    ...targetPageIds,
    ...previousLinks.map((l) => l.targetPageId),
  ]);

  const narrativeSource = input.narrativeSource ?? 'user';
  if (
    input.actorUserId &&
    narrativeSource === 'user' &&
    input.emitEvents !== false
  ) {
    const rollupAt = input.eventAt ?? now;
    const positiveDelta = Math.max(0, wordDeltaMeta.wordDelta);
    const negativeDelta = Math.abs(Math.min(0, wordDeltaMeta.wordDelta));
    await incrementDailyRollup(tx, {
      userId: input.actorUserId,
      at: rollupAt,
      wordsAdded: positiveDelta,
      wordsRemoved: negativeDelta,
      editsCount: input.isInitialCreate ? 0 : 1,
      linksCreated: newLinkCount,
      substantialRevisions: wordDeltaMeta.substantialRevision ? 1 : 0,
    });
  }

  const { syncEntityRelationsForWikiPage } = await import('./entityRelationSyncService.js');
  await syncEntityRelationsForWikiPage(tx, input.campaignId, input.sourcePageId);
}

async function recalcInboundStatsForTargets(
  tx: Tx | typeof prisma,
  campaignId: string,
  targetPageIds: string[],
): Promise<void> {
  const unique = [...new Set(targetPageIds.filter(Boolean))];
  for (const pageId of unique) {
    const inboundLinkCount = await tx.wikiLink.count({
      where: { targetPageId: pageId },
    });
    await tx.wikiPageStats.updateMany({
      where: { pageId },
      data: { inboundLinkCount, statsComputedAt: new Date() },
    }).catch(() => {
      /* page may lack stats row yet */
    });
  }
}

export async function getVisibleInboundLinkCount(input: {
  targetPageId: string;
  campaignId: string;
  role: string | null;
}): Promise<number> {
  const isElevated = isElevatedWikiRole(input.role);
  const peerFilter = wikiLinkPeerVisibilityFilter(isElevated);

  return prisma.wikiLink.count({
    where: {
      targetPageId: input.targetPageId,
      sourcePage: peerFilter ? { ...peerFilter } : undefined,
    },
  });
}
