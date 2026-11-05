import { WikiVisibility } from '../types/domain.js';
import type { Prisma } from './prismaClient.js';
import { prisma } from './prisma.js';
import { ownershipFromWiki, canEditDowntimePerson, canEditDowntimeResource, authorizeDowntimePersonWrite, DowntimeAuthorizationError } from './downtimeAuthorization.js';
import { canViewWikiPage, type WikiVisibilityViewer } from './wikiTree.js';
import { buildWikiPageHref } from './wikiLinkService.js';
import { isCharacterEntityPage } from '../../../shared/resolveCanonicalEntityCategory.js';
import type { CampaignActor } from '../../../shared/campaignPolicy/policy.js';
import { CampaignWorkspace } from '../../../shared/campaignWorkspace.js';
import { RESERVED_PATH_KEY_SEGMENTS } from '../../../shared/campaignWorkspaceRoutes.js';
import { generatePathKeyFromTitle } from '../../../shared/pathKeyUtils.js';

const TYPES = ['HIRELING', 'FOLLOWER', 'MEMBER'] as const;
const STATUSES = ['ACTIVE', 'INACTIVE', 'FORMER'] as const;
type RelationshipType = (typeof TYPES)[number];
type RelationshipStatus = (typeof STATUSES)[number];

const include = {
  characterPage: { select: { id: true, title: true, visibility: true, deletedAt: true, ownerType: true, ownerUserId: true, ownerPartyId: true, workspace: true, pathKey: true, templateType: true } },
  haven: { include: { wikiPage: { select: { id: true, title: true, visibility: true, deletedAt: true, ownerType: true, ownerUserId: true, ownerPartyId: true, workspace: true, pathKey: true, templateType: true } } } },
  project: { include: { wikiPage: { select: { id: true, title: true, visibility: true, deletedAt: true, ownerType: true, ownerUserId: true, ownerPartyId: true, workspace: true, pathKey: true, templateType: true } } } },
} satisfies Prisma.DowntimePersonRelationshipInclude;

function text(value: unknown, max = 500): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, max) : null;
}

function typeOf(value: unknown): RelationshipType | null {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return TYPES.find((item) => item === normalized) ?? null;
}

function statusOf(value: unknown): RelationshipStatus | null {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return STATUSES.find((item) => item === normalized) ?? null;
}

export function resolveLifecycleAssignment<T extends { havenId: string | null; projectId: string | null }>(status: RelationshipStatus, assignment: T): T {
  return status === 'ACTIVE' ? assignment : { ...assignment, havenId: null, projectId: null };
}

function featuresOf(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 50).flatMap((raw, index) => {
    if (!raw || typeof raw !== 'object') return [];
    const item = raw as Record<string, unknown>;
    const title = text(item.title, 120);
    if (!title) return [];
    return [{ id: text(item.id, 120) ?? `feature-${index}`, title, description: text(item.description, 1000) }];
  });
}

export function buildHirelingCharacterRouting(title: string, existingCharacterPathKeys: Iterable<string>) {
  return {
    workspace: CampaignWorkspace.CHARACTERS,
    pathKey: generatePathKeyFromTitle(title, new Set(existingCharacterPathKeys), RESERVED_PATH_KEY_SEGMENTS),
  };
}

function present(row: any, handle: string, role: WikiVisibilityViewer, canEdit: boolean) {
  const target = row.haven && row.haven.wikiPage.deletedAt == null && canViewWikiPage(row.haven.wikiPage.visibility, role)
    ? { kind: 'haven' as const, id: row.haven.id, label: row.haven.wikiPage.title, href: buildWikiPageHref(handle, row.haven.wikiPage) }
    : row.project && row.project.wikiPage.deletedAt == null && canViewWikiPage(row.project.wikiPage.visibility, role)
      ? { kind: 'project' as const, id: row.project.id, label: row.project.wikiPage.title, href: buildWikiPageHref(handle, row.project.wikiPage) }
      : null;
  const compensationLabel = row.compensationUnpaid
    ? 'Unpaid'
    : row.compensationAmount == null
      ? '—'
      : `${row.compensationAmount} ${row.compensationCurrency ?? ''}${row.compensationCadence ? ` / ${String(row.compensationCadence).toLowerCase().replace('_', ' ')}` : ''}`.trim();
  return {
    id: row.id,
    characterPageId: row.characterPage.id,
    characterName: row.characterPage.title,
    characterHref: buildWikiPageHref(handle, row.characterPage),
    relationshipType: row.relationshipType,
    role: row.role,
    status: row.status,
    assignment: target,
    compensation: { amount: row.compensationAmount, currency: row.compensationCurrency, cadence: row.compensationCadence, unpaid: row.compensationUnpaid, label: compensationLabel },
    features: Array.isArray(row.features) ? row.features : [],
    notes: row.notes,
    startedAtEpochMinute: row.startedAtEpochMinute?.toString() ?? null,
    endedAtEpochMinute: row.endedAtEpochMinute?.toString() ?? null,
    canEdit,
  };
}

