"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NARRATIVE_CONSEQUENCE_VERSION = void 0;
exports.parseConsequenceRuleSet = parseConsequenceRuleSet;
exports.NARRATIVE_CONSEQUENCE_VERSION = 'narrative-consequence-v1';
function parseConsequenceRuleSet(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return null;
    const obj = raw;
    if (obj.version !== exports.NARRATIVE_CONSEQUENCE_VERSION)
        return null;
    if (!Array.isArray(obj.rules))
        return null;
    const rules = [];
    for (const entry of obj.rules) {
        if (!entry || typeof entry !== 'object')
            continue;
        const rule = entry;
        if (typeof rule.id !== 'string' || !rule.trigger || !Array.isArray(rule.effects)) {
            continue;
        }
        rules.push({
            id: rule.id,
            trigger: rule.trigger,
            effects: rule.effects,
        });
    }
    return { version: exports.NARRATIVE_CONSEQUENCE_VERSION, rules };
}
//# sourceMappingURL=narrativeConsequence.js.map