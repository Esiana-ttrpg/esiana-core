import { categoryTitleToEntityCategoryKey } from '@/lib/entityCategoryKeys';
import type { SurfaceProfileKey } from '@/lib/entitySurfaceProfile';
import { PartyParticipationRoles } from '@shared/partyParticipation';
import type { CategoryMetadata, CharacterMetadata, WikiPageBlock } from '@/types/wiki';
import {
  buildDefaultBlocks,
  type WikiPageTemplateType,
} from '@/utils/pageTemplates';

export type WikiPageVisibility = 'Public' | 'Party' | 'DM_Only';

export type CharacterRole =
  | 'generic'
  | 'party-member'
  | 'villain'
  | 'noble'
  | 'merchant';

export type CreateFieldSection = 'primary' | 'collapsible';

export type CreateFieldKind = 'text' | 'preset-select' | 'page-picker' | 'member-select';

export interface CreateSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface CreateFieldDef {
  key: string;
  label: string;
  kind: CreateFieldKind;
  section: CreateFieldSection;
  placeholder?: string;
  optional?: boolean;
  options?: CreateSelectOption[];
  pickerFilter?: 'ancestry';
}

export interface CreateEntityCategoryConfig {
  templateType: WikiPageTemplateType;
  surfaceKey?: SurfaceProfileKey;
  showCharacterRole?: boolean;
  fields: CreateFieldDef[];
}

export interface CreateEntityFormState {
  name: string;
  description: string;
  visibility: WikiPageVisibility;
  characterRole: CharacterRole;
  fieldValues: Record<string, string>;
  parentAncestryId: string | null;
  memberUserId: string | null;
}

export const DEFAULT_CREATE_VISIBILITY: WikiPageVisibility = 'Party';

export const DEFAULT_CHARACTER_ROLE: CharacterRole = 'generic';

/** Frequency-first order; Generic is default selection. */
export const CHARACTER_ROLE_OPTIONS: CreateSelectOption[] = [
  { value: 'generic', label: 'Generic Character' },
  { value: 'party-member', label: 'Party Member' },
  { value: 'villain', label: 'Villain' },
  { value: 'noble', label: 'Noble' },
  { value: 'merchant', label: 'Merchant' },
];

const CHARACTER_ROLE_FIELDS: Record<CharacterRole, CreateFieldDef[]> = {
  generic: [
    {
      key: 'Role',
      label: 'Role',
      kind: 'text',
      section: 'collapsible',
      optional: true,
      placeholder: 'Captain, scout, innkeeper…',
    },
    {
      key: 'Affiliation',
      label: 'Affiliation',
      kind: 'text',
      section: 'collapsible',
      optional: true,
      placeholder: 'Organization or faction',
    },
    {
      key: 'Location',
      label: 'Location',
      kind: 'text',
      section: 'collapsible',
      optional: true,
      placeholder: 'Where they are usually found',
    },
  ],
  'party-member': [
    {
      key: 'memberUserId',
      label: 'Player',
      kind: 'member-select',
      section: 'collapsible',
      optional: true,
    },
    {
      key: 'partyRole',
      label: 'Party role',
      kind: 'text',
      section: 'collapsible',
      optional: true,
      placeholder: 'Face of the party, scout, healer…',
    },
    {
      key: 'startingLocation',
      label: 'Starting location',
      kind: 'text',
      section: 'collapsible',
      optional: true,
      placeholder: 'Where the party usually finds them',
    },
  ],
  villain: [
    {
      key: 'threatLevel',
      label: 'Threat level',
      kind: 'text',
      section: 'collapsible',
      optional: true,
      placeholder: 'Regional, local, existential…',
    },
    {
      key: 'primaryGoal',
      label: 'Primary goal',
      kind: 'text',
      section: 'collapsible',
      optional: true,
      placeholder: 'Restore the drowned empire…',
    },
    {
      key: 'affiliation',
      label: 'Affiliation',
      kind: 'text',
      section: 'collapsible',
      optional: true,
      placeholder: 'Organization or faction',
    },
  ],
  noble: [
    {
      key: 'title',
      label: 'Title',
      kind: 'text',
      section: 'collapsible',
      optional: true,
      placeholder: 'Duchess, Baron, Heir Apparent…',
    },
    {
      key: 'house',
      label: 'House',
      kind: 'text',
      section: 'collapsible',
      optional: true,
      placeholder: 'House Valeris',
    },
    {
      key: 'affiliation',
      label: 'Affiliation',
      kind: 'text',
      section: 'collapsible',
      optional: true,
      placeholder: 'Royal Council, religious order…',
    },
    {
      key: 'seat',
      label: 'Seat / domain',
      kind: 'text',
      section: 'collapsible',
      optional: true,
      placeholder: 'Blackstone Keep',
    },
  ],
  merchant: [
    {
      key: 'business',
      label: 'Business',
      kind: 'text',
      section: 'collapsible',
      optional: true,
      placeholder: 'Moon & Lantern Trading',
    },
    {
      key: 'location',
      label: 'Location',
      kind: 'text',
      section: 'collapsible',
      optional: true,
      placeholder: 'Port Haven',
    },
    {
      key: 'guild',
      label: 'Guild (optional)',
      kind: 'text',
      section: 'collapsible',
      optional: true,
      placeholder: 'Sapphire Merchants Guild',
    },
  ],
};

