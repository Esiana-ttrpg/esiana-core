import type { WikiTreeNode } from '@/types/wiki';
import {
  isPageUnderFamiliesCategory,
  isPageUnderOrganizationsCategory,
  isPageUnderQuestsCategory,
} from '@/lib/questHubLayout';
import { isPageUnderNarrativeThreadsCategory } from '@/lib/threadHubLayout';
import { isPageUnderNarrativeScenesCategory } from '@/lib/adventureLayout';
import { isSceneMetadataPresent } from '@shared/sceneMetadata';
import { normalizeEntityCategoryKey } from '@/lib/entityCategoryKeys';

export type InspectorProfile =
  | 'CHARACTER'
  | 'ORGANIZATION'
  | 'FAMILY'
  | 'BESTIARY'
  | 'ANCESTRY'
  | 'LANGUAGE'
  | 'OBJECT'
  | 'LOCATION'
  | 'RULE_RESOURCE'
  | 'QUEST'
  | 'THREAD'
  | 'SCENE'
  | 'DEFAULT';

export interface InspectorSectionDef {
  id: string;
  label: string;
  defaultExpanded: boolean;
  searchKeywords: string[];
  fieldKeys?: string[];
  /** Sticky section title while scrolling long lore content */
  stickyHeader?: boolean;
}

export type SurfaceProfileKey =
  | 'character'
  | 'organization'
  | 'family'
  | 'bestiary'
  | 'ancestry'
  | 'language'
  | 'object'
  | 'location'
  | 'rule-resource'
  | 'quest'
  | 'thread'
  | 'scene'
  | 'default';

export type AppearanceMode = 'full' | 'section' | 'none';

export interface AppearanceCapabilities {
  forms: boolean;
  details: boolean;
  discoveryVariants: boolean;
}

export interface EntitySurfaceProfile {
  key: SurfaceProfileKey;
  inspectorProfile: InspectorProfile;
  typedInfobox: boolean;
  identityStrip: SurfaceProfileKey | null;
  readerFirst?: boolean;
  structureTab?: 'organization' | 'family';
  appearanceMode: AppearanceMode;
  appearanceCapabilities: AppearanceCapabilities;
}

const APPEARANCE_CAPABILITIES_NONE: AppearanceCapabilities = {
  forms: false,
  details: false,
  discoveryVariants: false,
};

const APPEARANCE_CAPABILITIES_CHARACTER: AppearanceCapabilities = {
  forms: true,
  details: true,
  discoveryVariants: true,
};

const APPEARANCE_CAPABILITIES_BESTIARY: AppearanceCapabilities = {
  forms: true,
  details: true,
  discoveryVariants: true,
};

const APPEARANCE_CAPABILITIES_LOCATION: AppearanceCapabilities = {
  forms: true,
  details: false,
  discoveryVariants: true,
};

const APPEARANCE_CAPABILITIES_ORGANIZATION: AppearanceCapabilities = {
  forms: true,
  details: false,
  discoveryVariants: false,
};

const APPEARANCE_CAPABILITIES_FAMILY: AppearanceCapabilities = {
  forms: false,
  details: false,
  discoveryVariants: false,
};

const APPEARANCE_CAPABILITIES_OBJECT: AppearanceCapabilities = {
  forms: false,
  details: true,
  discoveryVariants: false,
};

const INTERPRETIVE_LORE_SECTIONS: InspectorSectionDef[] = [
  {
    id: 'identity-history',
    label: 'Identity History',
    defaultExpanded: false,
    searchKeywords: ['alias', 'historical', 'formerly', 'era', 'name'],
    fieldKeys: [],
    stickyHeader: true,
  },
  {
    id: 'interpretations',
    label: 'Interpretations',
    defaultExpanded: false,
    searchKeywords: ['interpretation', 'account', 'canon', 'disputed', 'myth'],
    fieldKeys: [],
    stickyHeader: true,
  },
  {
    id: 'sources',
    label: 'Sources & Provenance',
    defaultExpanded: false,
    searchKeywords: ['claim', 'source', 'provenance', 'citation', 'evidence'],
    fieldKeys: [],
    stickyHeader: true,
  },
];

