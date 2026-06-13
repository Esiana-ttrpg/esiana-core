import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import {
  EntityGraphEntityTypes,
  EntityRelationSourceDomains,
} from '../../../shared/entityGraph.js';
import {
  draftsToCreateManyData,
  extractCalendarPrerequisiteEdge,
  extractDowntimeHavenGraphEdgesFromRow,
  extractMapPinTargetEdge,
  extractWikiPageGraphEdges,
} from './entityRelationExtractors.js';

type Tx = Prisma.TransactionClient;

async function replaceDraftsForScope(
  tx: Tx,
  campaignId: string,
  deleteWhere: Prisma.EntityRelationWhereInput,
  drafts: ReturnType<typeof extractWikiPageGraphEdges>,
): Promise<number> {
  await tx.entityRelation.deleteMany({ where: { campaignId, ...deleteWhere } });
  if (drafts.length === 0) return 0;
  const result = await tx.entityRelation.createMany({
    data: draftsToCreateManyData(campaignId, drafts),
  });
  return result.count;
}

export async function syncEntityRelationsForWikiPage(
  tx: Tx,
  campaignId: string,
  pageId: string,
): Promise<number> {
  const page = await tx.wikiPage.findFirst({
    where: { id: pageId, campaignId, deletedAt: null },
    select: {
      id: true,
      title: true,
      parentId: true,
      metadata: true,
      outgoingLinks: {
        select: {
          id: true,
          targetPageId: true,
          aliasText: true,
          targetPage: { select: { title: true } },
        },
      },
    },
  });
  if (!page) return 0;

  const drafts = extractWikiPageGraphEdges({
    pageId: page.id,
    title: page.title,
    parentId: page.parentId,
    metadata: page.metadata,
    wikiLinks: page.outgoingLinks.map((link) => ({
      id: link.id,
      targetPageId: link.targetPageId,
      aliasText: link.aliasText,
      targetTitle: link.targetPage.title,
    })),
  });

  return replaceDraftsForScope(tx, campaignId, { sourcePageId: pageId }, drafts);
}

export async function clearEntityRelationsForWikiPage(
  tx: Tx,
  campaignId: string,
  pageId: string,
): Promise<number> {
  const result = await tx.entityRelation.deleteMany({
    where: {
      campaignId,
      OR: [
        { sourcePageId: pageId },
        {
          AND: [
            { sourceEntityType: EntityGraphEntityTypes.WIKI_PAGE },
            { sourceEntityId: pageId },
          ],
        },
        {
          AND: [
            { targetEntityType: EntityGraphEntityTypes.WIKI_PAGE },
            { targetEntityId: pageId },
          ],
        },
      ],
    },
  });
  return result.count;
}

export async function syncEntityRelationsForCalendarEvent(
  tx: Tx,
  campaignId: string,
  eventId: string,
): Promise<number> {
  const event = await tx.calendarEvent.findFirst({
    where: { id: eventId, calendar: { campaignId } },
    select: {
      id: true,
      title: true,
      prerequisiteId: true,
      prerequisite: { select: { title: true } },
    },
  });
  if (!event) return 0;

  await tx.entityRelation.deleteMany({
    where: {
      campaignId,
      sourceDomain: EntityRelationSourceDomains.CALENDAR,
      sourceEntityType: EntityGraphEntityTypes.CALENDAR_EVENT,
      sourceEntityId: eventId,
    },
  });

  if (!event.prerequisiteId) return 0;

  const draft = extractCalendarPrerequisiteEdge({
    eventId: event.id,
    prerequisiteId: event.prerequisiteId,
    eventTitle: event.title,
    prerequisiteTitle: event.prerequisite?.title ?? null,
  });
  if (!draft) return 0;

  await tx.entityRelation.createMany({
    data: draftsToCreateManyData(campaignId, [draft]),
  });
  return 1;
}

export async function clearEntityRelationsForCalendarEvent(
  tx: Tx,
  campaignId: string,
  eventId: string,
): Promise<number> {
  const result = await tx.entityRelation.deleteMany({
    where: {
      campaignId,
      sourceDomain: EntityRelationSourceDomains.CALENDAR,
      OR: [
        {
          sourceEntityType: EntityGraphEntityTypes.CALENDAR_EVENT,
          sourceEntityId: eventId,
        },
        {
          targetEntityType: EntityGraphEntityTypes.CALENDAR_EVENT,
          targetEntityId: eventId,
        },
      ],
    },
  });
  return result.count;
}

