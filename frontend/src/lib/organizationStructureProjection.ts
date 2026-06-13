import {
  ORGANIZATION_WORLD_STATE_LABELS,
  STRUCTURAL_ROLE_LABELS,
  parseOrganizationMetadata,
  type OrganizationWorldState,
  type StructuralRole,
} from '@/lib/organizationMetadata';
import { buildOrganizationPresenceProjection } from '@/lib/organizationPresenceProjection';
import type { WikiPageLineageSnapshot } from '@/lib/entityProjectionQueries';

export interface OrganizationChildSnapshot {
  id: string;
  title: string;
  structuralRole: StructuralRole | null;
  structuralRoleLabel: string | null;
  leaderId: string | null;
  leaderTitle: string | null;
  worldState: OrganizationWorldState | null;
  worldStateLabel: string | null;
  presenceExcerpt: string;
  pressureCount: number;
  frictionScore: number;
  divergesFromParent: boolean;
  missingLeader: boolean;
}

export interface OrganizationStructureProjection {
  parentOrgId: string | null;
  parentTitle: string | null;
  parentWorldState: OrganizationWorldState | null;
  children: OrganizationChildSnapshot[];
  childrenByRole: Array<{ roleLabel: string; children: OrganizationChildSnapshot[] }>;
  divergentChildCount: number;
  totalDescendantCount: number;
  decentralizationSignal: string | null;
}

function findPage(
  flatPages: readonly WikiPageLineageSnapshot[],
  pageId: string,
): WikiPageLineageSnapshot | null {
  return flatPages.find((page) => page.id === pageId) ?? null;
}

function computeFrictionScore(
  child: OrganizationChildSnapshot,
  parentWorldState: OrganizationWorldState | null,
): number {
  let score = 0;
  if (child.divergesFromParent) score += 3;
  if (child.missingLeader) score += 2;
  if (child.pressureCount > 0) score += child.pressureCount;
  if (
    child.worldState === 'fragmented' ||
    child.worldState === 'schismatic' ||
    child.worldState === 'corrupt'
  ) {
    score += 2;
  }
  if (parentWorldState && child.worldState && parentWorldState !== child.worldState) {
    score += 1;
  }
  return score;
}

function buildChildSnapshot(
  childPage: WikiPageLineageSnapshot,
  flatPages: readonly WikiPageLineageSnapshot[],
  parentWorldState: OrganizationWorldState | null,
): OrganizationChildSnapshot {
  const org = parseOrganizationMetadata(childPage.metadata);
  const presence = buildOrganizationPresenceProjection(childPage.id, flatPages);
  const leaderTitle = org.leaderId
    ? findPage(flatPages, org.leaderId)?.title ?? null
    : null;
  const snapshot: OrganizationChildSnapshot = {
    id: childPage.id,
    title: childPage.title,
    structuralRole: org.structuralRole,
    structuralRoleLabel: org.structuralRole
      ? STRUCTURAL_ROLE_LABELS[org.structuralRole]
      : null,
    leaderId: org.leaderId,
    leaderTitle,
    worldState: org.worldState,
    worldStateLabel: org.worldState
      ? ORGANIZATION_WORLD_STATE_LABELS[org.worldState]
      : null,
    presenceExcerpt: presence?.excerpt ?? '',
    pressureCount: org.currentPressures.length,
    frictionScore: 0,
    divergesFromParent: Boolean(
      parentWorldState && org.worldState && parentWorldState !== org.worldState,
    ),
    missingLeader: !org.leaderId,
  };
  snapshot.frictionScore = computeFrictionScore(snapshot, parentWorldState);
  return snapshot;
}

export function buildOrganizationStructureProjection(
  pageId: string,
  flatPages: readonly WikiPageLineageSnapshot[],
): OrganizationStructureProjection | null {
  const page = findPage(flatPages, pageId);
  if (!page) return null;
  const org = parseOrganizationMetadata(page.metadata);

  const parentPage = org.parentOrgId ? findPage(flatPages, org.parentOrgId) : null;
  const parentOrg = parentPage ? parseOrganizationMetadata(parentPage.metadata) : null;

  const directChildren = flatPages
    .filter((p) => parseOrganizationMetadata(p.metadata).parentOrgId === pageId)
    .map((child) => buildChildSnapshot(child, flatPages, org.worldState))
    .sort((a, b) => b.frictionScore - a.frictionScore || a.title.localeCompare(b.title));

  const roleBuckets = new Map<string, OrganizationChildSnapshot[]>();
  for (const child of directChildren) {
    const key = child.structuralRoleLabel ?? 'Divisions';
    const bucket = roleBuckets.get(key) ?? [];
    bucket.push(child);
    roleBuckets.set(key, bucket);
  }
  const childrenByRole = [...roleBuckets.entries()].map(([roleLabel, children]) => ({
    roleLabel,
    children,
  }));

  let totalDescendantCount = directChildren.length;
  for (const child of directChildren) {
    const grandchildren = flatPages.filter(
      (p) => parseOrganizationMetadata(p.metadata).parentOrgId === child.id,
    );
    totalDescendantCount += grandchildren.length;
  }

  const divergentChildCount = directChildren.filter((c) => c.divergesFromParent).length;
  let decentralizationSignal: string | null = null;
  if (divergentChildCount > 0) {
    decentralizationSignal = `${divergentChildCount} branch${divergentChildCount === 1 ? '' : 'es'} diverging`;
  } else if (directChildren.length >= 3) {
    decentralizationSignal = `${directChildren.length} divisions`;
  }

  return {
    parentOrgId: org.parentOrgId,
    parentTitle: parentPage?.title ?? null,
    parentWorldState: parentOrg?.worldState ?? null,
    children: directChildren,
    childrenByRole,
    divergentChildCount,
    totalDescendantCount,
    decentralizationSignal,
  };
}
