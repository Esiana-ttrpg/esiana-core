import { normalizeEntityCategoryKey } from '../../../shared/entityCategoryKeys.js';

export type NormalizedFrontmatter = {
  entityType?: string;
  visibility?: string;
  tags: string[];
  title?: string;
  blurb?: string;
  raw: Record<string, unknown>;
};

const TYPE_KEYS = ['type', 'entitytype', 'entity_type', 'category', 'kind', 'template', 'templatetype', 'entitycategory'];

const ENTITY_TYPE_ALIASES: Record<string, string> = {
  character: 'characters',
  npc: 'characters',
  pc: 'characters',
  location: 'locations',
  place: 'locations',
  faction: 'organizations',
  organization: 'organizations',
  guild: 'organizations',
  session: 'session-notes',
  'session note': 'session-notes',
  'session-note': 'session-notes',
  journal: 'journals',
  quest: 'quests',
  map: 'maps',
  object: 'objects',
  item: 'objects',
  family: 'families',
  house: 'families',
  bestiary: 'bestiary',
  creature: 'bestiary',
  monster: 'bestiary',
  ancestry: 'ancestries',
  race: 'ancestries',
  rule: 'rules-resources',
  rules: 'rules-resources',
  homebrew: 'rules-resources',
  homerules: 'rules-resources',
  event: 'events',
  calendar: 'calendars',
  timeline: 'timelines',
};

const TAG_ENTITY_HINTS: Record<string, string> = {
  character: 'characters',
  npc: 'characters',
  pc: 'characters',
  location: 'locations',
  faction: 'organizations',
  organization: 'organizations',
  session: 'session-notes',
  journal: 'journals',
  quest: 'quests',
  dragon: 'characters',
  deity: 'characters',
  bestiary: 'bestiary',
  creature: 'bestiary',
  rules: 'rules-resources',
  homebrew: 'rules-resources',
};

function flattenToString(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((entry) => flattenToString(entry)).filter(Boolean).join(', ');
  }
  if (value && typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value ?? '').trim();
}

function normalizeTags(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .flatMap((entry) => (typeof entry === 'string' ? entry.split(',') : [String(entry ?? '')]))
      .map((value) => value.trim().replace(/^#/, '').toLowerCase())
      .filter(Boolean);
  }
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((value) => value.trim().replace(/^#/, '').toLowerCase())
      .filter(Boolean);
  }
  return [];
}

function readEntityTypeFromRaw(raw: Record<string, unknown>): string | undefined {
  for (const [key, value] of Object.entries(raw)) {
    if (!TYPE_KEYS.includes(key.trim().toLowerCase())) continue;
    const normalized = normalizeEntityTypeToken(flattenToString(value));
    if (normalized) return normalized;
  }
  return undefined;
}

export function normalizeEntityTypeToken(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const slug = raw.trim().toLowerCase().replace(/[\s/]+/g, '-');
  const aliased = ENTITY_TYPE_ALIASES[slug] ?? ENTITY_TYPE_ALIASES[slug.replace(/-/g, ' ')];
  if (aliased) return aliased;
  return normalizeEntityCategoryKey(raw) ?? undefined;
}

export function inferEntityTypeFromTags(tags: readonly string[]): string | undefined {
  for (const tag of tags) {
    const hit = TAG_ENTITY_HINTS[tag.trim().toLowerCase()];
    if (hit) return hit;
  }
  return undefined;
}

function normalizeVisibility(raw: Record<string, unknown>): string | undefined {
  const visibility = flattenToString(raw.visibility).trim().toLowerCase();
  const audience = flattenToString(raw.audience).trim().toLowerCase();
  const token = visibility || audience;
  if (!token) return undefined;
  if (token === 'public') return 'Public';
  if (token === 'party' || token === 'players' || token === 'player') return 'Party';
  if (token === 'gm' || token === 'dm' || token === 'dm_only' || token === 'dm-only' || token === 'private') {
    return 'DM_Only';
  }
  if (token === 'Public' || token === 'Party' || token === 'DM_Only') return token;
  return undefined;
}

export function normalizeFrontmatter(raw: Record<string, unknown>): NormalizedFrontmatter {
  const tags = [
    ...normalizeTags(raw.tags),
    ...normalizeTags(raw.tag),
  ];
  const entityType = readEntityTypeFromRaw(raw);
  const title = flattenToString(raw.title) || undefined;
  const blurb = flattenToString(raw.blurb) || undefined;
  const visibility = normalizeVisibility(raw);

  return {
    entityType,
    visibility,
    tags: [...new Set(tags)],
    title,
    blurb,
    raw,
  };
}
