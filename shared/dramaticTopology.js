"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeDramaticTopology = analyzeDramaticTopology;
exports.sceneMetadataToSequenceEntry = sceneMetadataToSequenceEntry;
const narrativeBeatTypes_js_1 = require("./narrativeBeatTypes.js");
const CHOICE_BEATS = [...narrativeBeatTypes_js_1.PIVOT_CHOICE_BEATS];
const REVEAL_BEATS = [...narrativeBeatTypes_js_1.PIVOT_REVEAL_BEATS];
const ESCALATION_BEATS = [...narrativeBeatTypes_js_1.TOPOLOGY_ESCALATION_BEATS];
function analyzeDramaticTopology(sequence) {
    const findings = [];
    if (sequence.length === 0)
        return findings;
    let consecutiveReveals = 0;
    for (const entry of sequence) {
        if (entry.beatType && REVEAL_BEATS.includes(entry.beatType)) {
            consecutiveReveals += 1;
            if (consecutiveReveals >= 3) {
                findings.push({
                    kind: 'reveal_clustering',
                    severity: 'warning',
                    message: 'Three or more reveal beats occur consecutively without player agency',
                    sceneIds: sequence
                        .slice(Math.max(0, sequence.indexOf(entry) - 2), sequence.indexOf(entry) + 1)
                        .map((s) => s.sceneId),
                });
            }
        }
        else if (entry.beatType && CHOICE_BEATS.includes(entry.beatType)) {
            consecutiveReveals = 0;
        }
    }
    const hasEscalation = sequence.some((s) => (s.beatType && ESCALATION_BEATS.includes(s.beatType)) ||
        s.outcomes.includes('threat_progression') ||
        s.outcomes.includes('faction_escalation'));
    if (sequence.length >= 4 && !hasEscalation) {
        findings.push({
            kind: 'escalation_drought',
            severity: 'info',
            message: 'No escalation beats or threat outcomes in scene sequence',
            sceneIds: sequence.map((s) => s.sceneId),
        });
    }
    const relationshipSetups = sequence.filter((s) => s.outcomes.includes('relationship_shift'));
    const resolutions = sequence.filter((s) => s.beatType === 'resolution');
    if (relationshipSetups.length > resolutions.length) {
        findings.push({
            kind: 'unresolved_emotional_promise',
            severity: 'warning',
            message: 'Relationship shift outcomes exceed resolution beats',
            sceneIds: relationshipSetups.map((s) => s.sceneId),
        });
    }
    let consecutiveCritical = 0;
    for (const entry of sequence) {
        if (entry.narrativeWeight === 'critical') {
            consecutiveCritical += 1;
            if (consecutiveCritical >= 3) {
                findings.push({
                    kind: 'pacing_collapse',
                    severity: 'warning',
                    message: 'Critical-weight scenes back-to-back without recovery pacing',
                    sceneIds: [entry.sceneId],
                });
            }
        }
        else {
            consecutiveCritical = 0;
        }
    }
    const hasChoice = sequence.some((s) => s.beatType && CHOICE_BEATS.includes(s.beatType));
    if (sequence.length >= 5 && !hasChoice) {
        findings.push({
            kind: 'no_choice_corridor',
            severity: 'info',
            message: 'Long linear sequence with no choice beat',
            sceneIds: sequence.map((s) => s.sceneId),
        });
    }
    if (sequence.length >= 8) {
        findings.push({
            kind: 'excessive_dependency_chain',
            severity: 'info',
            message: `Scene chain length ${sequence.length} exceeds recommended pacing threshold`,
            sceneIds: sequence.map((s) => s.sceneId),
        });
    }
    const actCounts = new Map();
    for (const entry of sequence) {
        const act = entry.actIndex ?? 0;
        actCounts.set(act, (actCounts.get(act) ?? 0) + 1);
    }
    if (actCounts.size >= 2) {
        const counts = [...actCounts.values()];
        const max = Math.max(...counts);
        const min = Math.min(...counts);
        if (max >= min * 3) {
            findings.push({
                kind: 'act_imbalance',
                severity: 'info',
                message: 'Scene count skew across act lanes',
                sceneIds: sequence.map((s) => s.sceneId),
            });
        }
    }
    return findings;
}
function sceneMetadataToSequenceEntry(sceneId, fields, actIndex) {
    return {
        sceneId,
        beatType: fields.beatType,
        outcomes: fields.outcomes.map((o) => o.outcomeType),
        narrativeWeight: fields.narrativeWeight,
        actIndex,
    };
}
//# sourceMappingURL=dramaticTopology.js.map