export async function syncEntityRelationsForMapPin(
  tx: Tx,
  campaignId: string,
  pinId: string,
): Promise<number> {
  const pin = await tx.mapPin.findFirst({
    where: { id: pinId, asset: { campaignId } },
    select: {
      id: true,
      pinType: true,
      label: true,
      targetPageId: true,
      targetPage: { select: { title: true } },
    },
  });
  if (!pin) return 0;

  await tx.entityRelation.deleteMany({
    where: {
      campaignId,
      sourceDomain: EntityRelationSourceDomains.MAP,
      sourceEntityType: EntityGraphEntityTypes.MAP_PIN,
      sourceEntityId: pinId,
    },
  });

  if (!pin.targetPageId) return 0;

  const draft = extractMapPinTargetEdge({
    pinId: pin.id,
    targetPageId: pin.targetPageId,
    pinType: pin.pinType,
    label: pin.label,
    targetTitle: pin.targetPage?.title ?? null,
  });
  if (!draft) return 0;

  await tx.entityRelation.createMany({
    data: draftsToCreateManyData(campaignId, [draft]),
  });
  return 1;
}

export async function clearEntityRelationsForMapPin(
  tx: Tx,
  campaignId: string,
  pinId: string,
): Promise<number> {
  const result = await tx.entityRelation.deleteMany({
    where: {
      campaignId,
      sourceDomain: EntityRelationSourceDomains.MAP,
      OR: [
        {
          sourceEntityType: EntityGraphEntityTypes.MAP_PIN,
          sourceEntityId: pinId,
        },
        {
          targetEntityType: EntityGraphEntityTypes.MAP_PIN,
          targetEntityId: pinId,
        },
      ],
    },
  });
  return result.count;
}

export async function syncEntityRelationsForDowntimeHaven(
  tx: Tx,
  campaignId: string,
  havenRow: {
    id: string;
    wikiPageId: string;
    locationPageId: string | null;
    residentPageIds: unknown;
    factionPageIds: unknown;
    relatedPageIds: unknown;
    references: unknown;
    identityHints: unknown;
    spaces: unknown;
    havenType: string;
    status: string;
    scale: string | null;
    ownershipType: string | null;
    primaryTheme: string | null;
    establishedAt: Date | null;
    discoveryState: string | null;
    crew: unknown;
    upgrades: unknown;
    threats: unknown;
    passiveBenefits: unknown;
    activityLog: unknown;
    simulationHints: unknown;
    semanticsVersion: string;
  },
): Promise<number> {
  await tx.entityRelation.deleteMany({
    where: {
      campaignId,
      sourceDomain: EntityRelationSourceDomains.DOWNTIME,
      sourcePageId: havenRow.wikiPageId,
    },
  });

  const drafts = extractDowntimeHavenGraphEdgesFromRow(havenRow);
  if (drafts.length === 0) return 0;

  const result = await tx.entityRelation.createMany({
    data: draftsToCreateManyData(campaignId, drafts),
  });
  return result.count;
}

export async function clearEntityRelationsForDowntimeHaven(
  tx: Tx,
  campaignId: string,
  wikiPageId: string,
): Promise<number> {
  const result = await tx.entityRelation.deleteMany({
    where: {
      campaignId,
      sourceDomain: EntityRelationSourceDomains.DOWNTIME,
      sourcePageId: wikiPageId,
    },
  });
  return result.count;
}

export async function rebuildEntityRelationsForCampaign(campaignId: string): Promise<{
  wikiPages: number;
  calendarEvents: number;
  mapPins: number;
  havens: number;
  totalEdges: number;
}> {
  await prisma.entityRelation.deleteMany({ where: { campaignId } });

  let wikiPages = 0;
  let calendarEvents = 0;
  let mapPins = 0;
  let havens = 0;
  let totalEdges = 0;

  const pages = await prisma.wikiPage.findMany({
    where: { campaignId, deletedAt: null },
    select: { id: true },
  });
  for (const page of pages) {
    const count = await syncEntityRelationsForWikiPage(prisma, campaignId, page.id);
    totalEdges += count;
    wikiPages += 1;
  }

  const events = await prisma.calendarEvent.findMany({
    where: { calendar: { campaignId } },
    select: { id: true },
  });
  for (const event of events) {
    const count = await syncEntityRelationsForCalendarEvent(prisma, campaignId, event.id);
    totalEdges += count;
    calendarEvents += 1;
  }

  const pins = await prisma.mapPin.findMany({
    where: { asset: { campaignId }, targetPageId: { not: null } },
    select: { id: true },
  });
  for (const pin of pins) {
    const count = await syncEntityRelationsForMapPin(prisma, campaignId, pin.id);
    totalEdges += count;
    mapPins += 1;
  }

  const downtimeHavens = await prisma.downtimeHaven.findMany({
    where: { campaignId, wikiPage: { deletedAt: null } },
    select: {
      id: true,
      wikiPageId: true,
      locationPageId: true,
      residentPageIds: true,
      factionPageIds: true,
      relatedPageIds: true,
      references: true,
      identityHints: true,
      spaces: true,
      havenType: true,
      status: true,
      scale: true,
      ownershipType: true,
      primaryTheme: true,
      establishedAt: true,
      discoveryState: true,
      crew: true,
      upgrades: true,
      threats: true,
      passiveBenefits: true,
      activityLog: true,
      simulationHints: true,
      semanticsVersion: true,
    },
  });
  for (const haven of downtimeHavens) {
    const count = await syncEntityRelationsForDowntimeHaven(prisma, campaignId, haven);
    totalEdges += count;
    havens += 1;
  }

  return { wikiPages, calendarEvents, mapPins, havens, totalEdges };
}

