"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorldConditionAxes = exports.WORLD_CONDITION_SURFACES_VERSION = void 0;
exports.deriveWorldConditionsAt = deriveWorldConditionsAt;
exports.formatConditionAxisLabel = formatConditionAxisLabel;
/**
 * Layer 3 — derived condition surfaces (projection only, never canonical).
 */
exports.WORLD_CONDITION_SURFACES_VERSION = 'world-condition-surfaces-v1';
exports.WorldConditionAxes = {
    REGION_STABILITY: 'region_stability',
    PROSPERITY: 'prosperity',
    MILITARY_PRESSURE: 'military_pressure',
    MIGRATION_PRESSURE: 'migration_pressure',
};
function maxSeverity(levels, order) {
    let best = order[0];
    let bestIdx = 0;
    for (const level of levels) {
        const idx = order.indexOf(level);
        if (idx > bestIdx) {
            bestIdx = idx;
            best = level;
        }
    }
    return best;
}
function deriveWorldConditionsAt(input) {
    const byRegion = new Map();
    const ensureRegion = (regionPageId) => {
        let bucket = byRegion.get(regionPageId);
        if (!bucket) {
            bucket = {
                stability: [],
                prosperity: [],
                military: [],
                migration: [],
                effectIds: new Set(),
            };
            byRegion.set(regionPageId, bucket);
        }
        return bucket;
    };
    for (const effect of input.effects) {
        const regionIds = new Set();
        if (effect.regionPageId)
            regionIds.add(effect.regionPageId);
        if (effect.type === 'conflict_front') {
            for (const id of effect.regionPageId ? [effect.regionPageId] : []) {
                regionIds.add(id);
            }
            if (effect.phase === 'escalating' || effect.phase === 'active') {
                for (const rid of regionIds) {
                    const b = ensureRegion(rid);
                    b.stability.push('strained');
                    b.military.push(effect.phase === 'active' ? 'critical' : 'rising');
                    b.effectIds.add(effect.id);
                }
            }
        }
        if (effect.type === 'territory_pressure') {
            const rid = effect.regionPageId;
            if (rid) {
                const b = ensureRegion(rid);
                if (effect.pressureLevel === 'high') {
                    b.stability.push('unstable');
                    b.military.push('rising');
                }
                else if (effect.pressureLevel === 'moderate') {
                    b.stability.push('strained');
                }
                b.effectIds.add(effect.id);
            }
        }
        if (effect.type === 'economic_signal') {
            const rid = effect.regionPageId;
            if (rid) {
                const b = ensureRegion(rid);
                if (effect.signal === 'prosperity_decline' ||
                    effect.signal === 'scarcity' ||
                    effect.signal === 'trade_disruption') {
                    b.prosperity.push('declining');
                }
                else if (effect.signal === 'prosperity_growth' || effect.signal === 'surplus') {
                    b.prosperity.push('growing');
                }
                b.effectIds.add(effect.id);
            }
        }
        if (effect.type === 'append_org_relation_event' && effect.stance === 'HOSTILE') {
            const rid = effect.regionPageId;
            if (rid) {
                const b = ensureRegion(rid);
                b.stability.push('strained');
                b.military.push('rising');
                b.effectIds.add(effect.id);
            }
        }
        if (effect.type === 'displacement' || effect.kind === 'displacement') {
            const rid = effect.regionPageId ?? effect.toLocationPageId;
            if (rid) {
                const b = ensureRegion(rid);
                b.migration.push('severe');
                b.stability.push('strained');
                b.effectIds.add(effect.id);
            }
        }
        if (effect.type === 'record_season_context') {
            const rid = effect.regionPageId;
            if (rid) {
                const b = ensureRegion(rid);
                b.migration.push('moderate');
                b.effectIds.add(effect.id);
            }
        }
    }
    const surfaces = [];
    for (const [regionPageId, bucket] of byRegion) {
        const effectIds = [...bucket.effectIds];
        const label = input.regionLabels.get(regionPageId) ?? null;
        if (bucket.stability.length > 0) {
            surfaces.push({
                version: exports.WORLD_CONDITION_SURFACES_VERSION,
                scopeKind: 'region',
                regionPageId,
                regionLabel: label,
                axis: exports.WorldConditionAxes.REGION_STABILITY,
                level: maxSeverity(bucket.stability, ['stable', 'strained', 'unstable']),
                confidence: bucket.stability.length >= 2 ? 'high' : 'medium',
                contributingEffectIds: effectIds,
                contributingAnchorIds: [],
            });
        }
        if (bucket.prosperity.length > 0) {
            surfaces.push({
                version: exports.WORLD_CONDITION_SURFACES_VERSION,
                scopeKind: 'region',
                regionPageId,
                regionLabel: label,
                axis: exports.WorldConditionAxes.PROSPERITY,
                level: maxSeverity(bucket.prosperity, ['steady', 'declining', 'growing']),
                confidence: 'medium',
                contributingEffectIds: effectIds,
                contributingAnchorIds: [],
            });
        }
        if (bucket.military.length > 0) {
            surfaces.push({
                version: exports.WORLD_CONDITION_SURFACES_VERSION,
                scopeKind: 'region',
                regionPageId,
                regionLabel: label,
                axis: exports.WorldConditionAxes.MILITARY_PRESSURE,
                level: maxSeverity(bucket.military, ['low', 'rising', 'critical']),
                confidence: 'medium',
                contributingEffectIds: effectIds,
                contributingAnchorIds: [],
            });
        }
        if (bucket.migration.length > 0) {
            surfaces.push({
                version: exports.WORLD_CONDITION_SURFACES_VERSION,
                scopeKind: 'region',
                regionPageId,
                regionLabel: label,
                axis: exports.WorldConditionAxes.MIGRATION_PRESSURE,
                level: maxSeverity(bucket.migration, ['low', 'moderate', 'severe']),
                confidence: 'medium',
                contributingEffectIds: effectIds,
                contributingAnchorIds: [],
            });
        }
    }
    if (surfaces.length > 0) {
        const campaignRollup = (axis) => {
            const scoped = surfaces.filter((s) => s.axis === axis && s.scopeKind === 'region');
            if (!scoped.length)
                return null;
            return {
                version: exports.WORLD_CONDITION_SURFACES_VERSION,
                scopeKind: 'campaign',
                regionPageId: null,
                regionLabel: null,
                axis,
                level: scoped[0].level,
                confidence: 'low',
                contributingEffectIds: [
                    ...new Set(scoped.flatMap((s) => s.contributingEffectIds)),
                ],
                contributingAnchorIds: [],
            };
        };
        for (const axis of Object.values(exports.WorldConditionAxes)) {
            const rollup = campaignRollup(axis);
            if (rollup)
                surfaces.push(rollup);
        }
    }
    return surfaces;
}
function formatConditionAxisLabel(axis) {
    switch (axis) {
        case exports.WorldConditionAxes.REGION_STABILITY:
            return 'Region stability';
        case exports.WorldConditionAxes.PROSPERITY:
            return 'Prosperity';
        case exports.WorldConditionAxes.MILITARY_PRESSURE:
            return 'Military pressure';
        case exports.WorldConditionAxes.MIGRATION_PRESSURE:
            return 'Migration pressure';
        default:
            return axis;
    }
}
//# sourceMappingURL=worldConditionSurfaces.js.map