export async function listDowntimePeople(campaignId: string, handle: string, role: WikiVisibilityViewer, canEdit: boolean, includeCharacterOptions = false) {
  const [rows, havens, projects, pages] = await Promise.all([
    prisma.downtimePersonRelationship.findMany({ where: { campaignId }, include, orderBy: [{ status: 'asc' }, { characterPage: { title: 'asc' } }] }),
    prisma.downtimeHaven.findMany({ where: { campaignId }, include: { wikiPage: { select: { title: true, visibility: true, deletedAt: true, ownerType: true, ownerUserId: true, ownerPartyId: true } } }, orderBy: { wikiPage: { title: 'asc' } } }),
    prisma.downtimeProject.findMany({ where: { campaignId }, include: { wikiPage: { select: { title: true, visibility: true, deletedAt: true, ownerType: true, ownerUserId: true, ownerPartyId: true } } }, orderBy: { wikiPage: { title: 'asc' } } }),
    includeCharacterOptions ? prisma.wikiPage.findMany({
      where: { campaignId, deletedAt: null },
      select: { id: true, title: true, parentId: true, templateType: true, metadata: true,
        visibility: true, deletedAt: true, ownerType: true, ownerUserId: true, ownerPartyId: true },
    }) : Promise.resolve([]),
  ]);
  const pageById = new Map(pages.map((page) => [page.id, page]));
  const people = rows
    .filter((row) => row.relationshipType === 'HIRELING')
    .filter((row) => row.characterPage.deletedAt == null && canViewWikiPage(row.characterPage.visibility, role))
    .map((row) => present(row, handle, role,
      role && typeof role === 'object' && 'actor' in role && role.actor
        ? canEditDowntimePerson(role.actor, ownershipFromWiki(row.characterPage)) &&
          (!row.haven || canEditDowntimeResource(role.actor, ownershipFromWiki(row.haven.wikiPage))) &&
          (!row.project || canEditDowntimeResource(role.actor, ownershipFromWiki(row.project.wikiPage)))
        : canEdit));
  const active = people.filter((person) => person.status === 'ACTIVE');
  return {
    people,
    ...(includeCharacterOptions ? { characterOptions: pages.filter((page) => isCharacterEntityPage(page, pages, pageById) &&
      canViewWikiPage(page.visibility, role) &&
      role && typeof role === 'object' && 'actor' in role && role.actor &&
      canEditDowntimePerson(role.actor, ownershipFromWiki(page)))
      .map((page) => ({ id: page.id, label: page.title })) } : {}),
    summary: { active: active.length, assignedToProjects: active.filter((p) => p.assignment?.kind === 'project').length, assignedToHavens: active.filter((p) => p.assignment?.kind === 'haven').length, unassigned: active.filter((p) => !p.assignment).length },
    assignmentOptions: {
      havens: havens.filter((row) => row.wikiPage.deletedAt == null && canViewWikiPage(row.wikiPage.visibility, role) &&
        (!(role && typeof role === 'object' && 'actor' in role && role.actor) ||
          canEditDowntimeResource(role.actor, ownershipFromWiki(row.wikiPage)))).map((row) => ({ id: row.id, label: row.wikiPage.title })),
      projects: projects.filter((row) => row.wikiPage.deletedAt == null && canViewWikiPage(row.wikiPage.visibility, role) &&
        (!(role && typeof role === 'object' && 'actor' in role && role.actor) ||
          canEditDowntimeResource(role.actor, ownershipFromWiki(row.wikiPage)))).map((row) => ({ id: row.id, label: row.wikiPage.title })),
    },
  };
}

