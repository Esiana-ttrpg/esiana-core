import {
  charactersInOrg,
  type WikiPageLineageSnapshot,
} from '@/lib/entityProjectionQueries';
import { parseCharacterLineageMetadata } from '@/lib/characterLineageMetadata';
import { parseOrganizationMetadata } from '@/lib/organizationMetadata';
import type { ChronologyDateParts } from '@/lib/entityRelationTypes';

export type OrganizationNarrativeArchetype =
  | 'leader'
  | 'public_face'
  | 'founder'
  | 'enforcer'
  | 'visionary'
  | 'defector'
  | 'patron'
  | 'agent'
  | 'figure';

export const ARCHETYPE_LABELS: Record<OrganizationNarrativeArchetype, string> = {
  leader: 'Leadership',
  public_face: 'Public face',
  founder: 'Founders',
  enforcer: 'Enforcers',
  visionary: 'Ideological visionaries',
  defector: 'Defectors',
  patron: 'Patrons',
  agent: 'Agents',
  figure: 'Key figures',
};

export interface OrganizationEmbodyingFigure {
  id: string;
  title: string;
  role: string | null;
  archetype: OrganizationNarrativeArchetype;
  archetypeLabel: string;
  subtitle: string | null;
  significanceScore: number;
}

function resolveAffiliationRole(
  member: WikiPageLineageSnapshot,
  orgPageId: string,
): string | null {
  const lineage = parseCharacterLineageMetadata(member.metadata);
  return lineage.orgAffiliations.find((a) => a.orgId === orgPageId)?.role ?? null;
}

function inferArchetype(
  member: WikiPageLineageSnapshot,
  orgPageId: string,
  leaderId: string | null,
): OrganizationNarrativeArchetype {
  if (leaderId && member.id === leaderId) return 'leader';
  const role = (resolveAffiliationRole(member, orgPageId) ?? '').toLowerCase();
  if (role.includes('founder')) return 'founder';
  if (role.includes('defector') || role.includes('ex-')) return 'defector';
  if (role.includes('patron') || role.includes('benefactor')) return 'patron';
  if (role.includes('enforcer') || role.includes('captain') || role.includes('commander')) {
    return 'enforcer';
  }
  if (role.includes('visionary') || role.includes('high priest') || role.includes('arch')) {
    return 'visionary';
  }
  if (role.includes('agent') || role.includes('spy') || role.includes('operative')) {
    return 'agent';
  }
  if (role.includes('face') || role.includes('spokesperson') || role.includes('figurehead')) {
    return 'public_face';
  }
  return 'figure';
}

function significanceScore(archetype: OrganizationNarrativeArchetype): number {
  const scores: Record<OrganizationNarrativeArchetype, number> = {
    leader: 100,
    public_face: 90,
    founder: 85,
    defector: 80,
    enforcer: 75,
    visionary: 70,
    patron: 65,
    agent: 60,
    figure: 50,
  };
  return scores[archetype];
}

export function buildOrganizationPeopleProjection(
  orgPageId: string,
  snapshots: WikiPageLineageSnapshot[],
  campaignNow: ChronologyDateParts,
  isDMUser: boolean,
): OrganizationEmbodyingFigure[] {
  const org = parseOrganizationMetadata(
    snapshots.find((s) => s.id === orgPageId)?.metadata,
  );
  const members = charactersInOrg(orgPageId, snapshots, campaignNow, isDMUser);
  return members
    .map((member) => {
      const role = resolveAffiliationRole(member, orgPageId);
      const archetype = inferArchetype(member, orgPageId, org.leaderId);
      return {
        id: member.id,
        title: member.title,
        role,
        archetype,
        archetypeLabel: ARCHETYPE_LABELS[archetype],
        subtitle: role,
        significanceScore: significanceScore(archetype),
      };
    })
    .sort((a, b) => b.significanceScore - a.significanceScore || a.title.localeCompare(b.title));
}

export function groupFiguresByArchetype(
  figures: OrganizationEmbodyingFigure[],
): Array<{ archetype: OrganizationNarrativeArchetype; label: string; figures: OrganizationEmbodyingFigure[] }> {
  const order: OrganizationNarrativeArchetype[] = [
    'leader',
    'public_face',
    'founder',
    'enforcer',
    'visionary',
    'agent',
    'patron',
    'defector',
    'figure',
  ];
  const buckets = new Map<OrganizationNarrativeArchetype, OrganizationEmbodyingFigure[]>();
  for (const fig of figures) {
    const list = buckets.get(fig.archetype) ?? [];
    list.push(fig);
    buckets.set(fig.archetype, list);
  }
  return order
    .filter((key) => (buckets.get(key)?.length ?? 0) > 0)
    .map((key) => ({
      archetype: key,
      label: ARCHETYPE_LABELS[key],
      figures: buckets.get(key) ?? [],
    }));
}
