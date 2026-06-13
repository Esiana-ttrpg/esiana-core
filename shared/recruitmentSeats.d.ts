export interface RecruitmentSeatLimits {
    maxSeats: number;
    maxPlayers: number;
}
/** Open LFG slots (recruiting count when set, otherwise party size). */
export declare function getRecruitingPlayerCapacity(limits: RecruitmentSeatLimits): number;
export declare function isRecruitmentTableFull(filledSeats: number, limits: RecruitmentSeatLimits): boolean;
/** Open spots listed for recruitment (recruiting cap when set, capped by party size). */
export declare function getOpenRecruitingSlots(filledSeats: number, limits: RecruitmentSeatLimits): number;
/** Party size differs from recruiting count (show both on public pages). */
export declare function showsDistinctPartySize(limits: RecruitmentSeatLimits): boolean;
/** Total player slots at the table (party size). */
export declare function getPartyPlayerCapacity(maxPlayers: number): number;
export declare function isPartyTableFull(filledSeats: number, maxPlayers: number): boolean;
export declare function getOpenPartySlots(filledSeats: number, maxPlayers: number): number;
/** Lobby / table fill: party size when set, else recruiting capacity. */
export declare function getLobbyTableCapacity(limits: RecruitmentSeatLimits): number;
/** Whether applicants can no longer join (party full or recruiting target reached). */
export declare function isLobbyTableFull(filledSeats: number, limits: RecruitmentSeatLimits): boolean;
//# sourceMappingURL=recruitmentSeats.d.ts.map