export type ExternalEntityIndex = Map<string, { name: string; folder: string }>;

const KANKA_MENTION_PREFIXES = [
  'character',
  'location',
  'organisation',
  'organization',
  'creature',
  'race',
  'family',
  'quest',
  'journal',
  'event',
  'note',
  'map',
  'item',
  'ability',
] as const;

const MENTION_PATTERN = new RegExp(
  `\\[(${KANKA_MENTION_PREFIXES.join('|')}):(\\d+)\\]`,
  'gi',
);

export function resolveExternalMentions(
  rawText: string,
  entityIndex: ExternalEntityIndex,
): string {
  return rawText.replace(MENTION_PATTERN, (_match, _prefix: string, idRaw: string) => {
    const hit = entityIndex.get(String(idRaw));
    if (!hit?.name) return _match;
    return `[[${hit.name}]]`;
  });
}

export function buildExternalEntityIndex(
  rows: Array<{ id: string; name: string; folder: string }>,
): ExternalEntityIndex {
  const index: ExternalEntityIndex = new Map();
  for (const row of rows) {
    if (row.id) index.set(row.id, { name: row.name, folder: row.folder });
  }
  return index;
}
