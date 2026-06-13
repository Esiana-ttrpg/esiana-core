const TEXT_FIELD_MAX = 120;

export function sanitizeRecruitmentText(
  raw: unknown,
  maxLength = TEXT_FIELD_MAX,
): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'string') return null;
  let value = raw.trim();
  if (!value) return null;
  value = value.replace(/<[^>]+>/g, '');
  if (value.length > maxLength) {
    value = value.slice(0, maxLength);
  }
  return value;
}

export function sanitizeRecruitmentInt(
  raw: unknown,
  { min = 0, max = 9999 }: { min?: number; max?: number } = {},
): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  const value = typeof raw === 'number' ? raw : Number.parseInt(String(raw), 10);
  if (!Number.isFinite(value) || value < min || value > max) return undefined;
  return value;
}

export function sanitizeRecruitmentStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const normalized = raw
    .map((entry) => (typeof entry === 'string' ? entry : String(entry ?? '')))
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.slice(0, 60));
  return Array.from(new Set(normalized)).slice(0, 20);
}

export function parseRecruitmentStringArray(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter((v): v is string => typeof v === 'string');
  }
  return [];
}

export function countFilledPlayerSeats(
  members: Array<{ role: string }>,
): number {
  return members.filter((m) => m.role === 'PARTICIPANT').length;
}

export interface TablePlayerMemberRow {
  role: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export interface PublicTablePlayer {
  id: string;
  label: string;
  avatarUrl: string | null;
}

export function mapPublicTablePlayers(
  members: TablePlayerMemberRow[],
  resolveLabel: (user: TablePlayerMemberRow['user']) => string,
  resolveAvatarUrl: (userId: string, hasAvatar: boolean) => string | null,
  maxCount: number,
): PublicTablePlayer[] {
  const players = members
    .filter((m) => m.role === 'PARTICIPANT')
    .map((m) => ({
      id: m.user.id,
      label: resolveLabel(m.user),
      avatarUrl: resolveAvatarUrl(m.user.id, Boolean(m.user.avatarUrl)),
    }));
  if (maxCount > 0) return players.slice(0, maxCount);
  return players;
}

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

/** Lobby / table fill: party size when set, else recruiting capacity. */
export function getLobbyTableCapacity(limits: RecruitmentSeatLimits): number {
  const party = limits.maxPlayers > 0 ? limits.maxPlayers : 0;
  if (party > 0) return party;
  return getRecruitingPlayerCapacity(limits);
}

export function isRecruitmentTableFull(
  filledSeats: number,
  limits: RecruitmentSeatLimits,
): boolean {
  const capacity = getRecruitingPlayerCapacity(limits);
  return capacity > 0 && filledSeats >= capacity;
}

export function isLobbyTableFull(
  filledSeats: number,
  limits: RecruitmentSeatLimits,
): boolean {
  if (limits.maxPlayers > 0 && filledSeats >= limits.maxPlayers) return true;
  if (limits.maxSeats > 0 && filledSeats >= limits.maxSeats) return true;
  if (limits.maxPlayers > 0) return false;
  return isRecruitmentTableFull(filledSeats, limits);
}
