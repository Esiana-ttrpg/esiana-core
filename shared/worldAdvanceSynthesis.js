"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORLD_ADVANCE_SYNTHESIS_VERSION = void 0;
exports.synthesizeWorldAdvanceNarrative = synthesizeWorldAdvanceNarrative;
const worldConditionSurfaces_js_1 = require("./worldConditionSurfaces.js");
exports.WORLD_ADVANCE_SYNTHESIS_VERSION = 'world-advance-synthesis-v1';
function titleFor(pageTitles, pageId) {
    if (!pageId)
        return 'the region';
    return pageTitles.get(pageId) ?? 'an affected area';
}
function synthesizeWorldAdvanceNarrative(input) {
    const citations = [];
    const sentences = [];
    const headline = input.asOfLabel != null && input.asOfLabel.trim()
        ? input.asOfLabel.trim()
        : 'World advance';
    for (const effect of input.effects) {
        switch (effect.type) {
            case 'conflict_front': {
                const regions = effect.regionPageIds?.map((id) => titleFor(input.pageTitles, id)).join(', ') ??
                    'the borderlands';
                const clause = `Conflict ${effect.phase === 'de_escalating' ? 'eased' : 'escalated'} around ${regions} (${effect.label}).`;
                sentences.push(clause);
                citations.push({ clause, effectIds: [effect.id], anchorIds: [] });
                break;
            }
            case 'economic_signal': {
                const target = titleFor(input.pageTitles, effect.pageId);
                const verb = effect.signal === 'trade_disruption'
                    ? 'Trade disruption affected'
                    : effect.signal === 'prosperity_decline' || effect.signal === 'scarcity'
                        ? 'Economic strain touched'
                        : 'Prosperity shifted for';
                const clause = `${verb} ${target}.`;
                sentences.push(clause);
                citations.push({ clause, effectIds: [effect.id], anchorIds: [] });
                break;
            }
            case 'append_org_relation_event': {
                const org = titleFor(input.pageTitles, effect.orgPageId);
                const target = titleFor(input.pageTitles, effect.targetOrgId);
                const clause = `${org} is now ${effect.stance.toLowerCase()} toward ${target} (${effect.relationType}).`;
                sentences.push(clause);
                citations.push({ clause, effectIds: [effect.id], anchorIds: [] });
                break;
            }
            case 'displacement':
            case 'append_location_event': {
                const who = titleFor(input.pageTitles, effect.characterPageId);
                const where = titleFor(input.pageTitles, 'locationPageId' in effect ? effect.locationPageId : effect.toLocationPageId);
                const clause = effect.type === 'displacement'
                    ? `Displacement pressure affected ${who} near ${where}.`
                    : `${who} moved toward ${where}.`;
                sentences.push(clause);
                citations.push({ clause, effectIds: [effect.id], anchorIds: [] });
                break;
            }
            case 'territory_pressure': {
                const where = titleFor(input.pageTitles, effect.regionPageId ?? effect.orgPageId);
                const clause = `Territorial pressure ${effect.pressureLevel} intensified around ${where}.`;
                sentences.push(clause);
                citations.push({ clause, effectIds: [effect.id], anchorIds: [] });
                break;
            }
            case 'record_season_context': {
                if (input.seasonLabel) {
                    const clause = `Seasonal conditions (${input.seasonLabel}) shaped travel and harvest cadence.`;
                    sentences.push(clause);
                    citations.push({ clause, effectIds: [effect.id], anchorIds: [] });
                }
                break;
            }
            default:
                break;
        }
    }
    for (const surface of input.conditionSurfaces) {
        if (surface.scopeKind !== 'region' || !surface.regionLabel)
            continue;
        const axisLabel = (0, worldConditionSurfaces_js_1.formatConditionAxisLabel)(surface.axis);
        const clause = `${surface.regionLabel}: ${axisLabel} is ${surface.level}.`;
        if (!sentences.some((s) => s.includes(surface.regionLabel))) {
            sentences.push(clause);
            citations.push({
                clause,
                effectIds: surface.contributingEffectIds,
                anchorIds: surface.contributingAnchorIds,
            });
        }
    }
    const paragraphs = sentences.length > 0 ? [sentences.join(' ')] : ['No major world shifts were recorded in this advance.'];
    return {
        version: exports.WORLD_ADVANCE_SYNTHESIS_VERSION,
        headline,
        paragraphs,
        citations,
        isProjection: true,
    };
}
//# sourceMappingURL=worldAdvanceSynthesis.js.map