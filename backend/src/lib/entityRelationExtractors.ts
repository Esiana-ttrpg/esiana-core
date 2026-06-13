import type { Prisma } from '@prisma/client';
import type { ChronologyDateParts } from '../../../shared/chronologyTypes.js';
import {
  EntityGraphEntityTypes,
  EntityRelationDirections,
  EntityRelationKinds,
  EntityRelationSourceDomains,
  buildUndirectedRecordKeys,
  type EntityRelationDirection,
  type EntityRelationKind,
  type EntityRelationPayload,
  type EntityRelationSourceDomain,
} from '../../../shared/entityGraph.js';
import { parseCharacterLineageMetadata } from './characterLineageMetadata.js';
import { parseLocationMetadata } from './locationMetadata.js';
import { parseOrganizationMetadata } from './organizationMetadata.js';
import { parseAncestryMetadata } from './ancestryMetadata.js';
import { parseCharacterMetadata } from './characterMetadata.js';
import { parseQuestMetadata } from './questMetadata.js';
import { parseSceneMetadata } from './sceneMetadata.js';
import { parseArcMetadata } from '../../../shared/arcMetadata.js';
import { isObjectiveMetadataPresent } from '../../../shared/objectiveMetadata.js';
import { parseThreadMetadata } from './threadMetadata.js';
import {
  parseDowntimeHavenFields,
  type HavenReferenceEntry,
} from '../../../shared/havenMetadata.js';
import type { NarrativeRelationType } from '../../../shared/narrativeRelationSemantics.js';

export type EntityRelationDraft = {
  sourceEntityType: string;
  sourceEntityId: string;
  targetEntityType: string;
  targetEntityId: string;
  relationKind: EntityRelationKind;
  direction: EntityRelationDirection;
  startDate: ChronologyDateParts | null;
  endDate: ChronologyDateParts | null;
  visibility: string | null;
  payload: EntityRelationPayload;
  sourceDomain: EntityRelationSourceDomain;
  sourceRecordKey: string;
  sourcePageId: string | null;
};

const WIKI = EntityGraphEntityTypes.WIKI_PAGE;
const CALENDAR = EntityGraphEntityTypes.CALENDAR_EVENT;
const MAP_PIN = EntityGraphEntityTypes.MAP_PIN;

function pushDirected(
  rows: EntityRelationDraft[],
  input: Omit<EntityRelationDraft, 'direction'>,
): void {
  rows.push({ ...input, direction: EntityRelationDirections.DIRECTED });
}

function pushUndirectedPair(
  rows: EntityRelationDraft[],
  base: Omit<
    EntityRelationDraft,
    'direction' | 'sourceRecordKey' | 'sourceEntityType' | 'sourceEntityId' | 'targetEntityType' | 'targetEntityId'
  >,
  sourcePageId: string,
  targetPageId: string,
  baseRecordKey: string,
): void {
  const keys = buildUndirectedRecordKeys(baseRecordKey);
  rows.push({
    ...base,
    sourceEntityType: WIKI,
    sourceEntityId: sourcePageId,
    targetEntityType: WIKI,
    targetEntityId: targetPageId,
    sourceRecordKey: keys.forward,
    direction: EntityRelationDirections.UNDIRECTED_HALF,
  });
  rows.push({
    ...base,
    sourceEntityType: WIKI,
    sourceEntityId: targetPageId,
    targetEntityType: WIKI,
    targetEntityId: sourcePageId,
    sourceRecordKey: keys.reverse,
    direction: EntityRelationDirections.UNDIRECTED_HALF,
  });
}

export interface WikiPageGraphExtractInput {
  pageId: string;
  title: string;
  parentId: string | null;
  metadata: unknown;
  wikiLinks: Array<{
    id: string;
    targetPageId: string;
    aliasText: string | null;
    targetTitle?: string | null;
  }>;
}

