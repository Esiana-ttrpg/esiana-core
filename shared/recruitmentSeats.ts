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

/** Player seats already occupied at the real-world table. */
export function getFilledTableSeats(limits: RecruitmentSeatLimits): number {
  const partySize = getPartyPlayerCapacity(limits.maxPlayers);
  if (partySize <= 0) return 0;
  return Math.max(0, partySize - Math.min(partySize, getRecruitingPlayerCapacity(limits)));
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
  _filledSeats: number,
  limits: RecruitmentSeatLimits,
): number {
  const recruitingFor = getRecruitingPlayerCapacity(limits);
  const partySize = getPartyPlayerCapacity(limits.maxPlayers);
  return partySize > 0 ? Math.min(recruitingFor, partySize) : recruitingFor;
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
  _filledSeats: number,
  limits: RecruitmentSeatLimits,
): boolean {
  return getOpenRecruitingSlots(0, limits) <= 0;
}
