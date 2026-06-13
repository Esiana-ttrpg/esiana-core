export interface RecruitmentSeatLimits {
  maxSeats: number;
  maxPlayers: number;
}

/** Open LFG slots (recruiting count when set, otherwise party size). */
export function getRecruitingPlayerCapacity(limits: RecruitmentSeatLimits): number {
  if (limits.maxSeats > 0) return limits.maxSeats;
  if (limits.maxPlayers > 0) return limits.maxPlayers;
  return 0;
}

export function isRecruitmentTableFull(
  filledSeats: number,
  limits: RecruitmentSeatLimits,
): boolean {
  const capacity = getRecruitingPlayerCapacity(limits);
  return capacity > 0 && filledSeats >= capacity;
}

/** Open spots listed for recruitment (recruiting cap when set, capped by party size). */
export function getOpenRecruitingSlots(
  filledSeats: number,
  limits: RecruitmentSeatLimits,
): number {
  const partyOpen = getOpenPartySlots(filledSeats, limits.maxPlayers);
  if (limits.maxSeats <= 0) return partyOpen;
  const recruitingRemaining = Math.max(0, limits.maxSeats - filledSeats);
  if (limits.maxPlayers > 0) return Math.min(recruitingRemaining, partyOpen);
  return recruitingRemaining;
}

/** Party size differs from recruiting count (show both on public pages). */
export function showsDistinctPartySize(limits: RecruitmentSeatLimits): boolean {
  return (
    limits.maxSeats > 0 &&
    limits.maxPlayers > 0 &&
    limits.maxSeats !== limits.maxPlayers
  );
}

/** Total player slots at the table (party size). */
export function getPartyPlayerCapacity(maxPlayers: number): number {
  return maxPlayers > 0 ? maxPlayers : 0;
}

export function isPartyTableFull(filledSeats: number, maxPlayers: number): boolean {
  const capacity = getPartyPlayerCapacity(maxPlayers);
  return capacity > 0 && filledSeats >= capacity;
}

export function getOpenPartySlots(filledSeats: number, maxPlayers: number): number {
  const capacity = getPartyPlayerCapacity(maxPlayers);
  if (capacity <= 0) return 0;
  return Math.max(0, capacity - filledSeats);
}

/** Lobby / table fill: party size when set, else recruiting capacity. */
export function getLobbyTableCapacity(limits: RecruitmentSeatLimits): number {
  const party = getPartyPlayerCapacity(limits.maxPlayers);
  if (party > 0) return party;
  return getRecruitingPlayerCapacity(limits);
}

/** Whether applicants can no longer join (party full or recruiting target reached). */
export function isLobbyTableFull(
  filledSeats: number,
  limits: RecruitmentSeatLimits,
): boolean {
  if (isPartyTableFull(filledSeats, limits.maxPlayers)) return true;
  if (limits.maxSeats > 0 && filledSeats >= limits.maxSeats) return true;
  if (limits.maxPlayers > 0) return false;
  return isRecruitmentTableFull(filledSeats, limits);
}
