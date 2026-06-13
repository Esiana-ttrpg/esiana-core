"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BEATS_BY_DRAMATIC_GROUP = exports.ESCALATION_ROLE_BEATS = exports.TOPOLOGY_ESCALATION_BEATS = exports.PIVOT_CHOICE_BEATS = exports.PIVOT_REVEAL_BEATS = exports.NARRATIVE_BEAT_DRAMATIC_GROUP = exports.NARRATIVE_BEAT_HINTS = exports.NARRATIVE_BEAT_LABELS = exports.NARRATIVE_BEAT_GROUP_HINTS = exports.NARRATIVE_BEAT_GROUP_LABELS = exports.NARRATIVE_BEAT_DRAMATIC_GROUPS = void 0;
exports.narrativeBeatDramaticGroup = narrativeBeatDramaticGroup;
exports.formatNarrativeBeatLabel = formatNarrativeBeatLabel;
exports.normalizeSceneBeatTypeFilter = normalizeSceneBeatTypeFilter;
exports.beatsInDramaticGroup = beatsInDramaticGroup;
/**
 * Layer 5 — dramatic beat taxonomy (structural role, not emotional tone).
 * @see docs/platform/narrative-scenes.md
 */
const sceneMetadata_js_1 = require("./sceneMetadata.js");
exports.NARRATIVE_BEAT_DRAMATIC_GROUPS = [
    'setup',
    'escalation',
    'pivot',
    'resolution',
];
exports.NARRATIVE_BEAT_GROUP_LABELS = {
    setup: 'Setup',
    escalation: 'Escalation',
    pivot: 'Pivot',
    resolution: 'Resolution',
};
exports.NARRATIVE_BEAT_GROUP_HINTS = {
    setup: 'Grounds context before pressure builds',
    escalation: 'Raises stakes or narrows options',
    pivot: 'Reframes information or opens agency',
    resolution: 'Closes a dramatic thread structurally',
};
exports.NARRATIVE_BEAT_LABELS = {
    setup: 'Setup',
    complication: 'Complication',
    escalation: 'Escalation',
    loss: 'Loss',
    fallout: 'Fallout',
    reveal: 'Reveal',
    twist: 'Twist',
    reversal: 'Reversal',
    choice: 'Choice',
    resolution: 'Resolution',
};
exports.NARRATIVE_BEAT_HINTS = {
    setup: 'Establishes baseline situation or intent for what follows',
    complication: 'Introduces a new obstacle or constraint on the plan',
    escalation: 'Increases pressure, cost, or urgency in the sequence',
    loss: 'Removes an asset, ally, or option from play',
    fallout: 'Surfaces consequences from prior beats',
    reveal: 'Surfaces information that changes understanding',
    twist: 'Reframes prior assumptions with new information',
    reversal: 'Inverts power, position, or expected direction',
    choice: 'Presents a meaningful fork in player agency',
    resolution: 'Structurally closes a beat, thread, or story pressure',
};
exports.NARRATIVE_BEAT_DRAMATIC_GROUP = {
    setup: 'setup',
    complication: 'escalation',
    escalation: 'escalation',
    loss: 'escalation',
    fallout: 'escalation',
    reveal: 'pivot',
    twist: 'pivot',
    reversal: 'pivot',
    choice: 'pivot',
    resolution: 'resolution',
};
/** Beats that reframe or expose information (topology: reveal clustering). */
exports.PIVOT_REVEAL_BEATS = ['reveal', 'twist'];
/** Beats that grant player agency (topology: choice corridor). */
exports.PIVOT_CHOICE_BEATS = ['choice'];
/** Beats that raise pressure (topology: escalation drought — legacy pair). */
exports.TOPOLOGY_ESCALATION_BEATS = ['complication', 'escalation'];
/** Full escalation dramatic role group (UI / filters). */
exports.ESCALATION_ROLE_BEATS = [
    'complication',
    'escalation',
    'loss',
    'fallout',
];
exports.BEATS_BY_DRAMATIC_GROUP = {
    setup: ['setup'],
    escalation: ['complication', 'escalation', 'loss', 'fallout'],
    pivot: ['reveal', 'twist', 'reversal', 'choice'],
    resolution: ['resolution'],
};
function narrativeBeatDramaticGroup(beatType) {
    if (typeof beatType !== 'string' || !beatType.trim())
        return null;
    const key = beatType.trim().toLowerCase();
    return exports.NARRATIVE_BEAT_DRAMATIC_GROUP[key] ?? null;
}
function formatNarrativeBeatLabel(beatType) {
    if (typeof beatType !== 'string' || !beatType.trim())
        return null;
    const key = beatType.trim().toLowerCase();
    return exports.NARRATIVE_BEAT_LABELS[key] ?? null;
}
function normalizeSceneBeatTypeFilter(raw) {
    if (!Array.isArray(raw))
        return [];
    const beats = [];
    for (const entry of raw) {
        if (typeof entry !== 'string')
            continue;
        const key = entry.trim().toLowerCase();
        if (sceneMetadata_js_1.SCENE_BEAT_TYPES.includes(key)) {
            beats.push(key);
        }
    }
    return [...new Set(beats)];
}
function beatsInDramaticGroup(group) {
    return exports.BEATS_BY_DRAMATIC_GROUP[group];
}
//# sourceMappingURL=narrativeBeatTypes.js.map