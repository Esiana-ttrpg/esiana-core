import type { InfoboxField } from '@/types/wiki';
import { parseCharacterMetadata } from '@/lib/characterMetadata';
import { parseCharacterLineageMetadata } from '@/lib/characterLineageMetadata';
import { parseOrganizationMetadata } from '@/lib/organizationMetadata';
import { parseFamilyMetadata } from '@/lib/familyMetadata';
import { parseBestiaryMetadata } from '@/lib/bestiaryMetadata';
import { parseAncestryMetadata } from '@/lib/ancestryMetadata';
import { parseObjectMetadata } from '@/lib/objectMetadata';
import { parseLocationMetadata } from '@/lib/locationMetadata';
import { parseRuleResourceMetadata } from '@/lib/ruleResourceMetadata';
import { formatCharacterStatusLabel, resolveCharacterStatus } from '@/lib/characterMetadata';
import { readEntityCategoryFromMetadata } from '@shared/wikiTemplateType';
import type { SurfaceProfileKey } from '@/lib/entitySurfaceProfile';
import type { WikiTreeNode } from '@/types/wiki';

function pageTitle(flatPages: WikiTreeNode[], id: string | null): string {
  if (!id) return '';
  return flatPages.find((p) => p.id === id)?.title ?? id;
}

function pageTitles(flatPages: WikiTreeNode[], ids: string[]): string {
  return ids
    .map((id) => pageTitle(flatPages, id))
    .filter(Boolean)
    .join(', ');
}

function profileKeyFromMetadata(metadata: unknown): SurfaceProfileKey | null {
  const category = readEntityCategoryFromMetadata(metadata);
  if (category === 'characters') return 'character';
  if (category === 'organizations') return 'organization';
  if (category === 'families') return 'family';
  if (category === 'bestiary') return 'bestiary';
  if (category === 'ancestries') return 'ancestry';
  if (category === 'objects') return 'object';
  if (category === 'locations') return 'location';
  if (category === 'rules-resources') return 'rule-resource';
  return null;
}

