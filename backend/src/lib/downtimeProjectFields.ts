import type { DowntimeProject, Prisma } from '@prisma/client';
import {
  computeProgressPercent,
  parseDowntimeProjectFields,
  type DowntimeProjectFields,
} from '../../../shared/projectMetadata.js';

export function rowToFields(row: DowntimeProject): DowntimeProjectFields {
  return parseDowntimeProjectFields({
    semanticsVersion: row.semanticsVersion,
    projectType: row.projectType,
    status: row.status,
    priority: row.priority,
    progressPercent: row.progressPercent,
    durationTotalMinutes: row.durationTotalMinutes,
    durationElapsedMinutes: row.durationElapsedMinutes,
    stalledDurationMinutes: row.stalledDurationMinutes,
    startedAtEpochMinute: row.startedAtEpochMinute,
    completedAtEpochMinute: row.completedAtEpochMinute,
    targetCompletionEpochMinute: row.targetCompletionEpochMinute,
    ownerPageId: row.ownerPageId,
    havenPageId: row.havenPageId,
    relatedPageIds: row.relatedPageIds,
    resources: row.resources,
    blockers: row.blockers,
    outcomes: row.outcomes,
    risks: row.risks,
  });
}

export function fieldsToPrismaUpdate(
  fields: DowntimeProjectFields,
  updatedByUserId?: string,
): Prisma.DowntimeProjectUncheckedUpdateInput {
  const progressPercent = computeProgressPercent(
    fields.durationElapsedMinutes,
    fields.durationTotalMinutes,
  );
  return {
    ownerPageId: fields.ownerPageId,
    havenPageId: fields.havenPageId,
    projectType: fields.projectType,
    status: fields.status,
    priority: fields.priority,
    progressPercent,
    durationTotalMinutes: fields.durationTotalMinutes,
    durationElapsedMinutes: fields.durationElapsedMinutes,
    stalledDurationMinutes: fields.stalledDurationMinutes,
    startedAtEpochMinute: fields.startedAtEpochMinute,
    completedAtEpochMinute: fields.completedAtEpochMinute,
    targetCompletionEpochMinute: fields.targetCompletionEpochMinute,
    relatedPageIds: fields.relatedPageIds as unknown as Prisma.InputJsonValue,
    resources: fields.resources as unknown as Prisma.InputJsonValue,
    blockers: fields.blockers as unknown as Prisma.InputJsonValue,
    outcomes: fields.outcomes as unknown as Prisma.InputJsonValue,
    risks: fields.risks as unknown as Prisma.InputJsonValue,
    semanticsVersion: fields.semanticsVersion,
    ...(updatedByUserId ? { updatedByUserId } : {}),
  };
}
