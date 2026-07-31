import { parseOrganizationMetadata } from '@/lib/organizationMetadata';
import type { WikiTreeNode } from '@/types/wiki';

export type OrganizationLocationRole =
  | 'headquarters'
  | 'presence'
  | 'territory'
  | 'influence';

export interface OrganizationLocationRelation {
  organizationId: string;
  locationId: string;
  role: OrganizationLocationRole;
}

export interface OrganizationAtLocation {
  organizationId: string;
  title: string;
  roles: OrganizationLocationRole[];
}

function pushRelation(
  map: Map<string, Set<OrganizationLocationRole>>,
  orgId: string,
  role: OrganizationLocationRole,
): void {
  const roles = map.get(orgId) ?? new Set();
  roles.add(role);
  map.set(orgId, roles);
}

export function collectOrganizationLocationRelations(
  orgPageId: string,
  metadata: unknown,
): OrganizationLocationRelation[] {
  const org = parseOrganizationMetadata(metadata);
  const rows: OrganizationLocationRelation[] = [];
  if (org.headquartersId) {
    rows.push({
      organizationId: orgPageId,
      locationId: org.headquartersId,
      role: 'headquarters',
    });
  }
  for (const id of org.strongholdLocationIds) {
    rows.push({ organizationId: orgPageId, locationId: id, role: 'presence' });
  }
  for (const id of org.hiddenEnclaveIds) {
    rows.push({ organizationId: orgPageId, locationId: id, role: 'presence' });
  }
  for (const id of org.activeTerritoryIds) {
    rows.push({ organizationId: orgPageId, locationId: id, role: 'territory' });
  }
  for (const id of org.contestedZoneIds) {
    rows.push({ organizationId: orgPageId, locationId: id, role: 'territory' });
  }
  for (const id of org.influenceRegionIds) {
    rows.push({ organizationId: orgPageId, locationId: id, role: 'influence' });
  }
  for (const id of org.tradeReachRegionIds) {
    rows.push({ organizationId: orgPageId, locationId: id, role: 'influence' });
  }
  return rows;
}

export function buildOrganizationsAtLocation(
  locationPageId: string,
  flatPages: readonly WikiTreeNode[],
): OrganizationAtLocation[] {
  const byOrg = new Map<string, Set<OrganizationLocationRole>>();

  for (const page of flatPages) {
    const relations = collectOrganizationLocationRelations(page.id, page.metadata);
    for (const rel of relations) {
      if (rel.locationId !== locationPageId) continue;
      pushRelation(byOrg, rel.organizationId, rel.role);
    }
  }

  const out: OrganizationAtLocation[] = [];
  for (const [organizationId, roles] of byOrg) {
    const page = flatPages.find((p) => p.id === organizationId);
    if (!page) continue;
    out.push({
      organizationId,
      title: page.title,
      roles: [...roles].sort((a, b) => roleOrder(a) - roleOrder(b)),
    });
  }
  out.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
  return out;
}

function roleOrder(role: OrganizationLocationRole): number {
  switch (role) {
    case 'headquarters':
      return 0;
    case 'presence':
      return 1;
    case 'territory':
      return 2;
    case 'influence':
      return 3;
    default:
      return 4;
  }
}

export function groupOrganizationsByPrimaryRole(
  orgs: OrganizationAtLocation[],
): Record<OrganizationLocationRole, OrganizationAtLocation[]> {
  const groups: Record<OrganizationLocationRole, OrganizationAtLocation[]> = {
    headquarters: [],
    presence: [],
    territory: [],
    influence: [],
  };
  for (const org of orgs) {
    const primary = org.roles[0] ?? 'influence';
    groups[primary].push(org);
  }
  return groups;
}

export function formatOrganizationLocationRoleLabel(
  role: OrganizationLocationRole,
): string {
  switch (role) {
    case 'headquarters':
      return 'Headquarters';
    case 'presence':
      return 'Presence';
    case 'territory':
      return 'Territory';
    case 'influence':
      return 'Influence';
    default:
      return role;
  }
}