export function extractWikiPageGraphEdges(input: WikiPageGraphExtractInput): EntityRelationDraft[] {
  const rows: EntityRelationDraft[] = [];
  const { pageId, title, parentId, metadata, wikiLinks } = input;

  for (const link of wikiLinks) {
    pushDirected(rows, {
      sourceEntityType: WIKI,
      sourceEntityId: pageId,
      targetEntityType: WIKI,
      targetEntityId: link.targetPageId,
      relationKind: EntityRelationKinds.WIKI_REFERENCE,
      startDate: null,
      endDate: null,
      visibility: null,
      payload: {
        kind: EntityRelationKinds.WIKI_REFERENCE,
        aliasText: link.aliasText ?? undefined,
        preview: {
          sourceLabel: title,
          targetLabel: link.targetTitle ?? undefined,
        },
      },
      sourceDomain: EntityRelationSourceDomains.WIKI_LINK,
      sourceRecordKey: `wiki_link:${link.id}`,
      sourcePageId: pageId,
    });
  }

  if (parentId) {
    pushDirected(rows, {
      sourceEntityType: WIKI,
      sourceEntityId: pageId,
      targetEntityType: WIKI,
      targetEntityId: parentId,
      relationKind: EntityRelationKinds.PAGE_PARENT,
      startDate: null,
      endDate: null,
      visibility: null,
      payload: { kind: EntityRelationKinds.PAGE_PARENT, preview: { sourceLabel: title } },
      sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
      sourceRecordKey: `page_parent:${pageId}`,
      sourcePageId: pageId,
    });
  }

  const org = parseOrganizationMetadata(metadata);
  if (org.leaderId) {
    pushDirected(rows, {
      sourceEntityType: WIKI,
      sourceEntityId: pageId,
      targetEntityType: WIKI,
      targetEntityId: org.leaderId,
      relationKind: EntityRelationKinds.ORG_LEADER,
      startDate: null,
      endDate: null,
      visibility: null,
      payload: { kind: EntityRelationKinds.ORG_LEADER, preview: { sourceLabel: title } },
      sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
      sourceRecordKey: `org_leader:${pageId}`,
      sourcePageId: pageId,
    });
  }
  if (org.headquartersId) {
    pushDirected(rows, {
      sourceEntityType: WIKI,
      sourceEntityId: pageId,
      targetEntityType: WIKI,
      targetEntityId: org.headquartersId,
      relationKind: EntityRelationKinds.ORG_HQ,
      startDate: null,
      endDate: null,
      visibility: null,
      payload: { kind: EntityRelationKinds.ORG_HQ, preview: { sourceLabel: title } },
      sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
      sourceRecordKey: `org_hq:${pageId}`,
      sourcePageId: pageId,
    });
  }
  if (org.parentOrgId) {
    pushDirected(rows, {
      sourceEntityType: WIKI,
      sourceEntityId: pageId,
      targetEntityType: WIKI,
      targetEntityId: org.parentOrgId,
      relationKind: EntityRelationKinds.ORG_PARENT,
      startDate: null,
      endDate: null,
      visibility: null,
      payload: { kind: EntityRelationKinds.ORG_PARENT, preview: { sourceLabel: title } },
      sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
      sourceRecordKey: `org_parent:${pageId}`,
      sourcePageId: pageId,
    });
  }
  for (const locationId of [
    ...org.strongholdLocationIds,
    ...org.influenceRegionIds,
    ...org.activeTerritoryIds,
    ...org.hiddenEnclaveIds,
    ...org.tradeReachRegionIds,
    ...org.contestedZoneIds,
  ]) {
    pushUndirectedPair(
      rows,
      {
        relationKind: EntityRelationKinds.LOCATION_RELATED,
        startDate: null,
        endDate: null,
        visibility: null,
        payload: { kind: EntityRelationKinds.LOCATION_RELATED, preview: { sourceLabel: title } },
        sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
        sourcePageId: pageId,
      },
      pageId,
      locationId,
      `org_presence:${pageId}:${locationId}`,
    );
  }

  const ancestry = parseAncestryMetadata(metadata);
  const isAncestryPage =
    metadata &&
    typeof metadata === 'object' &&
    ((metadata as Record<string, unknown>).entityCategory === 'ancestries' ||
      (metadata as Record<string, unknown>).entityKind != null ||
      (metadata as Record<string, unknown>).parentAncestryId != null);
  if (isAncestryPage) {
    if (ancestry.parentAncestryId) {
      pushDirected(rows, {
        sourceEntityType: WIKI,
        sourceEntityId: pageId,
        targetEntityType: WIKI,
        targetEntityId: ancestry.parentAncestryId,
        relationKind: EntityRelationKinds.ANCESTRY_PARENT,
        startDate: null,
        endDate: null,
        visibility: null,
        payload: { kind: EntityRelationKinds.ANCESTRY_PARENT, preview: { sourceLabel: title } },
        sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
        sourceRecordKey: `ancestry_parent:${pageId}`,
        sourcePageId: pageId,
      });
    }
    if (ancestry.secondaryParentAncestryId) {
      pushDirected(rows, {
        sourceEntityType: WIKI,
        sourceEntityId: pageId,
        targetEntityType: WIKI,
        targetEntityId: ancestry.secondaryParentAncestryId,
        relationKind: EntityRelationKinds.ANCESTRY_PARENT,
        startDate: null,
        endDate: null,
        visibility: null,
        payload: { kind: EntityRelationKinds.ANCESTRY_PARENT, preview: { sourceLabel: title } },
        sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
        sourceRecordKey: `ancestry_secondary_parent:${pageId}`,
        sourcePageId: pageId,
      });
    }
    for (const relatedId of [
      ...ancestry.relatedAncestryIds,
      ...ancestry.relatedLocationIds,
      ...ancestry.relatedOrganizationIds,
      ...ancestry.homelandRegionIds,
      ...ancestry.communityRegionIds,
      ...ancestry.diasporaRegionIds,
      ...ancestry.languageIds,
    ]) {
      pushUndirectedPair(
        rows,
        {
          relationKind: EntityRelationKinds.LOCATION_RELATED,
          startDate: null,
          endDate: null,
          visibility: null,
          payload: { kind: EntityRelationKinds.LOCATION_RELATED, preview: { sourceLabel: title } },
          sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
          sourcePageId: pageId,
        },
        pageId,
        relatedId,
        `ancestry_related:${pageId}:${relatedId}`,
      );
    }
    for (const society of ancestry.societies) {
      for (const relatedId of [
        ...society.relatedLocationIds,
        ...society.relatedOrganizationIds,
        ...society.associatedLineageIds,
      ]) {
        pushUndirectedPair(
          rows,
          {
            relationKind: EntityRelationKinds.LOCATION_RELATED,
            startDate: null,
            endDate: null,
            visibility: null,
            payload: { kind: EntityRelationKinds.LOCATION_RELATED, preview: { sourceLabel: title } },
            sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
            sourcePageId: pageId,
          },
          pageId,
          relatedId,
          `ancestry_society:${society.id}:${relatedId}`,
        );
      }
    }
  }

  const characterIdentity = parseCharacterMetadata(metadata);
  if (characterIdentity.ancestryId) {
    pushDirected(rows, {
      sourceEntityType: WIKI,
      sourceEntityId: pageId,
      targetEntityType: WIKI,
      targetEntityId: characterIdentity.ancestryId,
      relationKind: EntityRelationKinds.CHARACTER_ANCESTRY,
      startDate: null,
      endDate: null,
      visibility: null,
      payload: { kind: EntityRelationKinds.CHARACTER_ANCESTRY, preview: { sourceLabel: title } },
      sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
      sourceRecordKey: `character_ancestry:${pageId}`,
      sourcePageId: pageId,
    });
  }
  if (characterIdentity.lineageId) {
    pushDirected(rows, {
      sourceEntityType: WIKI,
      sourceEntityId: pageId,
      targetEntityType: WIKI,
      targetEntityId: characterIdentity.lineageId,
      relationKind: EntityRelationKinds.CHARACTER_ANCESTRY,
      startDate: null,
      endDate: null,
      visibility: null,
      payload: { kind: EntityRelationKinds.CHARACTER_ANCESTRY, preview: { sourceLabel: title } },
      sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
      sourceRecordKey: `character_lineage:${pageId}`,
      sourcePageId: pageId,
    });
  }

  for (const rel of org.relations) {
    for (const event of rel.history) {
      pushDirected(rows, {
        sourceEntityType: WIKI,
        sourceEntityId: pageId,
        targetEntityType: WIKI,
        targetEntityId: rel.targetOrgId,
        relationKind: EntityRelationKinds.ORG_DIPLOMATIC,
        startDate: event.effectiveDate,
        endDate: null,
        visibility: event.visibility,
        payload: {
          kind: EntityRelationKinds.ORG_DIPLOMATIC,
          stance: event.stance,
          relationType: event.relationType,
          note: event.note ?? undefined,
          preview: { sourceLabel: title },
        },
        sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
        sourceRecordKey: `org_relation:${pageId}:${rel.id}:${event.id}`,
        sourcePageId: pageId,
      });
    }
  }

  const lineage = parseCharacterLineageMetadata(metadata);
  for (const aff of lineage.orgAffiliations) {
    pushDirected(rows, {
      sourceEntityType: WIKI,
      sourceEntityId: pageId,
      targetEntityType: WIKI,
      targetEntityId: aff.orgId,
      relationKind: EntityRelationKinds.CHARACTER_AFFILIATION,
      startDate: aff.startDate,
      endDate: aff.endDate,
      visibility: aff.visibility,
      payload: {
        kind: EntityRelationKinds.CHARACTER_AFFILIATION,
        role: aff.role,
        preview: { sourceLabel: title },
      },
      sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
      sourceRecordKey: `character_affiliation:${pageId}:${aff.id}`,
      sourcePageId: pageId,
    });
  }

  for (const link of lineage.parentLinks) {
    pushDirected(rows, {
      sourceEntityType: WIKI,
      sourceEntityId: pageId,
      targetEntityType: WIKI,
      targetEntityId: link.targetCharacterId,
      relationKind: EntityRelationKinds.CHARACTER_LINEAGE,
      startDate: link.startDate ?? null,
      endDate: link.endDate ?? null,
      visibility: link.visibility,
      payload: {
        kind: EntityRelationKinds.CHARACTER_LINEAGE,
        relationshipType: link.relationshipType,
        linkKind: 'parent',
        preview: { sourceLabel: title },
      },
      sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
      sourceRecordKey: `character_lineage_parent:${pageId}:${link.id}`,
      sourcePageId: pageId,
    });
  }

  for (const link of lineage.spouseLinks) {
    pushDirected(rows, {
      sourceEntityType: WIKI,
      sourceEntityId: pageId,
      targetEntityType: WIKI,
      targetEntityId: link.targetCharacterId,
      relationKind: EntityRelationKinds.CHARACTER_LINEAGE,
      startDate: link.startDate ?? null,
      endDate: link.endDate ?? null,
      visibility: link.visibility,
      payload: {
        kind: EntityRelationKinds.CHARACTER_LINEAGE,
        relationshipType: link.relationshipType,
        linkKind: 'spouse',
        preview: { sourceLabel: title },
      },
      sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
      sourceRecordKey: `character_lineage_spouse:${pageId}:${link.id}`,
      sourcePageId: pageId,
    });
  }

  for (const social of lineage.socialLinks) {
    pushDirected(rows, {
      sourceEntityType: WIKI,
      sourceEntityId: pageId,
      targetEntityType: WIKI,
      targetEntityId: social.targetPageId,
      relationKind: EntityRelationKinds.CHARACTER_SOCIAL,
      startDate: social.startDate ?? null,
      endDate: social.endDate ?? null,
      visibility: social.visibility,
      payload: {
        kind: EntityRelationKinds.CHARACTER_SOCIAL,
        narrativeType: social.narrativeType as NarrativeRelationType,
        semantics: {
          narrativeType: social.narrativeType as NarrativeRelationType,
          strength: social.strength ?? undefined,
          polarity: social.polarity ?? undefined,
          context: social.context ?? undefined,
          provenance: 'explicit',
        },
        preview: { sourceLabel: title },
      },
      sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
      sourceRecordKey: `character_social:${pageId}:${social.id}`,
      sourcePageId: pageId,
    });
  }

  const quest = parseQuestMetadata(metadata);
  if (quest.questGiverId) {
    pushDirected(rows, {
      sourceEntityType: WIKI,
      sourceEntityId: pageId,
      targetEntityType: WIKI,
      targetEntityId: quest.questGiverId,
      relationKind: EntityRelationKinds.QUEST_GIVER,
      startDate: null,
      endDate: null,
      visibility: null,
      payload: { kind: EntityRelationKinds.QUEST_GIVER, preview: { sourceLabel: title } },
      sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
      sourceRecordKey: `quest_giver:${pageId}`,
      sourcePageId: pageId,
    });
  }
  if (quest.factionId) {
    pushDirected(rows, {
      sourceEntityType: WIKI,
      sourceEntityId: pageId,
      targetEntityType: WIKI,
      targetEntityId: quest.factionId,
      relationKind: EntityRelationKinds.QUEST_FACTION,
      startDate: null,
      endDate: null,
      visibility: null,
      payload: { kind: EntityRelationKinds.QUEST_FACTION, preview: { sourceLabel: title } },
      sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
      sourceRecordKey: `quest_faction:${pageId}`,
      sourcePageId: pageId,
    });
  }

  const thread = parseThreadMetadata(metadata);
  for (const relatedId of thread.relatedPageIds) {
    pushDirected(rows, {
      sourceEntityType: WIKI,
      sourceEntityId: pageId,
      targetEntityType: WIKI,
      targetEntityId: relatedId,
      relationKind: EntityRelationKinds.THREAD_RELATED,
      startDate: null,
      endDate: null,
      visibility: null,
      payload: { kind: EntityRelationKinds.THREAD_RELATED, preview: { sourceLabel: title } },
      sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
      sourceRecordKey: `thread_related:${pageId}:${relatedId}`,
      sourcePageId: pageId,
    });
  }
  if (thread.payoffPageId) {
    pushDirected(rows, {
      sourceEntityType: WIKI,
      sourceEntityId: pageId,
      targetEntityType: WIKI,
      targetEntityId: thread.payoffPageId,
      relationKind: EntityRelationKinds.THREAD_PAYOFF,
      startDate: null,
      endDate: null,
      visibility: null,
      payload: { kind: EntityRelationKinds.THREAD_PAYOFF, preview: { sourceLabel: title } },
      sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
      sourceRecordKey: `thread_payoff:${pageId}`,
      sourcePageId: pageId,
    });
  }

  const scene = parseSceneMetadata(metadata);
  for (const participantId of scene.participantPageIds) {
    pushDirected(rows, {
      sourceEntityType: WIKI,
      sourceEntityId: pageId,
      targetEntityType: WIKI,
      targetEntityId: participantId,
      relationKind: EntityRelationKinds.SCENE_PARTICIPANT,
      startDate: null,
      endDate: null,
      visibility: null,
      payload: { kind: EntityRelationKinds.SCENE_PARTICIPANT, preview: { sourceLabel: title } },
      sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
      sourceRecordKey: `scene_participant:${pageId}:${participantId}`,
      sourcePageId: pageId,
    });
  }
  if (scene.locationPageId) {
    pushDirected(rows, {
      sourceEntityType: WIKI,
      sourceEntityId: pageId,
      targetEntityType: WIKI,
      targetEntityId: scene.locationPageId,
      relationKind: EntityRelationKinds.SCENE_LOCATION,
      startDate: null,
      endDate: null,
      visibility: null,
      payload: { kind: EntityRelationKinds.SCENE_LOCATION, preview: { sourceLabel: title } },
      sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
      sourceRecordKey: `scene_location:${pageId}`,
      sourcePageId: pageId,
    });
  }
  for (const questId of scene.linkedQuestPageIds) {
    pushDirected(rows, {
      sourceEntityType: WIKI,
      sourceEntityId: pageId,
      targetEntityType: WIKI,
      targetEntityId: questId,
      relationKind: EntityRelationKinds.SCENE_QUEST,
      startDate: null,
      endDate: null,
      visibility: null,
      payload: { kind: EntityRelationKinds.SCENE_QUEST, preview: { sourceLabel: title } },
      sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
      sourceRecordKey: `scene_quest:${pageId}:${questId}`,
      sourcePageId: pageId,
    });
  }
  for (const objectiveId of scene.linkedObjectivePageIds) {
    pushDirected(rows, {
      sourceEntityType: WIKI,
      sourceEntityId: pageId,
      targetEntityType: WIKI,
      targetEntityId: objectiveId,
      relationKind: EntityRelationKinds.OBJECTIVE_SCENE,
      startDate: null,
      endDate: null,
      visibility: null,
      payload: { kind: EntityRelationKinds.OBJECTIVE_SCENE, preview: { sourceLabel: title } },
      sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
      sourceRecordKey: `objective_scene:${pageId}:${objectiveId}`,
      sourcePageId: pageId,
    });
  }
  for (const clueId of scene.linkedCluePageIds) {
    pushDirected(rows, {
      sourceEntityType: WIKI,
      sourceEntityId: pageId,
      targetEntityType: WIKI,
      targetEntityId: clueId,
      relationKind: EntityRelationKinds.SCENE_CLUE,
      startDate: null,
      endDate: null,
      visibility: null,
      payload: { kind: EntityRelationKinds.SCENE_CLUE, preview: { sourceLabel: title } },
      sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
      sourceRecordKey: `scene_clue:${pageId}:${clueId}`,
      sourcePageId: pageId,
    });
  }
  for (const threadId of scene.linkedThreadPageIds) {
    pushDirected(rows, {
      sourceEntityType: WIKI,
      sourceEntityId: pageId,
      targetEntityType: WIKI,
      targetEntityId: threadId,
      relationKind: EntityRelationKinds.SCENE_THREAD,
      startDate: null,
      endDate: null,
      visibility: null,
      payload: { kind: EntityRelationKinds.SCENE_THREAD, preview: { sourceLabel: title } },
      sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
      sourceRecordKey: `scene_thread:${pageId}:${threadId}`,
      sourcePageId: pageId,
    });
  }
  for (const followsId of scene.followsScenePageIds) {
    pushDirected(rows, {
      sourceEntityType: WIKI,
      sourceEntityId: pageId,
      targetEntityType: WIKI,
      targetEntityId: followsId,
      relationKind: EntityRelationKinds.SCENE_FOLLOWS,
      startDate: null,
      endDate: null,
      visibility: null,
      payload: { kind: EntityRelationKinds.SCENE_FOLLOWS, preview: { sourceLabel: title } },
      sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
      sourceRecordKey: `scene_follows:${pageId}:${followsId}`,
      sourcePageId: pageId,
    });
  }

  const arc = parseArcMetadata(metadata);
  const arcRelationKind =
    arc.arcKind === 'questline'
      ? EntityRelationKinds.QUESTLINE_CONTAINS
      : EntityRelationKinds.ARC_CONTAINS;
  for (const containedId of arc.containedPageIds) {
    pushDirected(rows, {
      sourceEntityType: WIKI,
      sourceEntityId: pageId,
      targetEntityType: WIKI,
      targetEntityId: containedId,
      relationKind: arcRelationKind,
      startDate: null,
      endDate: null,
      visibility: null,
      payload: { kind: arcRelationKind, preview: { sourceLabel: title } },
      sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
      sourceRecordKey: `arc_contains:${pageId}:${containedId}`,
      sourcePageId: pageId,
    });
  }

  if (parentId && isObjectiveMetadataPresent(metadata)) {
    pushDirected(rows, {
      sourceEntityType: WIKI,
      sourceEntityId: parentId,
      targetEntityType: WIKI,
      targetEntityId: pageId,
      relationKind: EntityRelationKinds.QUEST_OBJECTIVE,
      startDate: null,
      endDate: null,
      visibility: null,
      payload: { kind: EntityRelationKinds.QUEST_OBJECTIVE, preview: { sourceLabel: title } },
      sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
      sourceRecordKey: `quest_objective:${parentId}:${pageId}`,
      sourcePageId: pageId,
    });
  }

  const location = parseLocationMetadata(metadata);
  if (location.regionPageId) {
    pushDirected(rows, {
      sourceEntityType: WIKI,
      sourceEntityId: pageId,
      targetEntityType: WIKI,
      targetEntityId: location.regionPageId,
      relationKind: EntityRelationKinds.LOCATION_REGION,
      startDate: null,
      endDate: null,
      visibility: null,
      payload: { kind: EntityRelationKinds.LOCATION_REGION, preview: { sourceLabel: title } },
      sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
      sourceRecordKey: `location_region:${pageId}`,
      sourcePageId: pageId,
    });
  }
  if (location.mapPageId) {
    pushDirected(rows, {
      sourceEntityType: WIKI,
      sourceEntityId: pageId,
      targetEntityType: WIKI,
      targetEntityId: location.mapPageId,
      relationKind: EntityRelationKinds.LOCATION_MAP,
      startDate: null,
      endDate: null,
      visibility: null,
      payload: { kind: EntityRelationKinds.LOCATION_MAP, preview: { sourceLabel: title } },
      sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
      sourceRecordKey: `location_map:${pageId}`,
      sourcePageId: pageId,
    });
  }
  for (const relatedId of location.relatedLocationIds) {
    if (relatedId === pageId) continue;
    pushUndirectedPair(
      rows,
      {
        relationKind: EntityRelationKinds.LOCATION_RELATED,
        startDate: null,
        endDate: null,
        visibility: null,
        payload: { kind: EntityRelationKinds.LOCATION_RELATED, preview: { sourceLabel: title } },
        sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
        sourcePageId: pageId,
      },
      pageId,
      relatedId,
      `location_related:${pageId}:${relatedId}`,
    );
  }

  return rows;
}

