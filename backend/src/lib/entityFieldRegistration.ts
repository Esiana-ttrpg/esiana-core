import type { Prisma } from './prismaClient.js';
import type { CharacterResourceProvenance } from './characterResourceProvenance.js';

type FieldPageDb = Pick<Prisma.TransactionClient, 'characterPageTab'>;

/** API names come from trusted token provenance, never an origin supplied in the body. */
export function defaultApiFieldSheetName(declared: unknown, provenance: CharacterResourceProvenance): string | null {
  if (provenance.origin !== 'API') return null;
  return typeof declared === 'string' && declared.trim()
    ? declared.trim()
    : provenance.apiSourceName || 'External app';
}

/** Call inside the registration transaction so simultaneous registrations reuse a sheet. */
export async function resolveApiFieldSheet(db: FieldPageDb, input: {
  campaignId: string;
  entityPageId: string;
  visibility: string;
  title: string;
  provenance: CharacterResourceProvenance;
  canUsePage: (page: { hidden: boolean; visibility: string | null; coreKey?: string | null }) => boolean;
}): Promise<string> {
  const { campaignId, entityPageId: characterPageId, title, provenance } = input;
  const existing = await db.characterPageTab.findFirst({
    where: { campaignId, characterPageId, origin: 'API', apiSourceId: provenance.apiSourceId, title },
  });
  if (existing) {
    if (!input.canUsePage(existing)) throw new Error('FIELD_PAGE_FORBIDDEN');
    return existing.id;
  }
  const last = await db.characterPageTab.findFirst({
    where: { campaignId, characterPageId }, orderBy: { displayOrder: 'desc' },
    select: { displayOrder: true },
  });
  const page = await db.characterPageTab.create({ data: {
    campaignId, characterPageId, title, origin: 'API', renderMode: 'CANVAS',
    apiSourceId: provenance.apiSourceId, apiSourceName: provenance.apiSourceName,
    visibility: input.visibility, blocks: [], displayOrder: Math.max(last?.displayOrder ?? 50, 50) + 10,
  } });
  return page.id;
}

export function apiRegistrationFieldKey(provenance: CharacterResourceProvenance, sourceKey: unknown): string | null {
  return provenance.origin === 'API' && provenance.apiSourceId && typeof sourceKey === 'string' && sourceKey.trim()
    ? `api:${provenance.apiSourceId}:${sourceKey.trim()}`
    : null;
}

/** Value writability and placement management are independent permissions. */
export function fieldMutationError(origin: string, capabilities: { writable?: boolean }, patch: Record<string, unknown>): string | null {
  if (Object.hasOwn(patch, 'value') && capabilities.writable === false) return 'Field is read-only';
  if (origin === 'PLUGIN' && Object.hasOwn(patch, 'label')) return 'Provider-managed field labels cannot be changed';
  return null;
}
