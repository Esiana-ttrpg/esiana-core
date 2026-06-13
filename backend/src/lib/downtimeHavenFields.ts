import type { DowntimeHaven, Prisma } from '@prisma/client';
import { parseDowntimeHavenFields, type DowntimeHavenFields } from './havenMetadata.js';

export function rowToFields(row: DowntimeHaven): DowntimeHavenFields {
  return parseDowntimeHavenFields({
    semanticsVersion: row.semanticsVersion,
    havenType: row.havenType,
    status: row.status,
    locationPageId: row.locationPageId,
    scale: row.scale,
    ownershipType: row.ownershipType,
    primaryTheme: row.primaryTheme,
    establishedAt: row.establishedAt?.toISOString() ?? null,
    discoveryState: row.discoveryState,
    residentPageIds: row.residentPageIds,
    factionPageIds: row.factionPageIds,
    crew: row.crew,
    upgrades: row.upgrades,
    threats: row.threats,
    passiveBenefits: row.passiveBenefits,
    activityLog: row.activityLog,
    relatedPageIds: row.relatedPageIds,
    identityHints: row.identityHints,
    references: row.references,
    spaces: row.spaces,
    simulationHints: row.simulationHints,
  });
}

export function fieldsToPrismaUpdate(
  fields: DowntimeHavenFields,
  updatedByUserId?: string,
): Prisma.DowntimeHavenUncheckedUpdateInput {
  return {
    havenType: fields.havenType,
    status: fields.status,
    locationPageId: fields.locationPageId,
    scale: fields.scale,
    ownershipType: fields.ownershipType,
    primaryTheme: fields.primaryTheme,
    establishedAt: fields.establishedAt ? new Date(fields.establishedAt) : null,
    discoveryState: fields.discoveryState,
    residentPageIds: fields.residentPageIds as unknown as Prisma.InputJsonValue,
    factionPageIds: fields.factionPageIds as unknown as Prisma.InputJsonValue,
    crew: fields.crew as unknown as Prisma.InputJsonValue,
    upgrades: fields.upgrades as unknown as Prisma.InputJsonValue,
    threats: fields.threats as unknown as Prisma.InputJsonValue,
    passiveBenefits: fields.passiveBenefits as unknown as Prisma.InputJsonValue,
    activityLog: fields.activityLog as unknown as Prisma.InputJsonValue,
    relatedPageIds: fields.relatedPageIds as unknown as Prisma.InputJsonValue,
    identityHints: fields.identityHints as unknown as Prisma.InputJsonValue,
    references: fields.references as unknown as Prisma.InputJsonValue,
    spaces: fields.spaces as unknown as Prisma.InputJsonValue,
    simulationHints: fields.simulationHints as unknown as Prisma.InputJsonValue,
    semanticsVersion: fields.semanticsVersion,
    ...(updatedByUserId ? { updatedByUserId } : {}),
  };
}

export function fieldsToPrismaCreate(
  fields: DowntimeHavenFields,
  campaignId: string,
  wikiPageId: string,
  updatedByUserId: string,
): Prisma.DowntimeHavenUncheckedCreateInput {
  return {
    campaignId,
    wikiPageId,
    havenType: fields.havenType,
    status: fields.status,
    locationPageId: fields.locationPageId,
    scale: fields.scale,
    ownershipType: fields.ownershipType,
    primaryTheme: fields.primaryTheme,
    establishedAt: fields.establishedAt ? new Date(fields.establishedAt) : null,
    discoveryState: fields.discoveryState,
    residentPageIds: fields.residentPageIds as unknown as Prisma.InputJsonValue,
    factionPageIds: fields.factionPageIds as unknown as Prisma.InputJsonValue,
    crew: fields.crew as unknown as Prisma.InputJsonValue,
    upgrades: fields.upgrades as unknown as Prisma.InputJsonValue,
    threats: fields.threats as unknown as Prisma.InputJsonValue,
    passiveBenefits: fields.passiveBenefits as unknown as Prisma.InputJsonValue,
    activityLog: fields.activityLog as unknown as Prisma.InputJsonValue,
    relatedPageIds: fields.relatedPageIds as unknown as Prisma.InputJsonValue,
    identityHints: fields.identityHints as unknown as Prisma.InputJsonValue,
    references: fields.references as unknown as Prisma.InputJsonValue,
    spaces: fields.spaces as unknown as Prisma.InputJsonValue,
    simulationHints: fields.simulationHints as unknown as Prisma.InputJsonValue,
    semanticsVersion: fields.semanticsVersion,
    updatedByUserId,
  };
}
