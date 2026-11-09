/** Character fields have the same page/relationship audience as canonical wiki content. */
export function characterAudienceMetadata(
  raw: Record<string, unknown>, pageId: string, visibleIds: ReadonlySet<string>,
  canView: (visibility: string) => boolean, hiddenRelations: ReadonlySet<string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  // Copy the declared character schema, not opaque plugin/editor metadata. Keep raw
  // nested visibility until the common content projector has checked it.
  for (const key of ['profession', 'title', 'ancestry', 'status', 'knownFor', 'activeArc', 'motivation',
    'partyParticipation', 'appearance', 'pronouns', 'gender', 'birthDate', 'deathDate',
    'successionStart', 'successionEnd', 'lineageRole', 'houseBranch', 'bloodlineStatus', 'legitimacy']) {
    if (raw[key] !== undefined) result[key] = raw[key];
  }
  for (const key of ['currentLocationId', 'primaryAffiliationId', 'ancestryId', 'lineageId', 'familyId']) {
    if (raw[key] !== undefined) result[key] = typeof raw[key] === 'string' && visibleIds.has(raw[key]) ? raw[key] : null;
  }
  if (typeof raw.ancestryId === 'string' && !visibleIds.has(raw.ancestryId)) delete result.ancestry;
  const collections = [
    ['parentLinks', 'targetCharacterId', 'character_lineage_parent'],
    ['spouseLinks', 'targetCharacterId', 'character_lineage_spouse'],
    ['orgAffiliations', 'orgId', 'character_affiliation'],
    ['socialLinks', 'targetPageId', 'character_social'],
    ['locationRelations', 'locationPageId', 'character_location'],
  ] as const;
  for (const [key, targetKey, prefix] of collections) {
    if (!Array.isArray(raw[key])) continue;
    result[key] = raw[key].filter((item: unknown) => {
      if (!item || typeof item !== 'object') return false;
      const row = item as Record<string, unknown>;
      const target = row[targetKey];
      const sourceKey = key === 'locationRelations' ? `${prefix}:${pageId}:${target}:${row.role}` : `${prefix}:${pageId}:${row.id}`;
      return typeof target === 'string' && visibleIds.has(target) &&
        (typeof row.visibility !== 'string' || canView(row.visibility)) &&
        !hiddenRelations.has(sourceKey) && !hiddenRelations.has(String(row.id));
    });
  }
  // These index labels cache linked page titles. Rebuild them from projected IDs
  // in the hub instead of returning stale labels for hidden locations/families.
  if (Array.isArray(raw.quickInfo)) result.quickInfo = raw.quickInfo.filter((item: unknown) => {
    if (!item || typeof item !== 'object') return false;
    return ['Profession', 'Role', 'Status', 'Known For', 'Party', 'Pronouns', 'Gender'].includes(String((item as { key?: unknown }).key));
  });
  return result;
}