function withInterpretiveLoreSections(sections: InspectorSectionDef[]): InspectorSectionDef[] {
  const docIdx = sections.findIndex((s) => s.id === 'document');
  if (docIdx === -1) return [...sections, ...INTERPRETIVE_LORE_SECTIONS];
  return [
    ...sections.slice(0, docIdx),
    ...INTERPRETIVE_LORE_SECTIONS,
    ...sections.slice(docIdx),
  ];
}

const CHARACTER_SECTIONS: InspectorSectionDef[] = [
  {
    id: 'identity',
    label: 'Identity',
    defaultExpanded: true,
    searchKeywords: ['title', 'pronouns', 'profession', 'known for', 'ancestry', 'arc', 'motivation'],
    fieldKeys: ['title', 'pronouns', 'profession', 'knownFor', 'activeArc', 'motivation', 'ancestry'],
  },
  {
    id: 'presence',
    label: 'Presence',
    defaultExpanded: false,
    searchKeywords: ['affiliation', 'location', 'status', 'life'],
    fieldKeys: ['status', 'primaryAffiliationId', 'currentLocationId'],
  },
  {
    id: 'relationships',
    label: 'Relationships',
    defaultExpanded: false,
    searchKeywords: ['family', 'parents', 'spouses', 'affiliations', 'partners'],
    fieldKeys: ['familyId'],
  },
  {
    id: 'appearance',
    label: 'Appearance',
    defaultExpanded: false,
    searchKeywords: ['appearance', 'portrait', 'summary', 'tags', 'gender', 'presentation', 'pronouns'],
    fieldKeys: [
      'appearance.summary',
      'appearance.gender',
      'appearance.presentation',
      'appearance.pronouns',
    ],
  },
  {
    id: 'timeline',
    label: 'Timeline',
    defaultExpanded: false,
    searchKeywords: ['birth', 'death', 'succession', 'dates'],
    fieldKeys: [],
  },
  {
    id: 'dynastic',
    label: 'Dynastic',
    defaultExpanded: false,
    searchKeywords: ['lineage', 'bloodline', 'legitimacy', 'house', 'role'],
    fieldKeys: [],
  },
  {
    id: 'document',
    label: 'Document',
    defaultExpanded: false,
    searchKeywords: ['parent', 'visibility', 'tags', 'entity type'],
    fieldKeys: [],
  },
];

const ORGANIZATION_SECTIONS: InspectorSectionDef[] = [
  {
    id: 'identity',
    label: 'Identity',
    defaultExpanded: true,
    searchKeywords: ['type', 'motto', 'purpose', 'region', 'world state', 'symbol'],
    fieldKeys: [
      'orgType',
      'motto',
      'publicPurpose',
      'region',
      'worldState',
      'operationalScale',
      'methods',
      'influenceMode',
      'organizationalVisibility',
      'symbolPreset',
      'doctrineTint',
      'emblemAssetId',
    ],
  },
  {
    id: 'pressures',
    label: 'Pressures',
    defaultExpanded: false,
    searchKeywords: ['pressure', 'stress', 'campaign'],
    fieldKeys: ['currentPressures'],
  },
  {
    id: 'duality',
    label: 'Duality',
    defaultExpanded: false,
    searchKeywords: ['private', 'agenda', 'street belief', 'reputation'],
    fieldKeys: ['privateAgenda', 'publicReputation'],
  },
  {
    id: 'presence',
    label: 'Presence',
    defaultExpanded: false,
    searchKeywords: ['stronghold', 'territory', 'influence', 'enclave'],
    fieldKeys: [
      'strongholdLocationIds',
      'influenceRegionIds',
      'activeTerritoryIds',
      'hiddenEnclaveIds',
      'tradeReachRegionIds',
      'contestedZoneIds',
    ],
  },
  {
    id: 'leadership',
    label: 'Leadership',
    defaultExpanded: false,
    searchKeywords: ['leader', 'headquarters', 'parent organization', 'structural role'],
    fieldKeys: ['leaderId', 'headquartersId', 'parentOrgId', 'structuralRole'],
  },
  {
    id: 'diplomacy',
    label: 'Diplomacy',
    defaultExpanded: false,
    searchKeywords: ['relations', 'diplomatic', 'stance', 'ally', 'enemy'],
    fieldKeys: ['relations'],
  },
  {
    id: 'document',
    label: 'Document',
    defaultExpanded: false,
    searchKeywords: ['parent', 'visibility', 'tags', 'entity type'],
    fieldKeys: [],
  },
];

