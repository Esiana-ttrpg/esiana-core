/**
 * Browser-safe chronology domain constants (no sibling shared imports).
 * Used by Vite frontend; re-exported from chronologyTypes.ts for backend.
 */
export const ChronologyDomainKind = {
  WORLD_EVENT: 'world_event',
  SESSION_CHRONICLE: 'session_chronicle',
  MAP_KEYFRAME: 'map_keyframe',
  LORE_REFERENCE: 'lore_reference',
  ORG_RELATION: 'org_relation',
  QUEST_TRANSITION: 'quest_transition',
  FACTION_CONTROL: 'faction_control',
  WORLD_ADVANCE: 'world_advance',
  DOWNTIME_PERIOD: 'downtime_period',
} as const;

export type ChronologyDomainKindValue =
  (typeof ChronologyDomainKind)[keyof typeof ChronologyDomainKind];