export function extractCalendarPrerequisiteEdge(input: {
  eventId: string;
  prerequisiteId: string;
  eventTitle?: string | null;
  prerequisiteTitle?: string | null;
}): EntityRelationDraft | null {
  if (!input.prerequisiteId) return null;
  return {
    sourceEntityType: CALENDAR,
    sourceEntityId: input.eventId,
    targetEntityType: CALENDAR,
    targetEntityId: input.prerequisiteId,
    relationKind: EntityRelationKinds.CALENDAR_PREREQUISITE,
    direction: EntityRelationDirections.DIRECTED,
    startDate: null,
    endDate: null,
    visibility: null,
    payload: {
      kind: EntityRelationKinds.CALENDAR_PREREQUISITE,
      preview: {
        sourceLabel: input.eventTitle ?? undefined,
        targetLabel: input.prerequisiteTitle ?? undefined,
      },
    },
    sourceDomain: EntityRelationSourceDomains.CALENDAR,
    sourceRecordKey: `calendar_prereq:${input.eventId}`,
    sourcePageId: null,
  };
}

export function extractMapPinTargetEdge(input: {
  pinId: string;
  targetPageId: string;
  pinType?: string | null;
  label?: string | null;
  targetTitle?: string | null;
}): EntityRelationDraft | null {
  if (!input.targetPageId) return null;
  return {
    sourceEntityType: MAP_PIN,
    sourceEntityId: input.pinId,
    targetEntityType: WIKI,
    targetEntityId: input.targetPageId,
    relationKind: EntityRelationKinds.MAP_TARGETS,
    direction: EntityRelationDirections.DIRECTED,
    startDate: null,
    endDate: null,
    visibility: null,
    payload: {
      kind: EntityRelationKinds.MAP_TARGETS,
      pinType: input.pinType ?? null,
      label: input.label ?? null,
      preview: { targetLabel: input.targetTitle ?? undefined },
    },
    sourceDomain: EntityRelationSourceDomains.MAP,
    sourceRecordKey: `map_pin:${input.pinId}`,
    sourcePageId: null,
  };
}

