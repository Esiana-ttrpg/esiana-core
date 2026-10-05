import { prisma } from './prisma.js';

/** Remove associations to undisclosed eras without hiding the surrounding wiki page. */
export function redactEraReferences(value: unknown, hidden: ReadonlySet<string>): unknown {
  if (Array.isArray(value)) return value
    .filter(item => !(item && typeof item === 'object' && typeof item.eraId === 'string' && hidden.has(item.eraId)))
    .map(item => redactEraReferences(item, hidden));
  if (!value || typeof value !== 'object') return value;
  const result = { ...value as Record<string, unknown> };
  for (const key of ['eraId', 'byEraId']) {
    const snapshotKey = key === 'eraId' ? 'eraSnapshot' : 'byEraSnapshot';
    const snapshot = result[snapshotKey] as { visibility?: string } | undefined;
    if ((typeof result[key] === 'string' && hidden.has(result[key] as string)) || snapshot?.visibility === 'DM_ONLY') {
      result[key] = null; delete result[snapshotKey];
    }
  }
  for (const [key, child] of Object.entries(result)) result[key] = redactEraReferences(child, hidden);
  return result;
}
export async function hiddenEraIds(campaignId: string): Promise<Set<string>> {
  return new Set((await prisma.campaignEra.findMany({ where: { campaignId, visibility: 'DM_ONLY' }, select: { id: true } })).map(row => row.id));
}