export const ORG_TYPE_PRESETS: CreateSelectOption[] = [
  { value: 'Guild', label: 'Guild' },
  { value: 'Church', label: 'Church / Temple' },
  { value: 'Military', label: 'Military' },
  { value: 'Noble House', label: 'Noble House' },
  { value: 'Merchant Company', label: 'Merchant Company' },
  { value: 'Criminal Syndicate', label: 'Criminal Syndicate' },
  { value: 'Government', label: 'Government' },
  { value: 'Other', label: 'Other…' },
];

export const CREATURE_TYPE_PRESETS: CreateSelectOption[] = [
  { value: 'Beast', label: 'Beast' },
  { value: 'Humanoid', label: 'Humanoid' },
  { value: 'Undead', label: 'Undead' },
  { value: 'Fiend', label: 'Fiend' },
  { value: 'Dragon', label: 'Dragon' },
  { value: 'Fey', label: 'Fey' },
  { value: 'Construct', label: 'Construct' },
  { value: 'Aberration', label: 'Aberration' },
  { value: 'Other', label: 'Other…' },
];

const CREATE_ENTITY_CONFIG: Record<string, CreateEntityCategoryConfig> = {
  Characters: {
    templateType: 'CHARACTER',
    showCharacterRole: true,
    fields: [],
  },
  Organizations: {
    templateType: 'ORGANIZATION',
    fields: [
      {
        key: 'orgType',
        label: 'Type',
        kind: 'preset-select',
        section: 'primary',
        options: ORG_TYPE_PRESETS,
      },
      {
        key: 'Headquarters',
        label: 'Headquarters',
        kind: 'text',
        section: 'primary',
        placeholder: 'City, district, or landmark',
      },
    ],
  },
  Bestiary: {
    templateType: 'DEFAULT',
    surfaceKey: 'bestiary',
    fields: [
      {
        key: 'creatureType',
        label: 'Creature Type',
        kind: 'preset-select',
        section: 'primary',
        options: CREATURE_TYPE_PRESETS,
      },
    ],
  },
  Ancestries: {
    templateType: 'DEFAULT',
    surfaceKey: 'ancestry',
    fields: [
      {
        key: 'parentAncestryId',
        label: 'Parent Ancestry',
        kind: 'page-picker',
        section: 'primary',
        pickerFilter: 'ancestry',
        placeholder: 'Search parent ancestry…',
      },
    ],
  },
  Locations: {
    templateType: 'LOCATION',
    fields: [
      {
        key: 'Type',
        label: 'Type',
        kind: 'text',
        section: 'primary',
        placeholder: 'City, region, dungeon…',
      },
      {
        key: 'Region',
        label: 'Region',
        kind: 'text',
        section: 'primary',
        placeholder: 'Broader region or continent',
      },
    ],
  },
  Families: {
    templateType: 'FAMILY',
    fields: [],
  },
};

const DEFAULT_CONFIG: CreateEntityCategoryConfig = {
  templateType: 'DEFAULT',
  fields: [],
};

export function normalizeCharacterRole(value: string): CharacterRole {
  if (value in CHARACTER_ROLE_FIELDS) {
    return value as CharacterRole;
  }
  return DEFAULT_CHARACTER_ROLE;
}

