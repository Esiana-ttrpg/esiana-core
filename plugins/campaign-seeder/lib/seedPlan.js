/** @typedef {'createPage' | 'patchLayout' | 'patchMetadata' | 'addAlias' | 'createCalendarEvent'} SeedOpKind */

/**
 * @typedef {object} TemporalMeta
 * @property {string} createdAt
 * @property {string} [updatedAt]
 */

/**
 * @typedef {object} SeedOpBase
 * @property {SeedOpKind} kind
 * @property {string} actorUserId
 * @property {TemporalMeta} temporal
 */

/**
 * @typedef {{ name: string }} SeedTagInput
 * @typedef {SeedOpBase & { kind: 'createPage', clientKey: string, parentKey?: string, title: string, metadata?: Record<string, unknown>, blocks?: unknown[], templateType?: string, tags?: SeedTagInput[], visibility?: 'Public' | 'Party' | 'DM_Only' }} CreatePageOp
 * @typedef {SeedOpBase & { kind: 'patchLayout', pageKey: string, blocks: unknown[] }} PatchLayoutOp
 * @typedef {SeedOpBase & { kind: 'patchMetadata', pageKey: string, patch: Record<string, unknown> }} PatchMetadataOp
 * @typedef {SeedOpBase & { kind: 'addAlias', pageKey: string, alias: string }} AddAliasOp
 * @typedef {SeedOpBase & { kind: 'createCalendarEvent', title: string, description?: string | null, dayOffset?: number }} CreateCalendarEventOp
 * @typedef {CreatePageOp | PatchLayoutOp | PatchMetadataOp | AddAliasOp | CreateCalendarEventOp} SeedOp
 */

/** @typedef {{ ops: SeedOp[], seed: string, density: string }} SeedPlan */

export function temporalFromClock(clock) {
  const t = clock.now().toISOString();
  return { createdAt: t, updatedAt: t };
}

export function markdownBlock(markdown) {
  return {
    id: `block-${Math.random().toString(36).slice(2, 9)}`,
    type: 'text-tiptap',
    x: 0,
    y: 0,
    w: 12,
    h: 10,
    isPrivate: false,
    visibility: 'Party',
    content: { markdown },
  };
}

export function wikiLinkSpan(label, targetKey, resolved = true) {
  const id = resolved ? `{{${targetKey}}}` : '';
  const stub = resolved ? '' : ' data-stub="true"';
  return `<span data-type="wikiLink" data-id="${id}" data-label="${label}"${stub}>[[${label}]]</span>`;
}

export function plainMention(label) {
  return `@${label}`;
}