async function validateAssignment(tx: Prisma.TransactionClient, campaignId: string, havenId: string | null, projectId: string | null) {
  if (havenId && projectId) throw new Error('Choose either a Haven or Project assignment, not both.');
  if (havenId && !(await tx.downtimeHaven.findFirst({ where: { id: havenId, campaignId } }))) throw new Error('Haven assignment not found.');
  if (projectId && !(await tx.downtimeProject.findFirst({ where: { id: projectId, campaignId } }))) throw new Error('Project assignment not found.');
}

async function addHirelingTag(tx: Prisma.TransactionClient, campaignId: string, pageId: string) {
  await tx.wikiPage.update({ where: { id: pageId }, data: { tags: { connectOrCreate: { where: { campaignId_name: { campaignId, name: 'hireling' } }, create: { campaignId, name: 'hireling', label: 'Hireling' } } } } });
}

export async function createDowntimePerson(campaignId: string, actorUserId: string, raw: Record<string, unknown>, actor: CampaignActor) {
  const relationshipType = typeOf(raw.relationshipType);
  if (!relationshipType) return { ok: false as const, status: 400, error: 'Relationship must be Hireling, Follower, or Member.' };
  const characterPageId = text(raw.characterPageId, 100);
  const characterName = text(raw.characterName, 200);
  if (!characterPageId && !characterName) return { ok: false as const, status: 400, error: 'Choose an existing Character or provide a name.' };
  try {
    const created = await prisma.$transaction(async (tx) => {
      let pageId = characterPageId;
      if (pageId) {
        const page = await tx.wikiPage.findFirst({ where: { id: pageId, campaignId, deletedAt: null } });
        if (!page) throw new Error('Character not found.');
      } else {
        const candidates = await tx.wikiPage.findMany({
          where: { campaignId, deletedAt: null },
          select: { id: true, metadata: true, workspace: true, pathKey: true },
        });
        const folder = candidates.find((page) => { const meta = page.metadata as Record<string, unknown> | null; return meta?.systemCategoryKey === 'characters' || meta?.categoryKey === 'characters'; });
        if (!folder) throw new Error('Characters category not found.');
        const routing = buildHirelingCharacterRouting(
          characterName!,
          candidates.flatMap((page) => page.workspace === CampaignWorkspace.CHARACTERS && page.pathKey ? [page.pathKey] : []),
        );
        const page = await tx.wikiPage.create({
          data: {
            campaignId,
            parentId: folder.id,
            title: characterName!,
            visibility: WikiVisibility.PARTY,
            templateType: 'CHARACTER',
            workspace: routing.workspace,
            pathKey: routing.pathKey,
            metadata: { character: {} },
            createdByUserId: actorUserId,
            ownerType: 'USER',
            ownerUserId: actorUserId,
          },
          select: { id: true },
        });
        pageId = page.id;
      }
      await authorizeDowntimePersonWrite(tx, actor, campaignId, pageId!, raw);
      if (characterPageId) {
        const pages = await tx.wikiPage.findMany({
          where: { campaignId, deletedAt: null },
          select: { id: true, title: true, parentId: true, templateType: true, metadata: true },
        });
        const character = pages.find((page) => page.id === characterPageId);
        if (!character || !isCharacterEntityPage(character, pages)) throw new Error('A Character page is required.');
      }
      const existing = await tx.downtimePersonRelationship.findFirst({ where: { campaignId, characterPageId: pageId!, status: 'ACTIVE' } });
      if (existing) throw new Error('This Character already has an active Downtime relationship.');
      const havenId = text(raw.havenId, 100);
      const projectId = text(raw.projectId, 100);
      await validateAssignment(tx, campaignId, havenId, projectId);
      const row = await tx.downtimePersonRelationship.create({ data: { campaignId, characterPageId: pageId!, activeCharacterKey: pageId!, relationshipType, role: text(raw.role, 200), havenId, projectId, compensationAmount: typeof raw.compensationAmount === 'number' && Number.isInteger(raw.compensationAmount) && raw.compensationAmount >= 0 ? raw.compensationAmount : null, compensationCurrency: text(raw.compensationCurrency, 80), compensationCadence: text(raw.compensationCadence, 40)?.toUpperCase() ?? null, compensationUnpaid: raw.compensationUnpaid === true, features: featuresOf(raw.features), notes: text(raw.notes, 5000), updatedByUserId: actorUserId }, include });
      if (raw.addHirelingTag === true) await addHirelingTag(tx, campaignId, pageId!);
      return row;
    });
    return { ok: true as const, row: created };
  } catch (error) {
    return { ok: false as const, status: error instanceof DowntimeAuthorizationError ? 403 : 400, error: error instanceof Error ? error.message : 'Unable to create relationship.' };
  }
}

