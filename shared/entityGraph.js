"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityRelationDirections = exports.EntityRelationSourceDomains = exports.EntityRelationKinds = exports.EntityGraphEntityTypes = exports.GRAPH_SEMANTICS_VERSION = exports.EDGE_TAXONOMY_VERSION = void 0;
exports.nodeRefKey = nodeRefKey;
exports.parseNodeRefKey = parseNodeRefKey;
exports.isUndirectedRelationKind = isUndirectedRelationKind;
exports.buildUndirectedRecordKeys = buildUndirectedRecordKeys;
exports.parseEntityRelationPayload = parseEntityRelationPayload;
exports.EDGE_TAXONOMY_VERSION = 'entity-graph-v2';
exports.GRAPH_SEMANTICS_VERSION = 'graph-semantics-v2';
exports.EntityGraphEntityTypes = {
    WIKI_PAGE: 'wiki_page',
    CALENDAR_EVENT: 'calendar_event',
    MAP_PIN: 'map_pin',
    MAP_SCENE_OBJECT: 'map_scene_object',
    SCENE: 'scene',
    CLUE: 'clue',
};
exports.EntityRelationKinds = {
    WIKI_REFERENCE: 'WIKI_REFERENCE',
    ORG_DIPLOMATIC: 'ORG_DIPLOMATIC',
    ORG_PARENT: 'ORG_PARENT',
    ANCESTRY_PARENT: 'ANCESTRY_PARENT',
    CHARACTER_ANCESTRY: 'CHARACTER_ANCESTRY',
    ORG_LEADER: 'ORG_LEADER',
    ORG_HQ: 'ORG_HQ',
    CHARACTER_AFFILIATION: 'CHARACTER_AFFILIATION',
    CHARACTER_LINEAGE: 'CHARACTER_LINEAGE',
    CHARACTER_SOCIAL: 'CHARACTER_SOCIAL',
    QUEST_GIVER: 'QUEST_GIVER',
    QUEST_FACTION: 'QUEST_FACTION',
    THREAD_RELATED: 'THREAD_RELATED',
    THREAD_PAYOFF: 'THREAD_PAYOFF',
    SCENE_PARTICIPANT: 'SCENE_PARTICIPANT',
    SCENE_LOCATION: 'SCENE_LOCATION',
    SCENE_QUEST: 'SCENE_QUEST',
    SCENE_CLUE: 'SCENE_CLUE',
    SCENE_THREAD: 'SCENE_THREAD',
    SCENE_FOLLOWS: 'SCENE_FOLLOWS',
    ARC_CONTAINS: 'ARC_CONTAINS',
    QUESTLINE_CONTAINS: 'QUESTLINE_CONTAINS',
    QUEST_OBJECTIVE: 'QUEST_OBJECTIVE',
    OBJECTIVE_SCENE: 'OBJECTIVE_SCENE',
    LOCATION_RELATED: 'LOCATION_RELATED',
    LOCATION_REGION: 'LOCATION_REGION',
    LOCATION_MAP: 'LOCATION_MAP',
    CALENDAR_PREREQUISITE: 'CALENDAR_PREREQUISITE',
    MAP_TARGETS: 'MAP_TARGETS',
    PAGE_PARENT: 'PAGE_PARENT',
    HAVEN_LOCATION: 'HAVEN_LOCATION',
    HAVEN_RESIDENT: 'HAVEN_RESIDENT',
    HAVEN_FACTION: 'HAVEN_FACTION',
    HAVEN_RELATED: 'HAVEN_RELATED',
    HAVEN_REFERENCE: 'HAVEN_REFERENCE',
};
exports.EntityRelationSourceDomains = {
    WIKI_LINK: 'wiki_link',
    WIKI_METADATA: 'wiki_metadata',
    CALENDAR: 'calendar',
    MAP: 'map',
    DOWNTIME: 'downtime',
};
exports.EntityRelationDirections = {
    DIRECTED: 'directed',
    UNDIRECTED_HALF: 'undirected_half',
};
function nodeRefKey(ref) {
    return `${ref.entityType}:${ref.entityId}`;
}
function parseNodeRefKey(key) {
    const idx = key.indexOf(':');
    if (idx <= 0)
        return null;
    const entityType = key.slice(0, idx);
    const entityId = key.slice(idx + 1);
    if (!entityId)
        return null;
    return { entityType, entityId };
}
function isUndirectedRelationKind(kind) {
    return kind === exports.EntityRelationKinds.LOCATION_RELATED;
}
function buildUndirectedRecordKeys(baseKey) {
    return {
        forward: `${baseKey}:forward`,
        reverse: `${baseKey}:reverse`,
    };
}
function parseEntityRelationPayload(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return null;
    const kind = raw.kind;
    if (typeof kind !== 'string')
        return null;
    if (!Object.values(exports.EntityRelationKinds).includes(kind))
        return null;
    return raw;
}
//# sourceMappingURL=entityGraph.js.map