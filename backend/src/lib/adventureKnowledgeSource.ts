/** A source ID is disclosed only through the visibility rules for its own entity type. */
export function isVisibleAdventureKnowledgeSource(
  source: { sourceEntityId?: string | null; sourceEntityType?: string | null; sourceType?: string | null },
  allowed: { pageIds: ReadonlySet<string>; eventIds: ReadonlySet<string>; sessionIds: ReadonlySet<string> },
): boolean {
  if (!source.sourceEntityId) return true;
  const type = source.sourceEntityType?.toUpperCase() ??
    (source.sourceType === 'EVENT_RECORD' ? 'CALENDAR_EVENT' : 'WIKI_PAGE');
  if (type === 'CALENDAR_EVENT') return allowed.eventIds.has(source.sourceEntityId);
  if (type === 'SESSION_NOTE') return allowed.sessionIds.has(source.sourceEntityId);
  if (['WIKI_PAGE', 'CHARACTER', 'ARTIFACT', 'ORGANIZATION'].includes(type))
    return allowed.pageIds.has(source.sourceEntityId);
  return false;
}
