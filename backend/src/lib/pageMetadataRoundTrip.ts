/**
 * Generic wiki page metadata ↔ markdown frontmatter round-trip.
 * Keys are collected from *Metadata parser modules — update when parsers gain fields.
 */

export const FRONTMATTER_PAGE_KEYS = new Set([
  'title',
  'blurb',
  'tags',
  'template',
  'templateType',
  'visibility',
  'parent',
  'parentKey',
  'slug',
  'esiana_id',
  'parent_esiana_id',
  'esiana_created_at',
  'esiana_updated_at',
  'date',
  'mapAssetId',
  'mapAssetPath',
  'havenFields',
  'projectFields',
]);

/** Keys stored as JSON strings in frontmatter (objects / arrays). */
export const PAGE_METADATA_JSON_KEYS = new Set([
  'appearance',
  'partyParticipation',
  'questDate',
  'ledgerReward',
  'relations',
  'inheritedTraits',
  'parentLinks',
  'spouseLinks',
  'birthDate',
  'deathDate',
  'successionStart',
  'successionEnd',
  'orgAffiliations',
  'socialLinks',
  'fields',
  'relatedPageIds',
  'strongholdLocationIds',
  'influenceRegionIds',
  'activeTerritoryIds',
  'hiddenEnclaveIds',
  'tradeReachRegionIds',
  'contestedZoneIds',
  'eraTrajectories',
  'relatedLocationIds',
  'relatedCreatureIds',
  'relatedOrganizationIds',
  'relatedAncestryIds',
  'participantPageIds',
  'linkedQuestPageIds',
  'linkedObjectivePageIds',
  'linkedCluePageIds',
  'linkedThreadPageIds',
  'consequencePageIds',
  'followsScenePageIds',
  'containedPageIds',
  'outcomes',
  'entryConditions',
  'exitConditions',
  'pacingTags',
  'baselineTraits',
  'addedTraits',
  'suppressedTraits',
  'homelandRegionIds',
  'communityRegionIds',
  'diasporaRegionIds',
  'populationPresence',
  'societies',
  'havenFields',
  'projectFields',
  'eventConsequences',
  'downtimeOperationPosture',
  'currentPressures',
  'worldState',
]);

/** Union of page-metadata keys that round-trip through packs (derived from parser modules). */
export const PAGE_METADATA_ROUND_TRIP_KEYS = new Set([
  // Character + lineage
  'profession',
  'title',
  'primaryAffiliationId',
  'ancestry',
  'ancestryId',
  'lineageId',
  'currentLocationId',
  'status',
  'knownFor',
  'activeArc',
  'motivation',
  'partyParticipation',
  'appearance',
  'firstName',
  'lastName',
  'entityCategory',
  'gender',
  'pronouns',
  'familyId',
  'parentLinks',
  'spouseLinks',
  'birthDate',
  'deathDate',
  'successionStart',
  'successionEnd',
  'lineageRole',
  'houseBranch',
  'bloodlineStatus',
  'legitimacy',
  'orgAffiliations',
  'socialLinks',
  // Quest
  'questStatus',
  'boardOrder',
  'questType',
  'questDate',
  'questGiverId',
  'factionId',
  'rewardsText',
  'dmRewardsText',
  'ledgerReward',
  // Thread
  'threadMetadataVersion',
  'threadKind',
  'threadStatus',
  'narrativeWeight',
  'relatedPageIds',
  'introducedSessionId',
  'lastAdvancedSessionId',
  'resolvedSessionId',
  'payoffPageId',
  'playerSubmitted',
  'sortOrder',
  'emotionalResidueKind',
  // Organization
  'orgType',
  'motto',
  'publicPurpose',
  'privateAgenda',
  'leaderId',
  'headquartersId',
  'parentOrgId',
  'region',
  'relations',
  'organizationStatus',
  'statusEffectiveDate',
  'statusReason',
  'worldState',
  'currentPressures',
  'operationalScale',
  'methods',
  'publicReputation',
  'influenceMode',
  'organizationalVisibility',
  'structuralRole',
  'symbolPreset',
  'doctrineTint',
  'emblemAssetId',
  'strongholdLocationIds',
  'influenceRegionIds',
  'activeTerritoryIds',
  'hiddenEnclaveIds',
  'tradeReachRegionIds',
  'contestedZoneIds',
  'eraTrajectories',
  // Family
  'familyType',
  'headCharacterId',
  'seatLocationId',
  'coatOfArms',
  'inheritedTraits',
  // Location
  'locationType',
  'regionKey',
  'regionPageId',
  'dangerLevel',
  'rulerOrAuthority',
  'population',
  'climate',
  'mapPageId',
  'relatedLocationIds',
  // Object
  'objectType',
  'provenance',
  'historicalSignificance',
  'powersSummary',
  'investedOrMagical',
  'currentHolderId',
  // Bestiary
  'creatureType',
  'habitat',
  'threatLevel',
  'intelligence',
  'behaviorSummary',
  'alsoKnownAs',
  'temperament',
  'encounterConditions',
  'encounterRate',
  'activePeriods',
  'weaknesses',
  'resistances',
  'immunities',
  'factionAlignment',
  'corruptionAffinity',
  'relatedCreatureIds',
  // Ancestry
  'entityKind',
  'parentAncestryId',
  'secondaryParentAncestryId',
  'identitySummary',
  'ancestryType',
  'homeland',
  'traditions',
  'values',
  'reputation',
  'language',
  'baselineTraits',
  'addedTraits',
  'suppressedTraits',
  'lifespanMin',
  'lifespanMax',
  'physiologyTags',
  'languageIds',
  'senses',
  'movementModes',
  'climateAdaptations',
  'homelandRegionIds',
  'communityRegionIds',
  'diasporaRegionIds',
  'populationPresence',
  'relatedAncestryIds',
  'relatedOrganizationIds',
  'societies',
  // Scene
  'sceneMetadataVersion',
  'sceneStatus',
  'beatType',
  'tone',
  'pacingTags',
  'sceneKind',
  'summary',
  'entryConditions',
  'exitConditions',
  'outcomes',
  'participantPageIds',
  'locationPageId',
  'linkedQuestPageIds',
  'linkedObjectivePageIds',
  'linkedCluePageIds',
  'linkedThreadPageIds',
  'consequencePageIds',
  'followsScenePageIds',
  'plannedSessionId',
  'playedSessionId',
  'gmNotes',
  // Arc
  'arcMetadataVersion',
  'arcKind',
  'containedPageIds',
  'actIndex',
  'pacingTarget',
  // Objective
  'objectiveMetadataVersion',
  'objectiveStatus',
  // Rule resource
  'resourceType',
  'scope',
  'topicTags',
  // Session note
  'sessionNoteAuthorId',
  'sessionGroupId',
  'timelinePointId',
  'fantasyEpochMinute',
  'isSessionAnchor',
  'isSessionAuthor',
  // System / codex
  'systemCategoryKey',
  'fields',
  // Event lore
  'eventConsequences',
  'eventLoreAutoGenerated',
  // Downtime wiki posture
  'downtimeOperationPosture',
  // Satellite JSON sidecars on page frontmatter
  'havenFields',
  'projectFields',
]);

