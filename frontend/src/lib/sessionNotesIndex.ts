import type {
  SessionNotesIndexPayload,
  SessionNotesNotebookPage,
} from '@/types/wiki';

export function flattenTimelineSessions(
  data: SessionNotesIndexPayload,
): SessionNotesNotebookPage[] {
  const pages = [
    ...data.notebooks.flatMap((notebook) => notebook.pages),
    ...data.uncategorized,
  ].filter((page): page is SessionNotesNotebookPage & { timelinePointId: string } =>
    Boolean(page.timelinePointId),
  );

  return [...pages].sort((a, b) => {
    const orderDiff = (a.sequenceOrder ?? 0) - (b.sequenceOrder ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
  });
}

export function hasTimelineSessions(data: SessionNotesIndexPayload | null): boolean {
  if (!data) return false;
  return flattenTimelineSessions(data).length > 0;
}
