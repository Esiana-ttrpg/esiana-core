import { PartyParticipationRoles } from '../partyParticipation.js';
import { isKankaPlayerCharacterType } from '../importModuleSynonyms.js';
import type { VirtualNarrativeDeferredRef } from '../virtualNarrativeEntry.js';

type KankaEntityAttribute = {
  name?: string;
  value?: string | null;
};

type KankaTrait = {
  name?: string;
  entry?: string;
  section_id?: number;
};

type KankaPost = {
  name?: string;
  entry?: string;
};

export type KankaCharacterMapResult = {
  characterMetadata: Record<string, unknown>;
  deferredRefs: VirtualNarrativeDeferredRef[];
  importMetadataExtras: Record<string, unknown>;
  biographyAppendix: string;
};

const SHEET_APPENDIX_KEYS = new Set([
  'background',
  'race',
  'alignment',
  'speed',
  'hit dice',
  'hit_dice',
]);

const SKIP_ATTRIBUTE_KEY = /^(?:_|attack_|death_save|skills_internal|internal_modifier|dodarkmode|_layout)/i;

function normalizeAttrKey(name: string): string {
  return name.replace(/\[range:[^\]]+\]/i, '').trim().toLowerCase();
}

export function isPlaceholderAttributeValue(value: string | null | undefined): boolean {
  const trimmed = String(value ?? '').trim();
  if (!trimmed || trimmed === '-') return true;
  if (trimmed === 'NdX') return true;
  if (/^10\+floor\(/i.test(trimmed)) return true;
  if (/^floor\(/i.test(trimmed)) return true;
  if (/^ceil\(/i.test(trimmed)) return true;
  return false;
}

function readEntityAttributes(
  attrs: KankaEntityAttribute[] | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const attr of attrs ?? []) {
    const name = attr.name?.trim();
    if (!name) continue;
    const value = attr.value;
    if (value == null || isPlaceholderAttributeValue(value)) continue;
    map.set(normalizeAttrKey(name), String(value).trim());
  }
  return map;
}

function traitSectionTitle(sectionId: number | undefined): string {
  if (sectionId === 1) return 'Appearance';
  if (sectionId === 2) return 'Personality';
  return 'Traits';
}

function mapTraitToAppearance(
  appearance: Record<string, unknown>,
  traitName: string,
  entry: string,
): void {
  const key = traitName.trim().toLowerCase();
  if (!entry.trim()) return;
  if (key === 'hair') appearance.hairDescription = entry;
  else if (key === 'eyes') appearance.eyeDescription = entry;
  else if (key === 'height') appearance.height = entry;
  else if (key === 'skin' || key === 'scales' || key === 'build' || key === 'weight') {
    if (!appearance.build) appearance.build = entry;
    else appearance.build = `${appearance.build}; ${entry}`;
  } else if (key === 'clothing') appearance.apparelDescription = entry;
  else if (key.includes('voice') || key.includes('presence')) appearance.vibeImpression = entry;
}

export function formatKankaSheetAppendix(attrs: Map<string, string>): string {
  const lines: string[] = [];
  for (const [key, value] of attrs.entries()) {
    if (key === 'class' || key === 'level' || key === 'player_name') continue;
    if (SKIP_ATTRIBUTE_KEY.test(key)) continue;
    if (!SHEET_APPENDIX_KEYS.has(key) && !/^[a-z_]+$/i.test(key)) continue;
    const label = key
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    lines.push(`- **${label}:** ${value}`);
  }
  if (lines.length === 0) return '';
  return `### Sheet notes\n${lines.join('\n')}`;
}

function formatNotableGear(posts: KankaPost[] | undefined, attrs: Map<string, string>): string {
  const lines: string[] = [];
  for (const post of posts ?? []) {
    const name = post.name?.trim();
    if (!name) continue;
    if (!/necklace|ring|sword|armor|amulet|gear|item|weapon|staff|wand/i.test(name)) continue;
    const entry = post.entry ? stripHtml(post.entry) : '';
    lines.push(entry ? `- **${name}:** ${entry}` : `- **${name}**`);
  }
  for (const [key, value] of attrs.entries()) {
    if (!/^attack_\d+_name$/i.test(key)) continue;
    if (isPlaceholderAttributeValue(value)) continue;
    lines.push(`- **${value}**`);
  }
  const spells = attrs.get('spells');
  const features = attrs.get('features');
  if (spells && !isPlaceholderAttributeValue(spells)) lines.push(`- **Spells:** ${spells}`);
  if (features && !isPlaceholderAttributeValue(features)) lines.push(`- **Features:** ${features}`);
  if (lines.length === 0) return '';
  return `### Notable gear\n${lines.join('\n')}`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatTraitSections(traits: KankaTrait[] | undefined): string {
  const sections = new Map<number, string[]>();
  for (const trait of traits ?? []) {
    const name = trait.name?.trim();
    const entry = trait.entry?.trim();
    if (!name || !entry) continue;
    const sectionId = trait.section_id ?? 0;
    const bucket = sections.get(sectionId) ?? [];
    bucket.push(`- **${name}:** ${entry}`);
    sections.set(sectionId, bucket);
  }
  const lines: string[] = [];
  for (const [sectionId, items] of [...sections.entries()].sort((a, b) => a[0] - b[0])) {
    lines.push(`### ${traitSectionTitle(sectionId)}`, '', ...items, '');
  }
  return lines.join('\n').trim();
}

export function mapKankaCharacterFields(raw: Record<string, unknown>): KankaCharacterMapResult {
  const entity =
    raw.entity && typeof raw.entity === 'object'
      ? (raw.entity as Record<string, unknown>)
      : {};
  const kankaType =
    (typeof raw.type === 'string' ? raw.type : null) ??
    (typeof entity.type === 'string' ? entity.type : null);
  const attrs = readEntityAttributes(
    (entity.entityAttributes as KankaEntityAttribute[] | undefined) ??
      (raw.entityAttributes as KankaEntityAttribute[] | undefined),
  );
  const traits =
    (raw.character_traits as KankaTrait[] | undefined) ??
    (raw.characterTraits as KankaTrait[] | undefined);
  const posts = (entity.posts as KankaPost[] | undefined) ?? [];

  const deferredRefs: VirtualNarrativeDeferredRef[] = [];
  const appearance: Record<string, unknown> = {};
  const characterMetadata: Record<string, unknown> = {};

  if (typeof raw.sex === 'string' && raw.sex.trim()) appearance.gender = raw.sex.trim();
  if (typeof raw.pronouns === 'string' && raw.pronouns.trim()) {
    appearance.pronouns = raw.pronouns.trim();
  }
  if (typeof raw.age === 'string' && raw.age.trim()) appearance.summary = raw.age.trim();

  for (const trait of traits ?? []) {
    if (trait.section_id === 1 && trait.name && trait.entry) {
      mapTraitToAppearance(appearance, trait.name, trait.entry);
    }
  }

  if (typeof raw.title === 'string' && raw.title.trim()) {
    characterMetadata.title = raw.title.trim();
  }
  const classValue = attrs.get('class');
  if (classValue) characterMetadata.profession = classValue;

  const raceFromAttrs = attrs.get('race');
  const races = raw.character_races ?? raw.characterRaces;
  let ancestryName = raceFromAttrs;
  if (Array.isArray(races) && races.length > 0) {
    const first = races[0] as Record<string, unknown>;
    const race = first.race as Record<string, unknown> | undefined;
    const entityRace = race?.entity as Record<string, unknown> | undefined;
    const linkedName =
      (typeof entityRace?.name === 'string' ? entityRace.name : null) ??
      (typeof race?.name === 'string' ? race.name : null);
    if (linkedName) ancestryName = linkedName;
    const ancestryEntityId =
      typeof entityRace?.id === 'number'
        ? String(entityRace.id)
        : typeof entityRace?.id === 'string'
          ? entityRace.id
          : null;
    if (ancestryEntityId) {
      deferredRefs.push({ kankaEntityId: ancestryEntityId, field: 'ancestryId' });
    }
  }
  if (ancestryName) characterMetadata.ancestry = ancestryName;

  const isPc = isKankaPlayerCharacterType(kankaType);
  characterMetadata.partyParticipation = {
    active: isPc,
    role: isPc ? PartyParticipationRoles.PLAYER_CHARACTER : PartyParticipationRoles.NPC_ALLY,
  };

  const memberships = raw.organisation_memberships ?? raw.organisationMemberships;
  if (Array.isArray(memberships) && memberships.length > 0) {
    const sorted = [...memberships].sort(
      (a, b) =>
        Number((b as { pin_id?: number }).pin_id ?? 0) -
        Number((a as { pin_id?: number }).pin_id ?? 0),
    );
    const primary = sorted[0] as { organisation_id?: number };
    if (primary.organisation_id != null) {
      deferredRefs.push({
        kankaEntityId: String(primary.organisation_id),
        field: 'primaryAffiliationId',
      });
    }
  }

  const families = raw.character_families ?? raw.characterFamilies;
  if (Array.isArray(families) && families.length > 0) {
    const first = families[0] as Record<string, unknown>;
    const family = first.family as Record<string, unknown> | undefined;
    const familyEntity = family?.entity as Record<string, unknown> | undefined;
    const familyEntityId =
      typeof familyEntity?.id === 'number'
        ? String(familyEntity.id)
        : typeof familyEntity?.id === 'string'
          ? familyEntity.id
          : null;
    if (familyEntityId) {
      deferredRefs.push({ kankaEntityId: familyEntityId, field: 'lineage.familyId' });
    }
  }

  const locations = entity.entityLocations as Array<{ location_id?: number }> | undefined;
  if (locations?.[0]?.location_id != null) {
    deferredRefs.push({
      kankaEntityId: String(locations[0].location_id),
      field: 'currentLocationId',
    });
  }

  const imagePath =
    (typeof entity.image_path === 'string' ? entity.image_path : null) ??
    (typeof raw.image_path === 'string' ? raw.image_path : null);
  if (imagePath) {
    appearance.portraitUrl = imagePath;
  }

  if (Object.keys(appearance).length > 0) {
    characterMetadata.appearance = appearance;
  }

  const importMetadataExtras: Record<string, unknown> = {};
  const playerName = attrs.get('player_name');
  if (playerName) importMetadataExtras.playerName = playerName;
  const level = attrs.get('level');
  if (level) importMetadataExtras.level = level;

  const biographyParts = [
    formatTraitSections(traits),
    formatNotableGear(posts, attrs),
    formatKankaSheetAppendix(attrs),
  ].filter(Boolean);

  return {
    characterMetadata,
    deferredRefs,
    importMetadataExtras,
    biographyAppendix: biographyParts.join('\n\n'),
  };
}