const METADATA_EXCLUDE_KEYS = new Set(['quickInfo', 'importMetadata', 'dmSecrets']);

export function isPageMetadataRoundTripKey(key: string): boolean {
  return PAGE_METADATA_ROUND_TRIP_KEYS.has(key);
}

function serializeMetadataValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (PAGE_METADATA_JSON_KEYS.has(key) || typeof value === 'object') {
    return JSON.stringify(value);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return String(value);
}

function tryParseJsonString(value: string): unknown | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    if (trimmed.includes('\\"')) {
      try {
        return JSON.parse(trimmed.replace(/\\"/g, '"')) as unknown;
      } catch {
        /* fall through */
      }
    }
    return undefined;
  }
}

function parseFrontMatterValue(key: string, raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (PAGE_METADATA_JSON_KEYS.has(key) || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const parsed = tryParseJsonString(trimmed);
    if (parsed !== undefined) return parsed;
    return trimmed;
  }
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (key === 'boardOrder' || key === 'sortOrder' || key === 'actIndex' || key === 'lifespanMin' || key === 'lifespanMax') {
    const n = Number(trimmed);
    if (Number.isFinite(n)) return n;
  }
  return trimmed;
}

export function metadataToFrontMatterFields(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!metadata || typeof metadata !== 'object') return out;

  if (Array.isArray(metadata.fields) && metadata.fields.length > 0) {
    const serialized = serializeMetadataValue('fields', metadata.fields);
    if (serialized !== null) out.fields = serialized;
  }

  for (const [key, value] of Object.entries(metadata)) {
    if (METADATA_EXCLUDE_KEYS.has(key)) continue;
    if (key === 'fields') continue;
    if (!isPageMetadataRoundTripKey(key)) continue;
    const serialized = serializeMetadataValue(key, value);
    if (serialized !== null) out[key] = serialized;
  }

  return out;
}

export function frontMatterFieldsToMetadata(
  customFields: Record<string, string>,
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};
  const codexFields: Array<{ key: string; value: string }> = [];

  for (const [key, value] of Object.entries(customFields)) {
    if (FRONTMATTER_PAGE_KEYS.has(key)) continue;
    if (key.startsWith('import_tag_')) continue;

    if (key === 'systemCategoryKey') {
      metadata.systemCategoryKey = value.trim();
      continue;
    }

    if (key === 'fields') {
      const parsed = parseFrontMatterValue(key, value);
      if (Array.isArray(parsed)) {
        metadata.fields = parsed;
      }
      continue;
    }

    if (isPageMetadataRoundTripKey(key)) {
      metadata[key] = parseFrontMatterValue(key, value);
      continue;
    }

    if (value.trim()) {
      codexFields.push({ key, value: value.trim() });
    }
  }

  if (codexFields.length > 0) {
    const existing = Array.isArray(metadata.fields)
      ? (metadata.fields as Array<{ key: string; value: string }>)
      : [];
    metadata.fields = [...existing, ...codexFields];
  }

  return metadata;
}

