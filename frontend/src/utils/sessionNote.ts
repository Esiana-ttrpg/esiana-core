import type { SessionNoteMetadata, WikiPageBlock } from '@/types/wiki';

export function getSessionNoteMarkdown(blocks: WikiPageBlock[]): string {
  const body =
    blocks.find((block) => block.id === 'session-note-body') ??
    blocks.find((block) => block.type === 'text-tiptap');
  const markdown = (body?.content as { markdown?: string } | undefined)?.markdown;
  return typeof markdown === 'string' ? markdown : '';
}

export function parseSessionNoteMetadata(
  metadata: unknown,
): SessionNoteMetadata {
  if (!metadata || typeof metadata !== 'object') return {};
  const raw = metadata as Record<string, unknown>;
  return {
    sessionNoteAuthorId:
      typeof raw.sessionNoteAuthorId === 'string'
        ? raw.sessionNoteAuthorId
        : undefined,
    locationPageId:
      typeof raw.locationPageId === 'string' ? raw.locationPageId : undefined,
    sessionGroupId:
      typeof raw.sessionGroupId === 'string' ? raw.sessionGroupId : undefined,
    timelinePointId:
      typeof raw.timelinePointId === 'string' ? raw.timelinePointId : undefined,
    fantasyEpochMinute:
      typeof raw.fantasyEpochMinute === 'string' ? raw.fantasyEpochMinute : undefined,
    isSessionAnchor: raw.isSessionAnchor === true,
    isSessionAuthor: raw.isSessionAuthor === true,
  };
}
