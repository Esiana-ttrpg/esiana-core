import type { WikiPage } from '@prisma/client';

export interface WikiPageEventDto {
  id: string;
  campaignId: string;
  title: string;
  parentId: string | null;
  notebookArcId: string | null;
  visibility: string;
  templateType: string;
  updatedAt: string;
}

export interface WikiPageDeletedDto {
  id: string;
  campaignId: string;
  title: string;
  parentId: string | null;
  deletedPageIds?: string[];
}

export interface NotebookArcEventDto {
  id: string;
  campaignId: string;
  title: string;
  displayOrder: number;
}

export interface CalendarAdvancedDto {
  campaignId: string;
  previousEpochMinute: string;
  nextEpochMinute: string;
  advancedBy: {
    amount: string;
    unit: string;
  };
}

type WikiPageLike = Pick<
  WikiPage,
  | 'id'
  | 'campaignId'
  | 'title'
  | 'parentId'
  | 'notebookArcId'
  | 'visibility'
  | 'templateType'
  | 'updatedAt'
>;

export function toWikiPageEventDto(page: WikiPageLike): WikiPageEventDto {
  return {
    id: page.id,
    campaignId: page.campaignId,
    title: page.title,
    parentId: page.parentId,
    notebookArcId: page.notebookArcId,
    visibility: page.visibility,
    templateType: page.templateType,
    updatedAt: page.updatedAt.toISOString(),
  };
}

export function toWikiPageDeletedDto(input: {
  id: string;
  campaignId: string;
  title: string;
  parentId: string | null;
  deletedPageIds?: string[];
}): WikiPageDeletedDto {
  return {
    id: input.id,
    campaignId: input.campaignId,
    title: input.title,
    parentId: input.parentId,
    ...(input.deletedPageIds?.length ? { deletedPageIds: input.deletedPageIds } : {}),
  };
}

export function toNotebookArcEventDto(input: {
  id: string;
  campaignId: string;
  title: string;
  displayOrder: number;
}): NotebookArcEventDto {
  return input;
}

export function toCalendarAdvancedDto(input: {
  campaignId: string;
  previousEpochMinute: bigint;
  nextEpochMinute: bigint;
  amount: bigint;
  unit: string;
}): CalendarAdvancedDto {
  return {
    campaignId: input.campaignId,
    previousEpochMinute: input.previousEpochMinute.toString(),
    nextEpochMinute: input.nextEpochMinute.toString(),
    advancedBy: {
      amount: input.amount.toString(),
      unit: input.unit,
    },
  };
}
