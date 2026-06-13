"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectReawakenedThreads = detectReawakenedThreads;
exports.detectReawakenedEntities = detectReawakenedEntities;
exports.computeDormantPlotlineFindings = computeDormantPlotlineFindings;
exports.computeCoolingEntityFindings = computeCoolingEntityFindings;
exports.computeHangingPromiseFindings = computeHangingPromiseFindings;
exports.computeEmotionalResidueFindings = computeEmotionalResidueFindings;
exports.computeCreativeDriftScan = computeCreativeDriftScan;
/**
 * Pure Layer 3 creative drift heuristics (composes threadSignals + lifecycle inputs).
 */
const creativeDrift_js_1 = require("./creativeDrift.js");
const creativeDriftFingerprint_js_1 = require("./creativeDriftFingerprint.js");
const narrativeLifecycle_js_1 = require("./narrativeLifecycle.js");
const narrativeBranch_js_1 = require("./narrativeBranch.js");
const threadSignals_js_1 = require("./threadSignals.js");
const MS_PER_DAY = 24 * 60 * 60 * 1000;
function daysSince(date, now) {
    return Math.max(0, (now.getTime() - date.getTime()) / MS_PER_DAY);
}
function lastReferencedAt(updatedAt, lastActivityAt) {
    if (lastActivityAt && lastActivityAt > updatedAt)
        return lastActivityAt;
    return updatedAt;
}
function buildFindingBase(input) {
    const days = daysSince(input.referenceDate, input.now);
    const band = (0, creativeDrift_js_1.computeCoolingBand)(days);
    return {
        fingerprint: (0, creativeDriftFingerprint_js_1.driftFingerprint)(input.bucket, input.subjectKind, input.subjectId, input.suffix),
        bucket: input.bucket,
        subjectKind: input.subjectKind,
        subjectId: input.subjectId,
        title: input.title,
        statusLabel: input.statusLabel,
        coolingBand: band,
        reactivationState: 'none',
        narrativeWeight: input.narrativeWeight,
        lastReferencedAt: input.referenceDate.toISOString(),
        introducedSessionId: input.introducedSessionId ?? null,
        linkedEntityIds: input.linkedEntityIds ?? [],
        _sortKey: (0, creativeDrift_js_1.computeCoolingScore)(days, input.narrativeWeight),
    };
}
function entityStatusLabel(category) {
    const cat = (category ?? '').toLowerCase();
    if (cat.includes('character'))
        return 'Dormant figure';
    if (cat.includes('organization') || cat.includes('faction'))
        return 'Dormant faction';
    if (cat.includes('location'))
        return 'Dormant presence';
    return 'Lingering presence';
}
function isLivingLifecycle(state) {
    return (state === narrativeLifecycle_js_1.NarrativeLifecycleStates.ACTIVE ||
        state === narrativeLifecycle_js_1.NarrativeLifecycleStates.DISCOVERED);
}
function detectReawakenedThreads(threads, now) {
    const items = [];
    for (const row of threads) {
        if (!row.isAuthored || !row.lastAdvancedSessionId)
            continue;
        const daysSinceUpdate = daysSince(row.updatedAt, now);
        if (daysSinceUpdate > creativeDrift_js_1.REAWAKENED_DAYS_WINDOW)
            continue;
        const advancedBeyondIntro = row.introducedSessionId &&
            row.lastAdvancedSessionId !== row.introducedSessionId;
        const wasCooling = row.threadStatus === 'DORMANT' ||
            (0, threadSignals_js_1.computeThreadSignals)({
                threadKind: row.threadKind,
                threadStatus: row.threadStatus,
                payoffPageId: row.payoffPageId,
                playerSubmitted: row.playerSubmitted,
                updatedAt: new Date(row.updatedAt.getTime() - creativeDrift_js_1.REAWAKENED_DAYS_WINDOW * MS_PER_DAY),
                lastAdvancedSessionId: null,
            }).includes('stale');
        if (!advancedBeyondIntro && !wasCooling)
            continue;
        const sessionGap = row.introducedSessionId && row.lastAdvancedSessionId
            ? 'Back in recent play'
            : 'Recently returned';
        items.push({
            fingerprint: (0, creativeDriftFingerprint_js_1.driftFingerprint)('reawakened', 'open_thread', row.id),
            subjectKind: 'open_thread',
            subjectId: row.id,
            title: row.title,
            reactivationCopy: sessionGap,
            lastReferencedAt: row.updatedAt.toISOString(),
            linkedEntityIds: row.relatedPageIds,
        });
    }
    return items;
}
function detectReawakenedEntities(entities, reawakenedThreads, now) {
    const hotThreadIds = new Set(reawakenedThreads
        .filter((t) => daysSince(t.updatedAt, now) <= creativeDrift_js_1.REAWAKENED_DAYS_WINDOW)
        .map((t) => t.id));
    if (hotThreadIds.size === 0)
        return [];
    const linkedEntityIds = new Set();
    for (const thread of reawakenedThreads) {
        if (!hotThreadIds.has(thread.id))
            continue;
        for (const id of thread.relatedPageIds)
            linkedEntityIds.add(id);
    }
    const items = [];
    for (const entity of entities) {
        if (!linkedEntityIds.has(entity.id))
            continue;
        if (entity.linkedByLivingNarrative)
            continue;
        const daysSinceActivity = daysSince(lastReferencedAt(entity.updatedAt, entity.lastActivityAt), now);
        if (daysSinceActivity > threadSignals_js_1.THREAD_STALE_DAYS_THRESHOLD) {
            items.push({
                fingerprint: (0, creativeDriftFingerprint_js_1.driftFingerprint)('reawakened', 'wiki_page', entity.id),
                subjectKind: 'wiki_page',
                subjectId: entity.id,
                title: entity.title,
                reactivationCopy: 'Recently returned',
                lastReferencedAt: entity.updatedAt.toISOString(),
                linkedEntityIds: [],
            });
        }
    }
    return items;
}
function computeDormantPlotlineFindings(input, now) {
    const findings = [];
    const questStagnantDays = threadSignals_js_1.THREAD_STALE_DAYS_THRESHOLD;
    for (const row of input.threads) {
        if (!row.isAuthored || !isLivingLifecycle(row.lifecycleState))
            continue;
        let include = false;
        let statusLabel = 'Dormant plotline';
        if (row.threadStatus === 'DORMANT') {
            include = true;
            statusLabel = 'Dormant plotline';
        }
        else {
            const signals = (0, threadSignals_js_1.computeThreadSignals)({
                threadKind: row.threadKind,
                threadStatus: row.threadStatus,
                payoffPageId: row.payoffPageId,
                playerSubmitted: row.playerSubmitted,
                updatedAt: row.updatedAt,
                lastAdvancedSessionId: row.lastAdvancedSessionId,
            });
            if (signals.includes('stale')) {
                include = true;
                statusLabel = 'Quiet plotline';
            }
        }
        if (!include)
            continue;
        findings.push(buildFindingBase({
            bucket: 'dormant_plotlines',
            subjectKind: 'open_thread',
            subjectId: row.id,
            title: row.title,
            statusLabel,
            referenceDate: row.updatedAt,
            now,
            narrativeWeight: row.narrativeWeight,
            introducedSessionId: row.introducedSessionId,
            linkedEntityIds: row.relatedPageIds,
        }));
    }
    for (const row of input.quests) {
        if (!isLivingLifecycle(row.lifecycleState))
            continue;
        const ref = lastReferencedAt(row.updatedAt, row.lastActivityAt);
        const days = daysSince(ref, now);
        if (days < questStagnantDays)
            continue;
        findings.push(buildFindingBase({
            bucket: 'dormant_plotlines',
            subjectKind: 'quest',
            subjectId: row.id,
            title: row.title,
            statusLabel: 'Quiet plotline',
            referenceDate: ref,
            now,
            narrativeWeight: 'major',
        }));
    }
    for (const row of input.branches) {
        if (row.nodeKind !== narrativeBranch_js_1.BranchNodeKinds.HIDDEN &&
            row.nodeKind !== narrativeBranch_js_1.BranchNodeKinds.FAILURE) {
            continue;
        }
        findings.push(buildFindingBase({
            bucket: 'dormant_plotlines',
            subjectKind: 'branch_node',
            subjectId: row.subjectId,
            title: `${row.subjectTitle} — ${row.nodeLabel}`,
            statusLabel: 'Quiet branch',
            referenceDate: row.updatedAt,
            now,
            narrativeWeight: row.narrativeWeight,
            suffix: row.nodeId,
        }));
    }
    return findings;
}
function computeCoolingEntityFindings(input, now) {
    const findings = [];
    for (const row of input.entities) {
        if (row.linkedByLivingNarrative)
            continue;
        const weight = row.introWeight ?? 'major';
        if (weight === 'minor' && row.inboundNarrativeEdgeCount === 0)
            continue;
        const ref = lastReferencedAt(row.updatedAt, row.lastActivityAt);
        const days = daysSince(ref, now);
        if (days < creativeDrift_js_1.COOLING_RECENT_DAYS && row.inboundNarrativeEdgeCount > 0)
            continue;
        const hasWeightSignal = weight === 'major' ||
            weight === 'critical' ||
            row.inboundNarrativeEdgeCount > 0;
        if (!hasWeightSignal)
            continue;
        findings.push(buildFindingBase({
            bucket: 'unused_entities',
            subjectKind: 'wiki_page',
            subjectId: row.id,
            title: row.title,
            statusLabel: entityStatusLabel(row.templateCategory),
            referenceDate: ref,
            now,
            narrativeWeight: weight,
        }));
    }
    return findings;
}
function computeHangingPromiseFindings(input, now) {
    const findings = [];
    for (const row of input.threads) {
        if (!row.isAuthored || !isLivingLifecycle(row.lifecycleState))
            continue;
        if (row.threadStatus !== 'OPEN' && row.threadStatus !== 'DORMANT')
            continue;
        const signals = (0, threadSignals_js_1.computeThreadSignals)({
            threadKind: row.threadKind,
            threadStatus: row.threadStatus,
            payoffPageId: row.payoffPageId,
            playerSubmitted: row.playerSubmitted,
            updatedAt: row.updatedAt,
            lastAdvancedSessionId: row.lastAdvancedSessionId,
        });
        let include = false;
        let statusLabel = 'Unresolved';
        if (signals.includes('dangling_foreshadowing')) {
            include = true;
            statusLabel = 'Lingering foreshadowing';
        }
        else if (signals.includes('unresolved_promise')) {
            include = true;
            statusLabel = 'Unresolved promise';
        }
        else if ((row.threadKind === 'mystery' || row.threadKind === 'clue') &&
            row.threadStatus === 'OPEN' &&
            !row.lastAdvancedSessionId) {
            include = true;
            statusLabel = 'Unrevisited';
        }
        if (!include)
            continue;
        findings.push(buildFindingBase({
            bucket: 'hanging_promises',
            subjectKind: 'open_thread',
            subjectId: row.id,
            title: row.title,
            statusLabel,
            referenceDate: row.updatedAt,
            now,
            narrativeWeight: row.narrativeWeight,
            introducedSessionId: row.introducedSessionId,
            linkedEntityIds: row.relatedPageIds,
        }));
    }
    return findings;
}
function computeEmotionalResidueFindings(input, now) {
    const findings = [];
    for (const row of input.threads) {
        if (!row.isAuthored || !isLivingLifecycle(row.lifecycleState))
            continue;
        if (row.threadStatus !== 'OPEN' && row.threadStatus !== 'DORMANT')
            continue;
        let include = false;
        let statusLabel = 'Unrevisited emotional beat';
        if (row.emotionalResidueKind) {
            include = true;
            statusLabel = `Lingering ${row.emotionalResidueKind}`;
        }
        else if (row.relatedPageIds.length > 0 &&
            (row.threadKind === 'promise' || row.threadKind === 'mystery') &&
            !row.lastAdvancedSessionId &&
            row.introducedSessionId) {
            include = true;
        }
        if (!include)
            continue;
        findings.push(buildFindingBase({
            bucket: 'emotional_residue',
            subjectKind: 'open_thread',
            subjectId: row.id,
            title: row.title,
            statusLabel,
            referenceDate: row.updatedAt,
            now,
            narrativeWeight: row.narrativeWeight,
            introducedSessionId: row.introducedSessionId,
            linkedEntityIds: row.relatedPageIds,
        }));
    }
    return findings;
}
function dedupeFindings(findings) {
    const byFingerprint = new Map();
    for (const f of findings) {
        const existing = byFingerprint.get(f.fingerprint);
        if (!existing || (f._sortKey ?? 0) > (existing._sortKey ?? 0)) {
            byFingerprint.set(f.fingerprint, f);
        }
    }
    return [...byFingerprint.values()];
}
function partitionByDisposition(findings, dispositions, now) {
    const active = [];
    const acknowledged = [];
    for (const finding of findings) {
        const disposition = dispositions[finding.fingerprint];
        if ((0, creativeDrift_js_1.isDispositionSnoozedHidden)(disposition, now))
            continue;
        if (disposition &&
            (disposition.kind === 'intentional' ||
                disposition.kind === 'archived' ||
                disposition.kind === 'revive_later')) {
            acknowledged.push(finding);
        }
        else {
            active.push(finding);
        }
    }
    return { active, acknowledged };
}
function computeCreativeDriftScan(input) {
    const now = input.now ?? new Date();
    const dispositions = input.dispositions ?? {};
    const allFindings = dedupeFindings([
        ...computeDormantPlotlineFindings(input, now),
        ...computeCoolingEntityFindings(input, now),
        ...computeHangingPromiseFindings(input, now),
        ...computeEmotionalResidueFindings(input, now),
    ]);
    const { active, acknowledged } = partitionByDisposition(allFindings, dispositions, now);
    const reawakenedThreads = detectReawakenedThreads(input.threads, now);
    const reawakenedEntities = detectReawakenedEntities(input.entities, input.threads, now);
    const reawakened = [...reawakenedThreads, ...reawakenedEntities];
    const byBucket = Object.fromEntries(creativeDrift_js_1.CREATIVE_DRIFT_ACTIVE_BUCKETS.map((b) => [b, 0]));
    const buckets = creativeDrift_js_1.CREATIVE_DRIFT_ACTIVE_BUCKETS.map((bucket) => {
        const items = active
            .filter((f) => f.bucket === bucket)
            .sort(creativeDrift_js_1.sortDriftFindings)
            .map((f) => {
            const { _sortKey, ...publicFinding } = f;
            return {
                ...publicFinding,
                statusLabel: f.statusLabel || creativeDrift_js_1.COOLING_BAND_UI_LABELS[f.coolingBand],
            };
        });
        byBucket[bucket] = items.length;
        return {
            bucket,
            label: creativeDrift_js_1.CREATIVE_DRIFT_BUCKET_UI_LABELS[bucket],
            items,
        };
    });
    const summary = {
        totalActive: active.length,
        byBucket,
        reawakenedCount: reawakened.length,
        acknowledgedCount: acknowledged.length,
    };
    return {
        version: creativeDrift_js_1.CREATIVE_DRIFT_VERSION,
        generatedAt: now.toISOString(),
        buckets,
        reawakened,
        acknowledged: acknowledged
            .sort(creativeDrift_js_1.sortDriftFindings)
            .map(({ _sortKey, ...f }) => f),
        summary,
    };
}
//# sourceMappingURL=creativeDriftCompute.js.map