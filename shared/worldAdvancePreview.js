"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.effectToConditionDeriveRow = effectToConditionDeriveRow;
exports.collectPageIdsFromEffect = collectPageIdsFromEffect;
exports.buildPreviewFromBatchRequest = buildPreviewFromBatchRequest;
const worldAdvance_js_1 = require("./worldAdvance.js");
const worldConditionSurfaces_js_1 = require("./worldConditionSurfaces.js");
const worldAdvanceSynthesis_js_1 = require("./worldAdvanceSynthesis.js");
function effectToConditionDeriveRow(effect, regionPageId) {
    const base = {
        id: effect.id,
        domain: effect.domain,
        type: effect.type,
    };
    switch (effect.type) {
        case 'append_org_relation_event':
            return { ...base, stance: effect.stance, orgPageId: effect.orgPageId };
        case 'territory_pressure':
            return {
                ...base,
                regionPageId: effect.regionPageId ?? regionPageId ?? undefined,
                orgPageId: effect.orgPageId,
                pressureLevel: effect.pressureLevel,
            };
        case 'economic_signal': {
            const loc = effect.targetKind === 'location' ? effect.pageId : regionPageId ?? undefined;
            return { ...base, regionPageId: loc, signal: effect.signal };
        }
        case 'conflict_front':
            return {
                ...base,
                phase: effect.phase,
                regionPageId: effect.regionPageIds?.[0],
            };
        case 'displacement':
            return {
                ...base,
                characterPageId: effect.characterPageId,
                toLocationPageId: effect.toLocationPageId,
                kind: 'displacement',
            };
        case 'append_location_event':
            return {
                ...base,
                characterPageId: effect.characterPageId,
                regionPageId: effect.locationPageId,
                kind: effect.kind,
            };
        case 'record_season_context':
            return { ...base, regionPageId: effect.regionPageId ?? undefined };
        default:
            return base;
    }
}
function collectPageIdsFromEffect(effect) {
    const ids = [];
    switch (effect.type) {
        case 'append_org_relation_event':
            ids.push(effect.orgPageId, effect.targetOrgId);
            break;
        case 'territory_pressure':
            if (effect.orgPageId)
                ids.push(effect.orgPageId);
            if (effect.regionPageId)
                ids.push(effect.regionPageId);
            break;
        case 'economic_signal':
            ids.push(effect.pageId);
            break;
        case 'conflict_front':
            ids.push(...(effect.orgPageIds ?? []), ...(effect.regionPageIds ?? []));
            break;
        case 'append_location_event':
        case 'set_current_location':
        case 'displacement':
            ids.push(effect.characterPageId);
            if ('locationPageId' in effect && effect.locationPageId)
                ids.push(effect.locationPageId);
            if (effect.type === 'displacement') {
                if (effect.fromLocationPageId)
                    ids.push(effect.fromLocationPageId);
                if (effect.toLocationPageId)
                    ids.push(effect.toLocationPageId);
            }
            break;
        case 'record_season_context':
            if (effect.regionPageId)
                ids.push(effect.regionPageId);
            break;
        case 'consequence_bridge':
            if (effect.consequence.type === 'set_faction_stance') {
                ids.push(effect.consequence.factionPageId);
            }
            if (effect.consequence.type === 'circulate_rumor') {
                if (effect.consequence.targetLocationPageId) {
                    ids.push(effect.consequence.targetLocationPageId);
                }
                if (effect.consequence.targetOrgPageId) {
                    ids.push(effect.consequence.targetOrgPageId);
                }
            }
            break;
        default:
            break;
    }
    return ids;
}
function buildPreviewFromBatchRequest(request, options) {
    const projected = options.projectedEpochMinute ?? '10080';
    const asOf = options.asOfEpochMinute ?? projected;
    const deriveRows = request.effects.map((effect) => effectToConditionDeriveRow(effect, options.regionPageIdByEffect?.(effect) ?? null));
    const regionLabels = new Map();
    for (const [id, title] of options.pageTitles) {
        regionLabels.set(id, title);
    }
    const conditionSurfaces = (0, worldConditionSurfaces_js_1.deriveWorldConditionsAt)({
        asOfEpochMinute: projected,
        effects: deriveRows,
        regionLabels,
    });
    const narrativeSynthesis = (0, worldAdvanceSynthesis_js_1.synthesizeWorldAdvanceNarrative)({
        asOfLabel: options.asOfLabel ?? 'Late Winter, 842 AE',
        effects: request.effects,
        conditionSurfaces,
        pageTitles: options.pageTitles,
        seasonLabel: options.asOfLabel,
    });
    const effectPreviews = request.effects.map((effect) => ({
        effectId: effect.id,
        domain: effect.domain,
        type: effect.type,
        summary: `Apply ${effect.type}`,
        warnings: [],
        pendingConfirmations: effect.type === 'suggest_border_keyframe'
            ? ['Border keyframe requires GM confirmation in map editor']
            : [],
    }));
    return {
        version: worldAdvance_js_1.WORLD_ADVANCE_VERSION,
        asOfEpochMinute: asOf,
        asOfLabel: options.asOfLabel ?? null,
        projectedEpochMinute: projected,
        effectPreviews,
        conditionSurfaces,
        narrativeSynthesis,
        warnings: [],
    };
}
//# sourceMappingURL=worldAdvancePreview.js.map