function resolveHavenReferenceTarget(
  ref: HavenReferenceEntry,
): { targetEntityType: string; targetEntityId: string } | null {
  if (!ref.targetId) return null;
  if (ref.targetType === 'wiki_page') {
    return { targetEntityType: WIKI, targetEntityId: ref.targetId };
  }
  if (ref.targetType === 'calendar_event') {
    return { targetEntityType: CALENDAR, targetEntityId: ref.targetId };
  }
  if (ref.targetType === 'map_pin') {
    return { targetEntityType: MAP_PIN, targetEntityId: ref.targetId };
  }
  return null;
}

export function extractDowntimeHavenGraphEdges(input: {
  havenId: string;
  wikiPageId: string;
  locationPageId: string | null;
  residentPageIds: string[];
  factionPageIds: string[];
  relatedPageIds: string[];
  references: HavenReferenceEntry[];
}): EntityRelationDraft[] {
  const rows: EntityRelationDraft[] = [];
  const sourcePageId = input.wikiPageId;
  const base = {
    sourceEntityType: WIKI,
    sourceEntityId: input.wikiPageId,
    startDate: null,
    endDate: null,
    visibility: null,
    sourceDomain: EntityRelationSourceDomains.DOWNTIME,
    sourcePageId,
  } as const;

  if (input.locationPageId) {
    pushDirected(rows, {
      ...base,
      targetEntityType: WIKI,
      targetEntityId: input.locationPageId,
      relationKind: EntityRelationKinds.HAVEN_LOCATION,
      payload: { kind: EntityRelationKinds.HAVEN_LOCATION },
      sourceRecordKey: `haven:${input.havenId}:location:${input.locationPageId}`,
    });
  }

  for (const pageId of input.residentPageIds) {
    pushDirected(rows, {
      ...base,
      targetEntityType: WIKI,
      targetEntityId: pageId,
      relationKind: EntityRelationKinds.HAVEN_RESIDENT,
      payload: { kind: EntityRelationKinds.HAVEN_RESIDENT },
      sourceRecordKey: `haven:${input.havenId}:resident:${pageId}`,
    });
  }

  for (const pageId of input.factionPageIds) {
    pushDirected(rows, {
      ...base,
      targetEntityType: WIKI,
      targetEntityId: pageId,
      relationKind: EntityRelationKinds.HAVEN_FACTION,
      payload: { kind: EntityRelationKinds.HAVEN_FACTION },
      sourceRecordKey: `haven:${input.havenId}:faction:${pageId}`,
    });
  }

  for (const pageId of input.relatedPageIds) {
    pushDirected(rows, {
      ...base,
      targetEntityType: WIKI,
      targetEntityId: pageId,
      relationKind: EntityRelationKinds.HAVEN_RELATED,
      payload: { kind: EntityRelationKinds.HAVEN_RELATED },
      sourceRecordKey: `haven:${input.havenId}:related:${pageId}`,
    });
  }

  for (const ref of input.references) {
    const target = resolveHavenReferenceTarget(ref);
    if (!target) continue;
    pushDirected(rows, {
      ...base,
      targetEntityType: target.targetEntityType,
      targetEntityId: target.targetEntityId,
      relationKind: EntityRelationKinds.HAVEN_REFERENCE,
      payload: {
        kind: EntityRelationKinds.HAVEN_REFERENCE,
        referenceType: ref.type,
        title: ref.title,
      },
      sourceRecordKey: `haven:${input.havenId}:reference:${ref.id}`,
    });
  }

  return rows;
}