export function getCharacterRoleFields(role: string): CreateFieldDef[] {
  return CHARACTER_ROLE_FIELDS[normalizeCharacterRole(role)];
}

export function getCharacterRoleFieldKeys(role: string): string[] {
  return getCharacterRoleFields(role)
    .filter((field) => field.kind !== 'member-select')
    .map((field) => field.key);
}

export function getCreateEntityConfig(categoryTitle: string): CreateEntityCategoryConfig {
  return CREATE_ENTITY_CONFIG[categoryTitle] ?? DEFAULT_CONFIG;
}

export function createEmptyFormState(
  categoryTitle: string,
  initialTitle?: string | null,
  initialMetadata?: Record<string, string>,
): CreateEntityFormState {
  const config = getCreateEntityConfig(categoryTitle);
  const characterRole = DEFAULT_CHARACTER_ROLE;
  const fieldValues: Record<string, string> = {};

  if (categoryTitle === 'Characters') {
    for (const key of getCharacterRoleFieldKeys(characterRole)) {
      fieldValues[key] = initialMetadata?.[key]?.trim() ?? '';
    }
  } else {
    for (const field of config.fields) {
      if (field.kind === 'page-picker') continue;
      fieldValues[field.key] = initialMetadata?.[field.key]?.trim() ?? '';
    }
  }

  return {
    name: initialTitle?.trim() ?? '',
    description: '',
    visibility: DEFAULT_CREATE_VISIBILITY,
    characterRole,
    fieldValues,
    parentAncestryId: null,
    memberUserId: null,
  };
}