const FAMILY_SECTIONS: InspectorSectionDef[] = [
  {
    id: 'identity',
    label: 'Identity',
    defaultExpanded: true,
    searchKeywords: ['type', 'status', 'coat of arms', 'traits'],
    fieldKeys: ['familyType', 'status', 'coatOfArms', 'inheritedTraits'],
  },
  {
    id: 'lineage',
    label: 'Lineage',
    defaultExpanded: false,
    searchKeywords: ['head', 'seat', 'region'],
    fieldKeys: ['headCharacterId', 'seatLocationId', 'region', 'houseBranch'],
  },
  {
    id: 'document',
    label: 'Document',
    defaultExpanded: false,
    searchKeywords: ['parent', 'visibility', 'tags', 'entity type'],
    fieldKeys: [],
  },
];

const BESTIARY_SECTIONS: InspectorSectionDef[] = [
  {
    id: 'identity',
    label: 'Identity',
    defaultExpanded: true,
    searchKeywords: ['type', 'creature', 'known for', 'region'],
    fieldKeys: ['creatureType', 'knownFor', 'region'],
  },
  {
    id: 'habitat',
    label: 'Habitat & Behavior',
    defaultExpanded: false,
    searchKeywords: ['habitat', 'threat', 'intelligence', 'behavior'],
    fieldKeys: ['habitat', 'threatLevel', 'intelligence', 'behaviorSummary'],
  },
  {
    id: 'relationships',
    label: 'Relationships',
    defaultExpanded: false,
    searchKeywords: ['creatures', 'locations', 'related'],
    fieldKeys: ['relatedCreatureIds', 'relatedLocationIds'],
  },
  {
    id: 'appearance',
    label: 'Appearance',
    defaultExpanded: false,
    searchKeywords: ['appearance', 'portrait', 'summary', 'tags'],
    fieldKeys: ['appearance.summary', 'appearance.portraitUrl'],
  },
  {
    id: 'document',
    label: 'Document',
    defaultExpanded: false,
    searchKeywords: ['parent', 'visibility', 'tags', 'entity type'],
    fieldKeys: [],
  },
];

const ANCESTRY_SECTIONS: InspectorSectionDef[] = [
  {
    id: 'identity',
    label: 'Identity',
    defaultExpanded: true,
    searchKeywords: ['kind', 'summary', 'type', 'homeland', 'known for', 'language', 'parent'],
    fieldKeys: [
      'entityKind',
      'identitySummary',
      'parentAncestryId',
      'ancestryType',
      'homeland',
      'region',
      'knownFor',
      'language',
      'baselineTraits',
    ],
  },
  {
    id: 'lineage',
    label: 'Lineage',
    defaultExpanded: false,
    searchKeywords: ['traits', 'physiology', 'lifespan', 'senses'],
    fieldKeys: ['addedTraits', 'suppressedTraits', 'lifespanMin', 'lifespanMax', 'physiologyTags'],
  },
  {
    id: 'presence',
    label: 'Presence',
    defaultExpanded: false,
    searchKeywords: ['homeland', 'communities', 'diaspora', 'population'],
    fieldKeys: [
      'homelandRegionIds',
      'communityRegionIds',
      'diasporaRegionIds',
      'populationPresence',
    ],
  },
  {
    id: 'societies',
    label: 'Societies',
    defaultExpanded: false,
    searchKeywords: ['societies', 'customs', 'values', 'reputation'],
    fieldKeys: ['societies'],
  },
  {
    id: 'relationships',
    label: 'Relationships',
    defaultExpanded: false,
    searchKeywords: ['ancestries', 'locations', 'organizations', 'related'],
    fieldKeys: ['relatedAncestryIds', 'relatedLocationIds', 'relatedOrganizationIds'],
  },
  {
    id: 'appearance',
    label: 'Appearance',
    defaultExpanded: false,
    searchKeywords: ['appearance', 'portrait', 'summary', 'tags'],
    fieldKeys: ['appearance.summary', 'appearance.portraitUrl'],
  },
  {
    id: 'document',
    label: 'Document',
    defaultExpanded: false,
    searchKeywords: ['parent', 'visibility', 'tags', 'entity type'],
    fieldKeys: [],
  },
];