export async function updateDowntimePerson(campaignId: string, id: string, actorUserId: string, raw: Record<string, unknown>, actor: CampaignActor) {
  try {
    const row = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`UPDATE "DowntimePersonRelationship" SET "id" = "id" WHERE "id" = ${id} AND "campaignId" = ${campaignId}`;
      const current = await tx.downtimePersonRelationship.findFirst({ where: { id, campaignId } });
      if (!current) throw new Error('Relationship not found.');
      await authorizeDowntimePersonWrite(tx, actor, campaignId, current.characterPageId, raw, current);
      const havenId = raw.havenId === undefined ? current.havenId : text(raw.havenId, 100);
      const projectId = raw.projectId === undefined ? current.projectId : text(raw.projectId, 100);
      await validateAssignment(tx, campaignId, havenId, projectId);
      const relationshipType = raw.relationshipType === undefined ? current.relationshipType as RelationshipType : typeOf(raw.relationshipType);
      const status = raw.status === undefined ? current.status as RelationshipStatus : statusOf(raw.status);
      if (!relationshipType || !status) throw new Error('Invalid relationship type or status.');
      if (status === 'ACTIVE') {
        const activeConflict = await tx.downtimePersonRelationship.findFirst({ where: { campaignId, characterPageId: current.characterPageId, status: 'ACTIVE', id: { not: id } }, select: { id: true } });
        if (activeConflict) throw new Error('This Character already has an active Downtime relationship.');
      }
      const assignment = resolveLifecycleAssignment(status, { havenId, projectId });
      const compensationAmount = raw.compensationAmount === undefined
        ? undefined
        : typeof raw.compensationAmount === 'number' && Number.isInteger(raw.compensationAmount) && raw.compensationAmount >= 0
          ? raw.compensationAmount
          : null;
      const updated = await tx.downtimePersonRelationship.update({ where: { id }, data: { relationshipType, status, activeCharacterKey: status === 'ACTIVE' ? current.characterPageId : null, role: raw.role === undefined ? undefined : text(raw.role, 200), havenId: assignment.havenId, projectId: assignment.projectId, compensationAmount, compensationCurrency: raw.compensationCurrency === undefined ? undefined : text(raw.compensationCurrency, 80), compensationCadence: raw.compensationCadence === undefined ? undefined : text(raw.compensationCadence, 40)?.toUpperCase() ?? null, compensationUnpaid: raw.compensationUnpaid === undefined ? undefined : raw.compensationUnpaid === true, features: raw.features === undefined ? undefined : featuresOf(raw.features), notes: raw.notes === undefined ? undefined : text(raw.notes, 5000), endedAtEpochMinute: status === 'FORMER' && current.status !== 'FORMER' ? (await tx.campaign.findUnique({ where: { id: campaignId }, select: { currentEpochMinute: true } }))?.currentEpochMinute ?? null : status !== 'FORMER' ? null : undefined, updatedByUserId: actorUserId }, include });
      return updated;
    });
    return { ok: true as const, row };
  } catch (error) { return { ok: false as const, status: error instanceof DowntimeAuthorizationError ? 403 : 400, error: error instanceof Error ? error.message : 'Unable to update relationship.' }; }
}

export function presentDowntimePerson(row: unknown, handle: string, role: WikiVisibilityViewer, canEdit: boolean) { return present(row, handle, role, canEdit); }