export function extractDowntimeHavenGraphEdgesFromRow(row: {
  id: string;
  wikiPageId: string;
  locationPageId: string | null;
  residentPageIds: unknown;
  factionPageIds: unknown;
  relatedPageIds: unknown;
  references: unknown;
  identityHints: unknown;
  spaces: unknown;
  havenType: string;
  status: string;
  scale: string | null;
  ownershipType: string | null;
  primaryTheme: string | null;
  establishedAt: Date | null;
  discoveryState: string | null;
  crew: unknown;
  upgrades: unknown;
  threats: unknown;
  passiveBenefits: unknown;
  activityLog: unknown;
  simulationHints: unknown;
  semanticsVersion: string;
}): EntityRelationDraft[] {
  const fields = parseDowntimeHavenFields({
    semanticsVersion: row.semanticsVersion,
    havenType: row.havenType,
    status: row.status,
    locationPageId: row.locationPageId,
    scale: row.scale,
    ownershipType: row.ownershipType,
    primaryTheme: row.primaryTheme,
    establishedAt: row.establishedAt?.toISOString() ?? null,
    discoveryState: row.discoveryState,
    residentPageIds: row.residentPageIds,
    factionPageIds: row.factionPageIds,
    crew: row.crew,
    upgrades: row.upgrades,
    threats: row.threats,
    passiveBenefits: row.passiveBenefits,
    activityLog: row.activityLog,
    relatedPageIds: row.relatedPageIds,
    identityHints: row.identityHints,
    references: row.references,
    spaces: row.spaces,
    simulationHints: row.simulationHints,
  });

  return extractDowntimeHavenGraphEdges({
    havenId: row.id,
    wikiPageId: row.wikiPageId,
    locationPageId: fields.locationPageId,
    residentPageIds: fields.residentPageIds,
    factionPageIds: fields.factionPageIds,
    relatedPageIds: fields.relatedPageIds,
    references: fields.references,
  });
}

export function draftsToCreateManyData(
  campaignId: string,
  drafts: EntityRelationDraft[],
): Prisma.EntityRelationCreateManyInput[] {
  return drafts.map((draft) => ({
    campaignId,
    sourceEntityType: draft.sourceEntityType,
    sourceEntityId: draft.sourceEntityId,
    targetEntityType: draft.targetEntityType,
    targetEntityId: draft.targetEntityId,
    relationKind: draft.relationKind,
    direction: draft.direction,
    startDate: draft.startDate as Prisma.InputJsonValue,
    endDate: draft.endDate as Prisma.InputJsonValue,
    visibility: draft.visibility,
    payload: draft.payload as Prisma.InputJsonValue,
    sourceDomain: draft.sourceDomain,
    sourceRecordKey: draft.sourceRecordKey,
    sourcePageId: draft.sourcePageId,
  }));
}