const OBJECT_SECTIONS: InspectorSectionDef[] = [
  {
    id: 'identity',
    label: 'Identity',
    defaultExpanded: true,
    searchKeywords: ['type', 'known for', 'powers', 'magical', 'invested'],
    fieldKeys: ['objectType', 'knownFor', 'powersSummary', 'investedOrMagical'],
  },
  {
    id: 'provenance',
    label: 'Provenance',
    defaultExpanded: false,
    searchKeywords: ['provenance', 'significance', 'holder'],
    fieldKeys: ['provenance', 'historicalSignificance', 'currentHolderId'],
  },
  {
    id: 'relationships',
    label: 'Relationships',
    defaultExpanded: false,
    searchKeywords: ['organizations', 'locations', 'related'],
    fieldKeys: ['relatedOrganizationIds', 'relatedLocationIds'],
  },
  {
    id: 'appearance',
    label: 'Appearance',
    defaultExpanded: false,
    searchKeywords: ['appearance', 'portrait', 'summary', 'tags'],
    fieldKeys: ['appearance.summary', 'appearance.portraitUrl'],
  },
  {
    id: 'document',
    label: 'Document',
    defaultExpanded: false,
    searchKeywords: ['parent', 'visibility', 'tags', 'entity type'],
    fieldKeys: [],
  },
];

const LOCATION_SECTIONS: InspectorSectionDef[] = [
  {
    id: 'identity',
    label: 'Identity',
    defaultExpanded: true,
    searchKeywords: ['type', 'region', 'known for', 'climate'],
    fieldKeys: ['locationType', 'region', 'knownFor', 'climate'],
  },
  {
    id: 'atlas',
    label: 'Atlas',
    defaultExpanded: false,
    searchKeywords: ['ruler', 'population', 'map', 'authority'],
    fieldKeys: ['rulerOrAuthority', 'population', 'mapPageId'],
  },
  {
    id: 'relationships',
    label: 'Relationships',
    defaultExpanded: false,
    searchKeywords: ['locations', 'related'],
    fieldKeys: ['relatedLocationIds'],
  },
  {
    id: 'document',
    label: 'Document',
    defaultExpanded: false,
    searchKeywords: ['parent', 'visibility', 'tags', 'entity type'],
    fieldKeys: [],
  },
];

const RULE_RESOURCE_SECTIONS: InspectorSectionDef[] = [
  {
    id: 'identity',
    label: 'Identity',
    defaultExpanded: true,
    searchKeywords: ['type', 'scope', 'summary', 'tags'],
    fieldKeys: ['resourceType', 'scope', 'summary', 'topicTags'],
  },
  {
    id: 'document',
    label: 'Document',
    defaultExpanded: false,
    searchKeywords: ['parent', 'visibility', 'tags', 'entity type'],
    fieldKeys: [],
  },
];

const THREAD_SECTIONS: InspectorSectionDef[] = [
  {
    id: 'thread',
    label: 'Narrative thread',
    defaultExpanded: true,
    searchKeywords: ['kind', 'status', 'lifecycle', 'payoff', 'related'],
    fieldKeys: [],
  },
  {
    id: 'document',
    label: 'Document',
    defaultExpanded: false,
    searchKeywords: ['parent', 'visibility', 'tags'],
    fieldKeys: [],
  },
];