export function buildInfoboxProjection(
  _templateType: string,
  metadata: unknown,
  flatPages: WikiTreeNode[],
  surfaceProfileKey?: SurfaceProfileKey | null,
): InfoboxField[] {
  const profileKey = surfaceProfileKey ?? profileKeyFromMetadata(metadata);

  if (profileKey === 'character') {
    const identity = parseCharacterMetadata(metadata);
    const lineage = parseCharacterLineageMetadata(metadata);
    const status = resolveCharacterStatus(identity, lineage);
    const fields: InfoboxField[] = [];
    if (identity.profession) fields.push({ key: 'Role', value: identity.profession });
    if (identity.title) fields.push({ key: 'Title', value: identity.title });
    const ancestryPage = pageTitle(flatPages, identity.ancestryId);
    const lineagePage = pageTitle(flatPages, identity.lineageId);
    if (lineagePage) fields.push({ key: 'Lineage', value: lineagePage });
    if (ancestryPage) fields.push({ key: 'Ancestry', value: ancestryPage });
    else if (identity.ancestry) fields.push({ key: 'Ancestry', value: identity.ancestry });
    if (status) fields.push({ key: 'Status', value: formatCharacterStatusLabel(status) });
    const aff = pageTitle(flatPages, identity.primaryAffiliationId);
    if (aff) fields.push({ key: 'Affiliation', value: aff });
    const family = pageTitle(flatPages, lineage.familyId);
    if (family) fields.push({ key: 'Family', value: family });
    const loc = pageTitle(flatPages, identity.currentLocationId);
    if (loc) fields.push({ key: 'Location', value: loc });
    if (identity.knownFor) fields.push({ key: 'Known for', value: identity.knownFor });
    return fields;
  }

  if (profileKey === 'organization') {
    const org = parseOrganizationMetadata(metadata);
    const fields: InfoboxField[] = [];
    if (org.orgType) fields.push({ key: 'Type', value: org.orgType });
    if (org.region) fields.push({ key: 'Region', value: org.region });
    if (org.motto) fields.push({ key: 'Motto', value: org.motto });
    if (org.motivation) fields.push({ key: 'Motivation', value: org.motivation });
    const leader = pageTitle(flatPages, org.leaderId);
    if (leader) fields.push({ key: 'Leader', value: leader });
    const hq = pageTitle(flatPages, org.headquartersId);
    if (hq) fields.push({ key: 'Headquarters', value: hq });
    const parent = pageTitle(flatPages, org.parentOrgId);
    if (parent) fields.push({ key: 'Parent', value: parent });
    return fields;
  }

  if (profileKey === 'family') {
    const family = parseFamilyMetadata(metadata);
    const fields: InfoboxField[] = [];
    if (family.familyType) fields.push({ key: 'Type', value: family.familyType });
    if (family.status) fields.push({ key: 'Status', value: family.status });
    if (family.region) fields.push({ key: 'Region', value: family.region });
    const head = pageTitle(flatPages, family.headCharacterId);
    if (head) fields.push({ key: 'Head', value: head });
    const seat = pageTitle(flatPages, family.seatLocationId);
    if (seat) fields.push({ key: 'Seat', value: seat });
    if (family.coatOfArms) fields.push({ key: 'Coat of arms', value: family.coatOfArms });
    return fields;
  }

  if (profileKey === 'bestiary') {
    const bestiary = parseBestiaryMetadata(metadata);
    const fields: InfoboxField[] = [];
    if (bestiary.creatureType) fields.push({ key: 'Type', value: bestiary.creatureType });
    if (bestiary.habitat) fields.push({ key: 'Habitat', value: bestiary.habitat });
    if (bestiary.threatLevel) fields.push({ key: 'Threat', value: bestiary.threatLevel });
    if (bestiary.region) fields.push({ key: 'Region', value: bestiary.region });
    if (bestiary.intelligence) fields.push({ key: 'Intelligence', value: bestiary.intelligence });
    if (bestiary.knownFor) fields.push({ key: 'Known for', value: bestiary.knownFor });
    if (bestiary.alsoKnownAs) fields.push({ key: 'Also known as', value: bestiary.alsoKnownAs });
    if (bestiary.temperament) fields.push({ key: 'Temperament', value: bestiary.temperament });
    if (bestiary.encounterConditions) {
      fields.push({ key: 'Encounter conditions', value: bestiary.encounterConditions });
    }
    if (bestiary.encounterRate) fields.push({ key: 'Encounter rate', value: bestiary.encounterRate });
    if (bestiary.activePeriods.length > 0) {
      fields.push({ key: 'Active periods', value: bestiary.activePeriods.join(', ') });
    }
    if (bestiary.weaknesses.length > 0) {
      fields.push({ key: 'Weaknesses', value: bestiary.weaknesses.join(', ') });
    }
    if (bestiary.resistances.length > 0) {
      fields.push({ key: 'Resistances', value: bestiary.resistances.join(', ') });
    }
    if (bestiary.immunities.length > 0) {
      fields.push({ key: 'Immunities', value: bestiary.immunities.join(', ') });
    }
    if (bestiary.factionAlignment) {
      fields.push({ key: 'Faction alignment', value: bestiary.factionAlignment });
    }
    if (bestiary.corruptionAffinity) {
      fields.push({ key: 'Corruption affinity', value: bestiary.corruptionAffinity });
    }
    if (bestiary.behaviorSummary) {
      fields.push({ key: 'Behavior', value: bestiary.behaviorSummary });
    }
    const creatures = pageTitles(flatPages, bestiary.relatedCreatureIds);
    if (creatures) fields.push({ key: 'Related creatures', value: creatures });
    const locations = pageTitles(flatPages, bestiary.relatedLocationIds);
    if (locations) fields.push({ key: 'Related locations', value: locations });
    return fields;
  }

  if (profileKey === 'ancestry') {
    const ancestry = parseAncestryMetadata(metadata);
    const fields: InfoboxField[] = [];
    fields.push({
      key: 'Kind',
      value: ancestry.entityKind === 'root' ? 'Root Ancestry' : ancestry.entityKind,
    });
    const parent = pageTitle(flatPages, ancestry.parentAncestryId);
    if (parent) fields.push({ key: 'Parent', value: parent });
    if (ancestry.identitySummary) {
      fields.push({ key: 'Summary', value: ancestry.identitySummary });
    }
    if (ancestry.ancestryType) fields.push({ key: 'Type', value: ancestry.ancestryType });
    const homelands = pageTitles(flatPages, ancestry.homelandRegionIds);
    if (homelands) {
      fields.push({ key: 'Primarily found in', value: homelands });
    } else if (ancestry.homeland) {
      fields.push({ key: 'Homeland', value: ancestry.homeland });
    }
    if (ancestry.region) fields.push({ key: 'Region', value: ancestry.region });
    if (ancestry.language) fields.push({ key: 'Language', value: ancestry.language });
    if (ancestry.knownFor) fields.push({ key: 'Known for', value: ancestry.knownFor });
    if (ancestry.baselineTraits.length > 0 || ancestry.addedTraits.length > 0) {
      const traits = [...ancestry.baselineTraits, ...ancestry.addedTraits];
      fields.push({ key: 'Traits', value: traits.join(', ') });
    }
    const related = pageTitles(flatPages, ancestry.relatedAncestryIds);
    if (related) fields.push({ key: 'Related ancestries', value: related });
    const locations = pageTitles(flatPages, ancestry.relatedLocationIds);
    if (locations) fields.push({ key: 'Related locations', value: locations });
    if (ancestry.appearance.summary) {
      fields.push({ key: 'Appearance', value: ancestry.appearance.summary });
    }
    return fields;
  }

  if (profileKey === 'object') {
    const object = parseObjectMetadata(metadata);
    const fields: InfoboxField[] = [];
    if (object.objectType) fields.push({ key: 'Type', value: object.objectType });
    if (object.historicalSignificance) {
      fields.push({ key: 'Significance', value: object.historicalSignificance });
    }
    if (object.investedOrMagical) {
      fields.push({ key: 'Invested/Magical', value: object.investedOrMagical });
    }
    const holder = pageTitle(flatPages, object.currentHolderId);
    if (holder) fields.push({ key: 'Holder', value: holder });
    if (object.knownFor) fields.push({ key: 'Known for', value: object.knownFor });
    if (object.provenance) fields.push({ key: 'Provenance', value: object.provenance });
    if (object.powersSummary) fields.push({ key: 'Powers', value: object.powersSummary });
    const orgs = pageTitles(flatPages, object.relatedOrganizationIds);
    if (orgs) fields.push({ key: 'Related organizations', value: orgs });
    const locations = pageTitles(flatPages, object.relatedLocationIds);
    if (locations) fields.push({ key: 'Related locations', value: locations });
    if (object.appearance.summary) {
      fields.push({ key: 'Appearance', value: object.appearance.summary });
    }
    return fields;
  }

  if (profileKey === 'location') {
    const location = parseLocationMetadata(metadata);
    const fields: InfoboxField[] = [];
    if (location.locationType) fields.push({ key: 'Type', value: location.locationType });
    if (location.region) fields.push({ key: 'Region', value: location.region });
    if (location.rulerOrAuthority) fields.push({ key: 'Ruler', value: location.rulerOrAuthority });
    if (location.population) fields.push({ key: 'Population', value: location.population });
    if (location.climate) fields.push({ key: 'Climate', value: location.climate });
    if (location.knownFor) fields.push({ key: 'Known for', value: location.knownFor });
    const mapPage = pageTitle(flatPages, location.mapPageId);
    if (mapPage) fields.push({ key: 'Map', value: mapPage });
    const related = pageTitles(flatPages, location.relatedLocationIds);
    if (related) fields.push({ key: 'Related locations', value: related });
    return fields;
  }

  if (profileKey === 'rule-resource') {
    const resource = parseRuleResourceMetadata(metadata);
    const fields: InfoboxField[] = [];
    if (resource.resourceType) fields.push({ key: 'Type', value: resource.resourceType });
    if (resource.scope) fields.push({ key: 'Scope', value: resource.scope });
    if (resource.summary) fields.push({ key: 'Summary', value: resource.summary });
    if (resource.topicTags.length > 0) {
      fields.push({ key: 'Tags', value: resource.topicTags.join(', ') });
    }
    return fields;
  }

  return [];
}
