"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatConvergenceVisibilityTier = formatConvergenceVisibilityTier;
exports.shouldShowConvergenceVisibilityBadge = shouldShowConvergenceVisibilityBadge;
exports.formatConvergenceLinkLabel = formatConvergenceLinkLabel;
exports.formatConvergenceFeedTitle = formatConvergenceFeedTitle;
exports.formatWorldEventFeedSummary = formatWorldEventFeedSummary;
exports.formatConvergenceEntrySummary = formatConvergenceEntrySummary;
/**
 * User-facing copy for chronology convergence feed entries.
 * Leaf module — no imports from narrativeProjection, rumorEngine, or chronologyTypes
 * (avoids circular init with loreKnowledge ↔ chronologyTypes).
 */
const SPREAD_PAYLOAD_VERSION = 'spreadAction-v1';
const VISIBILITY_TIER_LABELS = {
    PUBLIC: 'Public',
    PARTY: 'Party',
    ELEVATED_ONLY: 'GM only',
    SECRET: 'Secret',
};
const LINK_LABELS = {
    event_lore: 'View event',
    chronology_events: 'Events ledger',
    session_note: 'Session note',
    map_scene: 'Map scene',
    wiki_page: 'Wiki page',
    world_advance_batch: 'World advance',
    downtime_hub: 'Downtime hub',
};
const RUMOR_STANCE_LABELS = {
    asserts: 'Asserted as true',
    denies: 'Denied',
    distorts: 'Distorted retelling',
    mythologizes: 'Mythologized',
    satirizes: 'Satirical spin',
};
function isRecord(value) {
    return value != null && typeof value === 'object' && !Array.isArray(value);
}
function parseSpreadPayload(description) {
    const trimmed = description.trim();
    if (!trimmed.startsWith('{'))
        return null;
    try {
        const parsed = JSON.parse(trimmed);
        if (!isRecord(parsed) || parsed.version !== SPREAD_PAYLOAD_VERSION)
            return null;
        return parsed;
    }
    catch {
        return null;
    }
}
function formatRumorStance(raw) {
    if (!raw)
        return null;
    return RUMOR_STANCE_LABELS[raw.toLowerCase()] ?? null;
}
function formatCirculationVisibility(raw) {
    if (!raw)
        return null;
    const upper = raw.toUpperCase();
    if (upper === 'PARTY')
        return 'Party-visible circulation';
    if (upper === 'GM_ONLY')
        return 'GM-only circulation';
    return null;
}
function formatSpreadTargetCount(targets) {
    if (!targets?.length)
        return null;
    const regionCount = targets.filter((t) => t.kind === 'region').length;
    const factionCount = targets.filter((t) => t.kind === 'faction').length;
    const parts = [];
    if (regionCount > 0) {
        parts.push(`${regionCount} region${regionCount === 1 ? '' : 's'}`);
    }
    if (factionCount > 0) {
        parts.push(`${factionCount} faction${factionCount === 1 ? '' : 's'}`);
    }
    if (parts.length === 0) {
        return `${targets.length} target${targets.length === 1 ? '' : 's'}`;
    }
    return parts.join(', ');
}
function formatConvergenceVisibilityTier(tier) {
    return VISIBILITY_TIER_LABELS[tier] ?? tier.replace(/_/g, ' ').toLowerCase();
}
function shouldShowConvergenceVisibilityBadge(tier) {
    return tier === 'ELEVATED_ONLY' || tier === 'SECRET';
}
function formatConvergenceLinkLabel(hrefKind) {
    return LINK_LABELS[hrefKind] ?? hrefKind.replace(/_/g, ' ');
}
function formatConvergenceFeedTitle(title) {
    if (title.startsWith('Rumor spread: ')) {
        return `Rumor circulated: ${title.slice('Rumor spread: '.length)}`;
    }
    return title;
}
function formatWorldEventFeedSummary(description) {
    if (!description?.trim())
        return null;
    const spread = parseSpreadPayload(description);
    if (spread) {
        const parts = [
            formatRumorStance(spread.stance),
            formatCirculationVisibility(spread.visibility),
            formatSpreadTargetCount(spread.targets),
        ].filter((part) => Boolean(part));
        return parts.length > 0 ? parts.join(' · ') : 'Rumor circulation recorded';
    }
    const trimmed = description.trim();
    if (trimmed.startsWith('{'))
        return null;
    return trimmed.length > 240 ? `${trimmed.slice(0, 237)}…` : trimmed;
}
function formatConvergenceEntrySummary(input) {
    return formatWorldEventFeedSummary(input.summary) ?? null;
}
//# sourceMappingURL=convergenceFeedDisplay.js.map