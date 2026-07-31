export const CHARACTER_LOCATION_ROLES = ['resident', 'visitor', 'former'] as const;

export type CharacterLocationRole = (typeof CHARACTER_LOCATION_ROLES)[number];

export interface CharacterLocationRelation {
  locationPageId: string;
  role: CharacterLocationRole;
  featured?: boolean;
}

function normalizeRole(raw: unknown): CharacterLocationRole | null {
  if (typeof raw !== 'string') return null;
  const lower = raw.trim().toLowerCase();
  if (lower === 'resident' || lower === 'visitor' || lower === 'former') {
    return lower;
  }
  return null;
}

export function normalizeCharacterLocationRelations(raw: unknown): CharacterLocationRelation[] {
  if (!Array.isArray(raw)) return [];
  const out: CharacterLocationRelation[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const obj = entry as Record<string, unknown>;
    const locationPageId =
      typeof obj.locationPageId === 'string' && obj.locationPageId.trim()
        ? obj.locationPageId.trim()
        : null;
    const role = normalizeRole(obj.role);
    if (!locationPageId || !role) continue;
    const key = `${locationPageId}:${role}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      locationPageId,
      role,
      featured: obj.featured === true,
    });
  }
  return out;
}

export function formatCharacterLocationRoleLabel(role: CharacterLocationRole): string {
  switch (role) {
    case 'resident':
      return 'Current residence';
    case 'visitor':
      return 'Visitor';
    case 'former':
      return 'Former resident';
    default:
      return role;
  }
}
