"use strict";
/**
 * Layer 1 — narrative relation semantics (browser-safe).
 * Canonical meaning layer for Relations workspace projections.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NARRATIVE_RELATION_TYPES = exports.NARRATIVE_RELATION_SEMANTICS_VERSION = void 0;
exports.stanceToPolarity = stanceToPolarity;
exports.lineageTypeToNarrativeType = lineageTypeToNarrativeType;
exports.NARRATIVE_RELATION_SEMANTICS_VERSION = 'narrative-relation-semantics-v1';
exports.NARRATIVE_RELATION_TYPES = [
    'alliance',
    'rival',
    'command',
    'member',
    'parent',
    'progenitor',
    'guardian',
    'mentor',
    'heir',
    'successor',
    'bonded',
    'patron',
    'debtor',
    'worships',
    'subordinate',
    'spouse',
    'neutral',
    'unknown',
];
function stanceToPolarity(stance) {
    const s = (stance ?? '').trim().toUpperCase();
    if (s === 'ALLY' || s === 'VASSAL')
        return 'positive';
    if (s === 'HOSTILE' || s === 'SECRET_HOSTILE' || s === 'AT_WAR')
        return 'negative';
    if (s === 'NEUTRAL' || s === 'UNKNOWN')
        return 'neutral';
    return 'ambivalent';
}
function lineageTypeToNarrativeType(relationshipType, linkKind = 'parent') {
    const upper = relationshipType.trim().toUpperCase();
    if (linkKind === 'spouse' || upper === 'MARRIAGE')
        return 'spouse';
    if (upper === 'ADOPTIVE' || upper === 'RAISED_BY')
        return 'guardian';
    if (upper === 'MENTOR')
        return 'mentor';
    if (upper === 'PROGENITOR' || upper === 'BIOLOGICAL')
        return 'progenitor';
    if (upper === 'SUCCESSOR' || upper === 'HEIR')
        return 'successor';
    if (upper === 'BONDED' || upper === 'SWORN')
        return 'bonded';
    if (upper === 'CREATOR')
        return 'progenitor';
    if (upper === 'GUARDIAN')
        return 'guardian';
    return 'parent';
}
//# sourceMappingURL=narrativeRelationSemantics.js.map