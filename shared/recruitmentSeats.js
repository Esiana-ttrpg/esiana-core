"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecruitingPlayerCapacity = getRecruitingPlayerCapacity;
exports.getFilledTableSeats = getFilledTableSeats;
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
/** Player seats already occupied at the real-world table. */
function getFilledTableSeats(limits) {
    const partySize = getPartyPlayerCapacity(limits.maxPlayers);
    if (partySize <= 0)
        return 0;
    return Math.max(0, partySize - Math.min(partySize, getRecruitingPlayerCapacity(limits)));
}
function isRecruitmentTableFull(filledSeats, limits) {
    const capacity = getRecruitingPlayerCapacity(limits);
    return capacity > 0 && filledSeats >= capacity;
}
/** Open spots listed for recruitment (recruiting cap when set, capped by party size). */
function getOpenRecruitingSlots(_filledSeats, limits) {
    const recruitingFor = getRecruitingPlayerCapacity(limits);
    const partySize = getPartyPlayerCapacity(limits.maxPlayers);
    return partySize > 0 ? Math.min(recruitingFor, partySize) : recruitingFor;
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
function isLobbyTableFull(_filledSeats, limits) {
    return getOpenRecruitingSlots(0, limits) <= 0;
}
//# sourceMappingURL=recruitmentSeats.js.map