const QUEST_SECTIONS: InspectorSectionDef[] = [
  {
    id: 'quest',
    label: 'Quest',
    defaultExpanded: true,
    searchKeywords: ['status', 'type', 'date', 'giver', 'faction'],
    fieldKeys: [],
  },
  {
    id: 'rewards',
    label: 'Rewards',
    defaultExpanded: false,
    searchKeywords: ['rewards', 'loot', 'payment'],
    fieldKeys: [],
  },
  {
    id: 'document',
    label: 'Document',
    defaultExpanded: false,
    searchKeywords: ['parent', 'visibility', 'tags'],
    fieldKeys: [],
  },
];

const SCENE_SECTIONS: InspectorSectionDef[] = [
  {
    id: 'scene',
    label: 'Scene orchestration',
    defaultExpanded: true,
    searchKeywords: ['status', 'beat', 'participants', 'outcomes', 'conditions'],
    fieldKeys: [],
  },
  {
    id: 'document',
    label: 'Document',
    defaultExpanded: false,
    searchKeywords: ['parent', 'visibility', 'tags'],
    fieldKeys: [],
  },
];

const DEFAULT_SECTIONS: InspectorSectionDef[] = [
  {
    id: 'document',
    label: 'Document',
    defaultExpanded: true,
    searchKeywords: ['parent', 'visibility', 'tags', 'entity type'],
    fieldKeys: [],
  },
];

const SURFACE_PROFILES: Record<SurfaceProfileKey, EntitySurfaceProfile> = {
  character: {
    key: 'character',
    inspectorProfile: 'CHARACTER',
    typedInfobox: true,
    identityStrip: 'character',
    appearanceMode: 'full',
    appearanceCapabilities: APPEARANCE_CAPABILITIES_CHARACTER,
  },
  organization: {
    key: 'organization',
    inspectorProfile: 'ORGANIZATION',
    typedInfobox: true,
    identityStrip: 'organization',
    appearanceMode: 'full',
    appearanceCapabilities: APPEARANCE_CAPABILITIES_ORGANIZATION,
  },
  family: {
    key: 'family',
    inspectorProfile: 'FAMILY',
    typedInfobox: true,
    identityStrip: 'family',
    structureTab: 'family',
    appearanceMode: 'section',
    appearanceCapabilities: APPEARANCE_CAPABILITIES_FAMILY,
  },
  bestiary: {
    key: 'bestiary',
    inspectorProfile: 'BESTIARY',
    typedInfobox: true,
    identityStrip: 'bestiary',
    appearanceMode: 'full',
    appearanceCapabilities: APPEARANCE_CAPABILITIES_BESTIARY,
  },
  ancestry: {
    key: 'ancestry',
    inspectorProfile: 'ANCESTRY',
    typedInfobox: true,
    identityStrip: 'ancestry',
    appearanceMode: 'none',
    appearanceCapabilities: APPEARANCE_CAPABILITIES_NONE,
  },
  language: {
    key: 'language',
    inspectorProfile: 'LANGUAGE',
    typedInfobox: true,
    identityStrip: null,
    appearanceMode: 'none',
    appearanceCapabilities: APPEARANCE_CAPABILITIES_NONE,
  },
  object: {
    key: 'object',
    inspectorProfile: 'OBJECT',
    typedInfobox: true,
    identityStrip: 'object',
    appearanceMode: 'section',
    appearanceCapabilities: APPEARANCE_CAPABILITIES_OBJECT,
  },
  location: {
    key: 'location',
    inspectorProfile: 'LOCATION',
    typedInfobox: true,
    identityStrip: 'location',
    appearanceMode: 'full',
    appearanceCapabilities: APPEARANCE_CAPABILITIES_LOCATION,
  },
  'rule-resource': {
    key: 'rule-resource',
    inspectorProfile: 'RULE_RESOURCE',
    typedInfobox: true,
    identityStrip: 'rule-resource',
    appearanceMode: 'none',
    appearanceCapabilities: APPEARANCE_CAPABILITIES_NONE,
  },
  quest: {
    key: 'quest',
    inspectorProfile: 'QUEST',
    typedInfobox: false,
    identityStrip: null,
    appearanceMode: 'none',
    appearanceCapabilities: APPEARANCE_CAPABILITIES_NONE,
  },
  thread: {
    key: 'thread',
    inspectorProfile: 'THREAD',
    typedInfobox: false,
    identityStrip: null,
    appearanceMode: 'none',
    appearanceCapabilities: APPEARANCE_CAPABILITIES_NONE,
  },
  scene: {
    key: 'scene',
    inspectorProfile: 'SCENE',
    typedInfobox: false,
    identityStrip: null,
    appearanceMode: 'none',
    appearanceCapabilities: APPEARANCE_CAPABILITIES_NONE,
  },
  default: {
    key: 'default',
    inspectorProfile: 'DEFAULT',
    typedInfobox: false,
    identityStrip: null,
    appearanceMode: 'none',
    appearanceCapabilities: APPEARANCE_CAPABILITIES_NONE,
  },
};

