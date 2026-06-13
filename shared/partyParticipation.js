"use strict";
/**
 * Character-level party cast participation (wiki metadata).
 * Separate from CampaignMember.identityPageId (player → character link).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PARTY_PARTICIPATION = exports.PARTY_PARTICIPATION_ROLE_RANK = exports.PARTY_PARTICIPATION_ROLE_LABELS = exports.ALL_PARTY_PARTICIPATION_ROLES = exports.PartyParticipationRoles = void 0;
exports.normalizePartyParticipationRole = normalizePartyParticipationRole;
exports.parsePartyParticipation = parsePartyParticipation;
exports.normalizePartyParticipationPatch = normalizePartyParticipationPatch;
exports.formatPartyParticipationLabel = formatPartyParticipationLabel;
exports.isActivePartyCharacter = isActivePartyCharacter;
exports.formatPartyParticipationChip = formatPartyParticipationChip;
exports.PartyParticipationRoles = {
    PLAYER_CHARACTER: 'PLAYER_CHARACTER',
    COMPANION: 'COMPANION',
    NPC_ALLY: 'NPC_ALLY',
    GUEST: 'GUEST',
};
exports.ALL_PARTY_PARTICIPATION_ROLES = Object.values(exports.PartyParticipationRoles);
exports.PARTY_PARTICIPATION_ROLE_LABELS = {
    PLAYER_CHARACTER: 'Player Character',
    COMPANION: 'Companion',
    NPC_ALLY: 'NPC Ally',
    GUEST: 'Guest',
};
/** Sort rank for roster ordering (lower = earlier). */
exports.PARTY_PARTICIPATION_ROLE_RANK = {
    PLAYER_CHARACTER: 0,
    COMPANION: 1,
    NPC_ALLY: 2,
    GUEST: 3,
};
exports.DEFAULT_PARTY_PARTICIPATION = {
    active: false,
    role: exports.PartyParticipationRoles.PLAYER_CHARACTER,
};
function isPartyParticipationRole(raw) {
    return (typeof raw === 'string' &&
        exports.ALL_PARTY_PARTICIPATION_ROLES.includes(raw));
}
function normalizePartyParticipationRole(raw) {
    if (isPartyParticipationRole(raw))
        return raw;
    return exports.PartyParticipationRoles.PLAYER_CHARACTER;
}
function parsePartyParticipation(metadata) {
    if (!metadata || typeof metadata !== 'object') {
        return { ...exports.DEFAULT_PARTY_PARTICIPATION };
    }
    const raw = metadata.partyParticipation;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return { ...exports.DEFAULT_PARTY_PARTICIPATION };
    }
    const obj = raw;
    return {
        active: obj.active === true,
        role: normalizePartyParticipationRole(obj.role),
    };
}
function normalizePartyParticipationPatch(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return { ...exports.DEFAULT_PARTY_PARTICIPATION };
    }
    const obj = raw;
    return {
        active: obj.active === true,
        role: normalizePartyParticipationRole(obj.role),
    };
}
function formatPartyParticipationLabel(participation) {
    if (!participation.active)
        return null;
    return exports.PARTY_PARTICIPATION_ROLE_LABELS[participation.role];
}
/** Whether a character page is on the active party cast. */
function isActivePartyCharacter(metadata) {
    return parsePartyParticipation(metadata).active;
}
/** Compact read-mode chip label, e.g. "Party · Companion". */
function formatPartyParticipationChip(participation) {
    if (!participation.active)
        return null;
    const roleLabel = exports.PARTY_PARTICIPATION_ROLE_LABELS[participation.role];
    return `Party · ${roleLabel}`;
}
//# sourceMappingURL=partyParticipation.js.map