const SLUG_REF_PREFIX = 'slug:';
const ASSET_REF_PREFIX = 'asset:';

export function packSlugRef(slug: string): string {
  return `${SLUG_REF_PREFIX}${slug}`;
}

export function packAssetRef(relativePath: string): string {
  return `${ASSET_REF_PREFIX}${relativePath.replace(/^\/+/, '')}`;
}

export function isPackSlugRef(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(SLUG_REF_PREFIX);
}

export function isPackAssetRef(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(ASSET_REF_PREFIX);
}

export function resolvePackSlugRef(value: string, slugToId: Map<string, string>): string | null {
  if (!isPackSlugRef(value)) return value;
  const slug = value.slice(SLUG_REF_PREFIX.length).trim();
  return slugToId.get(slug) ?? null;
}

export function resolvePackAssetRef(
  value: string,
  assetPathToId: Map<string, string>,
): string | null {
  if (!isPackAssetRef(value)) return value;
  const rel = value.slice(ASSET_REF_PREFIX.length).trim();
  return assetPathToId.get(rel) ?? assetPathToId.get(rel.split('/').pop() ?? '') ?? null;
}

const PAGE_ID_ARRAY_KEYS = new Set([
  'relatedPageIds',
  'strongholdLocationIds',
  'influenceRegionIds',
  'activeTerritoryIds',
  'hiddenEnclaveIds',
  'tradeReachRegionIds',
  'contestedZoneIds',
  'relatedLocationIds',
  'relatedCreatureIds',
  'relatedOrganizationIds',
  'relatedAncestryIds',
  'participantPageIds',
  'linkedQuestPageIds',
  'linkedObjectivePageIds',
  'linkedCluePageIds',
  'linkedThreadPageIds',
  'consequencePageIds',
  'followsScenePageIds',
  'containedPageIds',
  'residentPageIds',
  'factionPageIds',
]);

const PAGE_ID_SCALAR_KEYS = new Set([
  'primaryAffiliationId',
  'ancestryId',
  'lineageId',
  'currentLocationId',
  'questGiverId',
  'factionId',
  'leaderId',
  'headquartersId',
  'parentOrgId',
  'headCharacterId',
  'seatLocationId',
  'regionPageId',
  'mapPageId',
  'currentHolderId',
  'parentAncestryId',
  'secondaryParentAncestryId',
  'locationPageId',
  'payoffPageId',
  'ownerPageId',
  'havenPageId',
  'familyId',
  'emblemAssetId',
  'introducedSessionId',
  'lastAdvancedSessionId',
  'resolvedSessionId',
  'plannedSessionId',
  'playedSessionId',
  'sessionNoteAuthorId',
  'sessionGroupId',
  'timelinePointId',
]);

function resolveIdValue(value: unknown, slugToId: Map<string, string>): unknown {
  if (typeof value === 'string' && isPackSlugRef(value)) {
    return resolvePackSlugRef(value, slugToId);
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string' && isPackSlugRef(item)) {
          return resolvePackSlugRef(item, slugToId);
        }
        return item;
      })
      .filter((item) => item !== null && item !== undefined);
  }
  return value;
}

export function resolvePageMetadataSlugRefs(
  metadata: Record<string, unknown>,
  slugToId: Map<string, string>,
): Record<string, unknown> {
  const resolved = { ...metadata };
  for (const key of PAGE_ID_SCALAR_KEYS) {
    if (key in resolved) {
      resolved[key] = resolveIdValue(resolved[key], slugToId);
    }
  }
  for (const key of PAGE_ID_ARRAY_KEYS) {
    if (key in resolved) {
      resolved[key] = resolveIdValue(resolved[key], slugToId);
    }
  }
  return resolved;
}

export function resolveAppearanceAssetRefs(
  appearance: unknown,
  assetPathToId: Map<string, string>,
): unknown {
  if (!appearance || typeof appearance !== 'object') return appearance;
  const app = { ...(appearance as Record<string, unknown>) };
  if (typeof app.portraitUrl === 'string' && isPackAssetRef(app.portraitUrl)) {
    const id = resolvePackAssetRef(app.portraitUrl, assetPathToId);
    if (id) app.portraitUrl = `/api/assets/${id}`;
  }
  const gallery = app.gallery;
  if (gallery && typeof gallery === 'object' && Array.isArray((gallery as { entries?: unknown }).entries)) {
    const entries = (
      (gallery as { entries: Array<Record<string, unknown>> }).entries
    ).map((entry) => {
      if (typeof entry.imageUrl === 'string' && isPackAssetRef(entry.imageUrl)) {
        const id = resolvePackAssetRef(entry.imageUrl, assetPathToId);
        if (id) return { ...entry, imageUrl: `/api/assets/${id}` };
      }
      return entry;
    });
    app.gallery = { entries };
  }
  return app;
}