export function getSurfaceProfile(profileKey: SurfaceProfileKey): EntitySurfaceProfile {
  return SURFACE_PROFILES[profileKey];
}

export function getAppearanceMode(profile: EntitySurfaceProfile): AppearanceMode {
  return profile.appearanceMode;
}

export function getAppearanceCapabilities(
  profile: EntitySurfaceProfile,
): AppearanceCapabilities {
  return profile.appearanceCapabilities;
}

export function supportsAppearanceDetails(profile: EntitySurfaceProfile): boolean {
  return profile.appearanceCapabilities.details;
}

export function getInspectorSectionsForProfile(
  profile: InspectorProfile,
): InspectorSectionDef[] {
  let sections: InspectorSectionDef[];
  switch (profile) {
    case 'CHARACTER':
      sections = CHARACTER_SECTIONS;
      break;
    case 'ORGANIZATION':
      sections = ORGANIZATION_SECTIONS;
      break;
    case 'FAMILY':
      sections = FAMILY_SECTIONS;
      break;
    case 'BESTIARY':
      sections = BESTIARY_SECTIONS;
      break;
    case 'ANCESTRY':
      sections = ANCESTRY_SECTIONS;
      break;
    case 'LANGUAGE':
      sections = DEFAULT_SECTIONS;
      break;
    case 'OBJECT':
      sections = OBJECT_SECTIONS;
      break;
    case 'LOCATION':
      sections = LOCATION_SECTIONS;
      break;
    case 'RULE_RESOURCE':
      sections = RULE_RESOURCE_SECTIONS;
      break;
    case 'QUEST':
      sections = QUEST_SECTIONS;
      break;
    case 'THREAD':
      sections = THREAD_SECTIONS;
      break;
    case 'SCENE':
      sections = SCENE_SECTIONS;
      break;
    default:
      sections = DEFAULT_SECTIONS;
  }
  return withInterpretiveLoreSections(sections);
}

function isPageUnderCategoryTitle(
  pageId: string,
  flatPages: WikiTreeNode[],
  categoryTitle: string,
): boolean {
  const pageById = new Map(flatPages.map((p) => [p.id, p]));
  let current = pageById.get(pageId)?.parentId ?? null;
  const visited = new Set<string>();
  while (current) {
    if (visited.has(current)) break;
    visited.add(current);
    const node = pageById.get(current);
    if (!node) break;
    if (node.title === categoryTitle) return true;
    current = node.parentId;
  }
  return false;
}

