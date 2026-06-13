"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecruitingPlayerCapacity = getRecruitingPlayerCapacity;
exports.isRecruitmentTableFull = isRecruitmentTableFull;
exports.getOpenRecruitingSlots = getOpenRecruitingSlots;
exports.showsDistinctPartySize = showsDistinctPartySize;
exports.getPartyPlayerCapacity = getPartyPlayerCapacity;
exports.isPartyTableFull = isPartyTableFull;
exports.getOpenPartySlots = getOpenPartySlots;
exports.getLobbyTableCapacity = getLobbyTableCapacity;
exports.isLobbyTableFull = isLobbyTableFull;
/** Open LFG slots (recruiting count when set, otherwise party size). */
function getRecruitingPlayerCapacity(limits) {
    if (limits.maxSeats > 0)
        return limits.maxSeats;
    if (limits.maxPlayers > 0)
        return limits.maxPlayers;
    return 0;
}
function isRecruitmentTableFull(filledSeats, limits) {
    const capacity = getRecruitingPlayerCapacity(limits);
    return capacity > 0 && filledSeats >= capacity;
}
/** Open spots listed for recruitment (recruiting cap when set, capped by party size). */
function getOpenRecruitingSlots(filledSeats, limits) {
    const partyOpen = getOpenPartySlots(filledSeats, limits.maxPlayers);
    if (limits.maxSeats <= 0)
        return partyOpen;
    const recruitingRemaining = Math.max(0, limits.maxSeats - filledSeats);
    if (limits.maxPlayers > 0)
        return Math.min(recruitingRemaining, partyOpen);
    return recruitingRemaining;
}
/** Party size differs from recruiting count (show both on public pages). */
function showsDistinctPartySize(limits) {
    return (limits.maxSeats > 0 &&
        limits.maxPlayers > 0 &&
        limits.maxSeats !== limits.maxPlayers);
}
/** Total player slots at the table (party size). */
function getPartyPlayerCapacity(maxPlayers) {
    return maxPlayers > 0 ? maxPlayers : 0;
}
function isPartyTableFull(filledSeats, maxPlayers) {
    const capacity = getPartyPlayerCapacity(maxPlayers);
    return capacity > 0 && filledSeats >= capacity;
}
function getOpenPartySlots(filledSeats, maxPlayers) {
    const capacity = getPartyPlayerCapacity(maxPlayers);
    if (capacity <= 0)
        return 0;
    return Math.max(0, capacity - filledSeats);
}
/** Lobby / table fill: party size when set, else recruiting capacity. */
function getLobbyTableCapacity(limits) {
    const party = getPartyPlayerCapacity(limits.maxPlayers);
    if (party > 0)
        return party;
    return getRecruitingPlayerCapacity(limits);
}
/** Whether applicants can no longer join (party full or recruiting target reached). */
function isLobbyTableFull(filledSeats, limits) {
    if (isPartyTableFull(filledSeats, limits.maxPlayers))
        return true;
    if (limits.maxSeats > 0 && filledSeats >= limits.maxSeats)
        return true;
    if (limits.maxPlayers > 0)
        return false;
    return isRecruitmentTableFull(filledSeats, limits);
}
//# sourceMappingURL=recruitmentSeats.js.map