function trimOrEmpty(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function indexFields(entries: Array<{ key: string; value: string }>) {
  return entries.filter((entry) => entry.value.length > 0);
}

function buildCharacterCreateMetadata(
  form: CreateEntityFormState,
): Record<string, unknown> {
  const role = normalizeCharacterRole(form.characterRole);
  const metadata: Record<string, unknown> = {
    entityCategory: 'characters',
    characterRole: role,
  };

  const quickInfoEntries: Array<{ key: string; value: string }> = [];

  switch (role) {
    case 'generic': {
      const roleVal = trimOrEmpty(form.fieldValues.Role);
      const affiliation = trimOrEmpty(form.fieldValues.Affiliation);
      const location = trimOrEmpty(form.fieldValues.Location);
      if (roleVal) quickInfoEntries.push({ key: 'Role', value: roleVal });
      if (affiliation) quickInfoEntries.push({ key: 'Affiliation', value: affiliation });
      if (location) quickInfoEntries.push({ key: 'Location', value: location });
      break;
    }
    case 'party-member': {
      metadata.partyParticipation = {
        active: true,
        role: PartyParticipationRoles.PLAYER_CHARACTER,
      };
      const partyRole = trimOrEmpty(form.fieldValues.partyRole);
      const location = trimOrEmpty(form.fieldValues.startingLocation);
      if (partyRole) quickInfoEntries.push({ key: 'Role', value: partyRole });
      if (location) quickInfoEntries.push({ key: 'Location', value: location });
      break;
    }
    case 'villain': {
      const goal = trimOrEmpty(form.fieldValues.primaryGoal);
      if (goal) metadata.motivation = goal;
      const threat = trimOrEmpty(form.fieldValues.threatLevel);
      const affiliation = trimOrEmpty(form.fieldValues.affiliation);
      if (threat) quickInfoEntries.push({ key: 'Threat Level', value: threat });
      if (affiliation) quickInfoEntries.push({ key: 'Affiliation', value: affiliation });
      break;
    }
    case 'noble': {
      const title = trimOrEmpty(form.fieldValues.title);
      if (title) metadata.title = title;
      const house = trimOrEmpty(form.fieldValues.house);
      const affiliation = trimOrEmpty(form.fieldValues.affiliation);
      const seat = trimOrEmpty(form.fieldValues.seat);
      if (house) quickInfoEntries.push({ key: 'Family', value: house });
      if (affiliation) quickInfoEntries.push({ key: 'Affiliation', value: affiliation });
      if (seat) quickInfoEntries.push({ key: 'Location', value: seat });
      break;
    }
    case 'merchant': {
      const business = trimOrEmpty(form.fieldValues.business);
      const location = trimOrEmpty(form.fieldValues.location);
      const guild = trimOrEmpty(form.fieldValues.guild);
      if (business) quickInfoEntries.push({ key: 'Business', value: business });
      if (location) quickInfoEntries.push({ key: 'Location', value: location });
      if (guild) quickInfoEntries.push({ key: 'Guild', value: guild });
      break;
    }
  }

  if (quickInfoEntries.length > 0) {
    metadata.quickInfo = quickInfoEntries;
  }

  return metadata;
}

export function buildCreateMetadata(
  categoryTitle: string,
  form: CreateEntityFormState,
): CategoryMetadata | CharacterMetadata | Record<string, unknown> {
  const config = getCreateEntityConfig(categoryTitle);
  const entityCategory = categoryTitleToEntityCategoryKey(categoryTitle);

  if (categoryTitle === 'Characters') {
    return buildCharacterCreateMetadata(form);
  }

  if (categoryTitle === 'Organizations') {
    const orgType = trimOrEmpty(form.fieldValues.orgType);
    const headquarters = trimOrEmpty(form.fieldValues.Headquarters);
    const fields = indexFields([
      { key: 'Type', value: orgType },
      { key: 'Headquarters', value: headquarters },
    ]);
    return {
      entityCategory,
      ...(orgType ? { orgType } : {}),
      ...(fields.length > 0 ? { fields } : {}),
    };
  }

  if (categoryTitle === 'Bestiary') {
    const creatureType = trimOrEmpty(form.fieldValues.creatureType);
    const fields = indexFields([{ key: 'Type', value: creatureType }]);
    return {
      entityCategory,
      ...(creatureType ? { creatureType } : {}),
      ...(fields.length > 0 ? { fields } : {}),
    };
  }

  if (categoryTitle === 'Ancestries') {
    return {
      entityCategory,
      ...(form.parentAncestryId ? { parentAncestryId: form.parentAncestryId } : {}),
    };
  }

  if (config.fields.length > 0) {
    const fields = indexFields(
      config.fields
        .filter((field) => field.kind !== 'page-picker')
        .map((field) => ({
          key: field.key,
          value: trimOrEmpty(form.fieldValues[field.key]),
        })),
    );
    return {
      entityCategory,
      fields,
    } satisfies CategoryMetadata & { entityCategory: string };
  }

  return { entityCategory };
}

const DESCRIPTION_BLOCK_TYPES: Record<WikiPageTemplateType, string[]> = {
  CHARACTER: ['text-biography'],
  LOCATION: ['text-tiptap'],
  ORGANIZATION: ['text-tiptap'],
  FAMILY: ['text-tiptap'],
  DEFAULT: ['text-tiptap'],
};

export function buildCreateBlocks(
  categoryTitle: string,
  description: string,
): WikiPageBlock[] {
  const config = getCreateEntityConfig(categoryTitle);
  const blocks = buildDefaultBlocks(config.templateType, config.surfaceKey);
  const markdown = description.trim();
  if (!markdown) return blocks;

  const targetTypes = DESCRIPTION_BLOCK_TYPES[config.templateType];
  let seeded = false;
  return blocks.map((block) => {
    if (seeded || !targetTypes.includes(block.type)) return block;
    seeded = true;
    return {
      ...block,
      content: {
        ...(block.content ?? {}),
        markdown,
      },
    };
  });
}

export function resolveCreateTemplateType(categoryTitle: string): WikiPageTemplateType {
  return getCreateEntityConfig(categoryTitle).templateType;
}

export function getCollapsibleFields(
  categoryTitle: string,
  characterRole?: string,
): CreateFieldDef[] {
  if (categoryTitle === 'Characters') {
    return getCharacterRoleFields(characterRole ?? DEFAULT_CHARACTER_ROLE);
  }
  return getCreateEntityConfig(categoryTitle).fields.filter(
    (field) => field.section === 'collapsible',
  );
}

export function getPrimaryFields(categoryTitle: string): CreateFieldDef[] {
  return getCreateEntityConfig(categoryTitle).fields.filter(
    (field) => field.section === 'primary',
  );
}

export function hasCollapsibleFields(
  categoryTitle: string,
  characterRole?: string,
): boolean {
  return getCollapsibleFields(categoryTitle, characterRole).length > 0;
}