export function resolveSurfaceProfileKey(input: {
  pageId: string;
  templateType: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
}): SurfaceProfileKey {
  const { pageId, templateType, metadata, flatPages } = input;

  if (isPageUnderNarrativeThreadsCategory(pageId, flatPages)) return 'thread';
  if (isPageUnderQuestsCategory(pageId, flatPages)) return 'quest';
  if (
    templateType === 'SCENE' ||
    isSceneMetadataPresent(metadata) ||
    isPageUnderNarrativeScenesCategory(pageId, flatPages)
  ) {
    return 'scene';
  }
  if (isPageUnderOrganizationsCategory(pageId, flatPages)) return 'organization';
  if (isPageUnderFamiliesCategory(pageId, flatPages)) return 'family';

  const entityCategory = normalizeEntityCategoryKey(
    metadata && typeof metadata === 'object'
      ? (metadata as Record<string, unknown>).entityCategory as string | undefined
      : null,
  );
  if (
    entityCategory === 'characters' ||
    isPageUnderCategoryTitle(pageId, flatPages, 'Characters')
  ) {
    return 'character';
  }
  if (entityCategory === 'bestiary' || isPageUnderCategoryTitle(pageId, flatPages, 'Bestiary')) {
    return 'bestiary';
  }
  if (entityCategory === 'ancestries' || isPageUnderCategoryTitle(pageId, flatPages, 'Ancestries')) {
    return 'ancestry';
  }
  if (entityCategory === 'languages' || isPageUnderCategoryTitle(pageId, flatPages, 'Languages')) {
    return 'language';
  }
  if (entityCategory === 'objects' || isPageUnderCategoryTitle(pageId, flatPages, 'Objects')) {
    return 'object';
  }
  if (
    entityCategory === 'locations' ||
    isPageUnderCategoryTitle(pageId, flatPages, 'Locations')
  ) {
    return 'location';
  }
  if (
    entityCategory === 'rules-resources' ||
    isPageUnderCategoryTitle(pageId, flatPages, 'Rules/Resources')
  ) {
    return 'rule-resource';
  }

  return 'default';
}

export function resolveEntitySurfaceProfile(input: {
  pageId: string;
  templateType: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
}): EntitySurfaceProfile {
  return getSurfaceProfile(resolveSurfaceProfileKey(input));
}

/** Entity types that use the shared entity workspace composition (not generic codex). */
export const ENTITY_WORKSPACE_SURFACE_KEYS = new Set<SurfaceProfileKey>([
  'character',
  'organization',
  'family',
  'bestiary',
  'ancestry',
  'object',
  'location',
]);

export function isEntityWorkspacePage(key: SurfaceProfileKey): boolean {
  return ENTITY_WORKSPACE_SURFACE_KEYS.has(key);
}

export function usesTypedInfobox(profile: EntitySurfaceProfile): boolean {
  return profile.typedInfobox;
}

export const TYPED_INFOBOX_SURFACE_KEYS = new Set<SurfaceProfileKey>([
  'character',
  'organization',
  'family',
  'bestiary',
  'ancestry',
  'object',
  'location',
  'rule-resource',
]);

export function getInspectorProfileLabel(profile: InspectorProfile): string {
  switch (profile) {
    case 'CHARACTER':
      return 'Character';
    case 'ORGANIZATION':
      return 'Organization';
    case 'FAMILY':
      return 'Family';
    case 'BESTIARY':
      return 'Bestiary';
    case 'ANCESTRY':
      return 'Ancestry';
    case 'LANGUAGE':
      return 'Language';
    case 'OBJECT':
      return 'Object';
    case 'LOCATION':
      return 'Location';
    case 'RULE_RESOURCE':
      return 'Rules/Resources';
    case 'QUEST':
      return 'Quest';
    case 'THREAD':
      return 'Narrative thread';
    case 'SCENE':
      return 'Scene';
    default:
      return 'Document';
  }
}

export function resolveSectionForFocusField(
  profile: InspectorProfile,
  focusField: string | null | undefined,
): string | null {
  if (!focusField) return null;
  const sections = getInspectorSectionsForProfile(profile);
  for (const section of sections) {
    if (section.fieldKeys?.includes(focusField)) {
      return section.id;
    }
  }
  if (focusField.startsWith('appearance.')) return 'appearance';
  if (focusField === 'pronouns') return 'identity';
  if (focusField === 'gender') return 'appearance';
  if (focusField === 'familyId') return 'relationships';
  return 'identity';
}