export type EntityRelationIntegrityIssue = {
  type: 'dangling_source' | 'dangling_target' | 'orphan_source_page';
  edgeId: string;
  sourceRecordKey: string;
  message: string;
};

export async function diagnoseEntityRelationIntegrity(
  campaignId: string,
): Promise<EntityRelationIntegrityIssue[]> {
  const edges = await prisma.entityRelation.findMany({
    where: { campaignId },
    select: {
      id: true,
      sourceRecordKey: true,
      sourceEntityType: true,
      sourceEntityId: true,
      targetEntityType: true,
      targetEntityId: true,
      sourcePageId: true,
    },
  });

  const wikiIds = new Set(
    (
      await prisma.wikiPage.findMany({
        where: { campaignId, deletedAt: null },
        select: { id: true },
      })
    ).map((p) => p.id),
  );
  const eventIds = new Set(
    (
      await prisma.calendarEvent.findMany({
        where: { calendar: { campaignId } },
        select: { id: true },
      })
    ).map((e) => e.id),
  );
  const pinIds = new Set(
    (
      await prisma.mapPin.findMany({
        where: { asset: { campaignId } },
        select: { id: true },
      })
    ).map((p) => p.id),
  );

  const issues: EntityRelationIntegrityIssue[] = [];

  for (const edge of edges) {
    if (edge.sourcePageId && !wikiIds.has(edge.sourcePageId)) {
      issues.push({
        type: 'orphan_source_page',
        edgeId: edge.id,
        sourceRecordKey: edge.sourceRecordKey,
        message: `sourcePageId ${edge.sourcePageId} not found`,
      });
    }

    if (
      edge.sourceEntityType === EntityGraphEntityTypes.WIKI_PAGE &&
      !wikiIds.has(edge.sourceEntityId)
    ) {
      issues.push({
        type: 'dangling_source',
        edgeId: edge.id,
        sourceRecordKey: edge.sourceRecordKey,
        message: `wiki source ${edge.sourceEntityId} not found`,
      });
    }
    if (
      edge.targetEntityType === EntityGraphEntityTypes.WIKI_PAGE &&
      !wikiIds.has(edge.targetEntityId)
    ) {
      issues.push({
        type: 'dangling_target',
        edgeId: edge.id,
        sourceRecordKey: edge.sourceRecordKey,
        message: `wiki target ${edge.targetEntityId} not found`,
      });
    }
    if (
      edge.sourceEntityType === EntityGraphEntityTypes.CALENDAR_EVENT &&
      !eventIds.has(edge.sourceEntityId)
    ) {
      issues.push({
        type: 'dangling_source',
        edgeId: edge.id,
        sourceRecordKey: edge.sourceRecordKey,
        message: `calendar source ${edge.sourceEntityId} not found`,
      });
    }
    if (
      edge.targetEntityType === EntityGraphEntityTypes.CALENDAR_EVENT &&
      !eventIds.has(edge.targetEntityId)
    ) {
      issues.push({
        type: 'dangling_target',
        edgeId: edge.id,
        sourceRecordKey: edge.sourceRecordKey,
        message: `calendar target ${edge.targetEntityId} not found`,
      });
    }
    if (
      edge.sourceEntityType === EntityGraphEntityTypes.MAP_PIN &&
      !pinIds.has(edge.sourceEntityId)
    ) {
      issues.push({
        type: 'dangling_source',
        edgeId: edge.id,
        sourceRecordKey: edge.sourceRecordKey,
        message: `map pin source ${edge.sourceEntityId} not found`,
      });
    }
  }

  return issues;
}
