/**
 * Browser-safe chronology domain constants (no sibling shared imports).
 * Used by Vite frontend; re-exported from chronologyTypes.ts for backend.
 */
export declare const ChronologyDomainKind: {
    readonly WORLD_EVENT: "world_event";
    readonly SESSION_CHRONICLE: "session_chronicle";
    readonly MAP_KEYFRAME: "map_keyframe";
    readonly LORE_REFERENCE: "lore_reference";
    readonly ORG_RELATION: "org_relation";
    readonly QUEST_TRANSITION: "quest_transition";
    readonly FACTION_CONTROL: "faction_control";
    readonly WORLD_ADVANCE: "world_advance";
    readonly DOWNTIME_PERIOD: "downtime_period";
};
export type ChronologyDomainKindValue = (typeof ChronologyDomainKind)[keyof typeof ChronologyDomainKind];
//# sourceMappingURL=chronologyDomainKinds.d.ts.map