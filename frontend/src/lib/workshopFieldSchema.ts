import type { WorkshopFormalizeTarget, WorkshopDocument } from '@shared/workshopDocument';
import {
  getWorkshopFormalizeTargetDef,
  WORKSHOP_FORMALIZE_TARGET_DEFS,
} from '@shared/workshopFormalize';
import type {
  WorkshopFieldGroup,
  WorkshopFieldSchema,
  WorkshopFieldSlot,
} from '@shared/workshopFieldSchema';
import type { WikiPageBlock, WikiPageLayoutPayload, WikiTreeNode } from '@/types/wiki';
import { resolveEntityPageShell } from '@/lib/entityPageShells/registry';
import { resolveEntitySurfaceProfile, type SurfaceProfileKey } from '@/lib/entitySurfaceProfile';
import { buildInfoboxProjection } from '@/lib/buildInfoboxProjection';
import { parseCharacterMetadata } from '@/lib/characterMetadata';
import { resolveEntityKindLabel } from '@/lib/wikiPageHeaderMeta';

export const TARGET_LABELS: Record<WorkshopFormalizeTarget, string> = Object.fromEntries(
  WORKSHOP_FORMALIZE_TARGET_DEFS.map((def) => [def.id, def.label]),
) as Record<WorkshopFormalizeTarget, string>;

const WIDGET_SUBVIEWS = new Set(['relationships', 'timeline', 'discovery', 'continuity']);

function slot(
  partial: Omit<WorkshopFieldSlot, 'blockType'> & { blockType?: string },
): WorkshopFieldSlot {
  return {
    blockType: partial.blockType ?? 'metadata',
    ...partial,
  };
}

function characterOverviewSlots(): WorkshopFieldSlot[] {
  return [
    slot({
      fieldKey: 'pageTitle',
      label: 'Title',
      subviewId: 'overview',
      editorKind: 'page-title',
      blockType: 'page',
    }),
    slot({
      fieldKey: 'profession',
      label: 'Profession',
      subviewId: 'overview',
      editorKind: 'metadata',
      metadataPath: 'profession',
    }),
    slot({
      fieldKey: 'pronouns',
      label: 'Pronouns',
      subviewId: 'overview',
      editorKind: 'metadata',
      metadataPath: 'appearance.pronouns',
    }),
    slot({
      fieldKey: 'honorific',
      label: 'Honorific',
      subviewId: 'overview',
      editorKind: 'metadata',
      metadataPath: 'title',
    }),
    slot({
      fieldKey: 'knownFor',
      label: 'Known for',
      subviewId: 'overview',
      editorKind: 'metadata',
      metadataPath: 'knownFor',
    }),
    slot({
      fieldKey: 'activeArc',
      label: 'Active arc',
      subviewId: 'overview',
      editorKind: 'metadata',
      metadataPath: 'activeArc',
    }),
    slot({
      fieldKey: 'motivation',
      label: 'Motivation',
      subviewId: 'overview',
      editorKind: 'metadata',
      metadataPath: 'motivation',
    }),
  ];
}

function characterAppearanceSlots(): WorkshopFieldSlot[] {
  return [
    slot({ fieldKey: 'gender', label: 'Gender', subviewId: 'appearance', editorKind: 'appearance', metadataPath: 'appearance.gender' }),
    slot({ fieldKey: 'presentation', label: 'Presentation', subviewId: 'appearance', editorKind: 'appearance', metadataPath: 'appearance.presentation' }),
    slot({ fieldKey: 'summary', label: 'Summary', subviewId: 'appearance', editorKind: 'appearance', metadataPath: 'appearance.summary' }),
    slot({ fieldKey: 'height', label: 'Height', subviewId: 'appearance', editorKind: 'appearance', metadataPath: 'appearance.height' }),
    slot({ fieldKey: 'build', label: 'Build', subviewId: 'appearance', editorKind: 'appearance', metadataPath: 'appearance.build' }),
  ];
}

function organizationOverviewSlots(
  metadata: unknown,
  flatPages: WikiTreeNode[],
): WorkshopFieldSlot[] {
  const slots: WorkshopFieldSlot[] = [
    slot({ fieldKey: 'pageTitle', label: 'Title', subviewId: 'overview', editorKind: 'page-title', blockType: 'page' }),
  ];
  for (const field of buildInfoboxProjection('DEFAULT', metadata, flatPages, 'organization')) {
    slots.push(
      slot({
        fieldKey: `infobox:${field.key}`,
        label: field.key,
        subviewId: 'overview',
        editorKind: 'infobox',
        infoboxKey: field.key,
      }),
    );
  }
  return slots;
}

function familyOverviewSlots(metadata: unknown, flatPages: WikiTreeNode[]): WorkshopFieldSlot[] {
  const slots: WorkshopFieldSlot[] = [
    slot({ fieldKey: 'pageTitle', label: 'Title', subviewId: 'overview', editorKind: 'page-title', blockType: 'page' }),
  ];
  for (const field of buildInfoboxProjection('DEFAULT', metadata, flatPages, 'family')) {
    slots.push(
      slot({
        fieldKey: `infobox:${field.key}`,
        label: field.key,
        subviewId: 'overview',
        editorKind: 'infobox',
        infoboxKey: field.key,
      }),
    );
  }
  return slots;
}

function bestiaryOverviewSlots(metadata: unknown, flatPages: WikiTreeNode[]): WorkshopFieldSlot[] {
  const slots: WorkshopFieldSlot[] = [
    slot({ fieldKey: 'pageTitle', label: 'Title', subviewId: 'overview', editorKind: 'page-title', blockType: 'page' }),
  ];
  for (const field of buildInfoboxProjection('DEFAULT', metadata, flatPages, 'bestiary')) {
    slots.push(
      slot({
        fieldKey: `infobox:${field.key}`,
        label: field.key,
        subviewId: 'overview',
        editorKind: 'infobox',
        infoboxKey: field.key,
      }),
    );
  }
  return slots;
}

function expandSemanticFieldGroups(input: {
  surfaceKey: SurfaceProfileKey;
  pageTitle: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  isDMUser: boolean;
}): WorkshopFieldGroup[] {
  const { surfaceKey, metadata, flatPages, isDMUser } = input;
  const shell = resolveEntityPageShell(surfaceKey);
  const subviews = shell.getVisibleSubviews(isDMUser);
  const groups = new Map<string, WorkshopFieldGroup>();

  for (const subview of subviews) {
    groups.set(subview.id, { subviewId: subview.id, label: subview.label, slots: [] });
  }

  let overviewSlots: WorkshopFieldSlot[] = [];
  if (surfaceKey === 'character') {
    overviewSlots = characterOverviewSlots();
    const appearance = groups.get('appearance');
    if (appearance) appearance.slots = characterAppearanceSlots();
  } else if (surfaceKey === 'organization') {
    overviewSlots = organizationOverviewSlots(metadata, flatPages);
  } else if (surfaceKey === 'family') {
    overviewSlots = familyOverviewSlots(metadata, flatPages);
  } else if (surfaceKey === 'bestiary') {
    overviewSlots = bestiaryOverviewSlots(metadata, flatPages);
  } else {
    overviewSlots = [
      slot({ fieldKey: 'pageTitle', label: 'Title', subviewId: 'overview', editorKind: 'page-title', blockType: 'page' }),
    ];
  }

  const overview = groups.get('overview');
  if (overview) overview.slots = overviewSlots;

  for (const subview of subviews) {
    if (!WIDGET_SUBVIEWS.has(subview.id)) continue;
    const group = groups.get(subview.id);
    if (!group) continue;
    group.slots = [
      slot({
        fieldKey: `widget:${subview.id}`,
        label: subview.label,
        subviewId: subview.id,
        editorKind: 'widget',
        blockType: 'widget',
      }),
    ];
  }

  return [...groups.values()].filter((g) => g.slots.length > 0);
}

export function resolveWorkshopFieldSchema(input: {
  draft: WorkshopDocument;
  anchorPage?: WikiPageLayoutPayload | null;
  flatPages?: WikiTreeNode[];
  isDMUser?: boolean;
}): WorkshopFieldSchema | null {
  const { draft, anchorPage, flatPages = [], isDMUser = true } = input;

  if (draft.binding === 'anchored' && anchorPage) {
    const surfaceKey = resolveEntitySurfaceProfile({
      pageId: anchorPage.id,
      templateType: anchorPage.templateType,
      metadata: anchorPage.metadata,
      flatPages,
    }).key;
    return {
      binding: 'anchored',
      surfaceKey,
      anchorPageId: draft.anchorEntityIds?.[0] ?? null,
      fieldGroups: expandSemanticFieldGroups({
        surfaceKey,
        pageTitle: anchorPage.title,
        metadata: anchorPage.metadata,
        flatPages,
        isDMUser,
      }),
      proseBlockTypes: ['text-tiptap', 'text-biography'],
    };
  }

  if (draft.binding === 'shadow' && draft.intendedTarget) {
    const def = getWorkshopFormalizeTargetDef(draft.intendedTarget);
    const surfaceKey = (def.surfaceKey === 'default' ? 'default' : def.surfaceKey) as SurfaceProfileKey;
    const metadata = draft.fieldShadow?.metadata ?? {};
    return {
      binding: 'shadow',
      surfaceKey,
      intendedTarget: draft.intendedTarget,
      fieldGroups: expandSemanticFieldGroups({
        surfaceKey,
        pageTitle: draft.title,
        metadata,
        flatPages,
        isDMUser,
      }),
      proseBlockTypes: ['text-tiptap', 'text-biography'],
    };
  }

  return null;
}

export function workshopDraftTypeLabel(
  draft: WorkshopDocument,
  flatPages: WikiTreeNode[] = [],
): string | null {
  if (draft.intendedTarget) {
    return TARGET_LABELS[draft.intendedTarget] ?? null;
  }
  const anchorId = draft.anchorEntityIds?.[0];
  if (!anchorId) return null;
  const page = flatPages.find((p) => p.id === anchorId);
  if (!page) return null;
  const profile = resolveEntitySurfaceProfile({
    pageId: page.id,
    templateType: page.templateType,
    metadata: page.metadata,
    flatPages,
  });
  return resolveEntityKindLabel(profile.key, page.templateType);
}

export function workshopDraftDisplayLabel(
  draft: WorkshopDocument,
  options?: { anchorTitle?: string; flatPages?: WikiTreeNode[] },
): string {
  const typeLabel = workshopDraftTypeLabel(draft, options?.flatPages ?? []);
  const prefix = typeLabel ? `[${typeLabel}] ` : '';
  if (draft.binding === 'anchored' && options?.anchorTitle) {
    return `${prefix}${options.anchorTitle}`;
  }
  if (draft.intendedTarget) {
    return `${prefix}New ${TARGET_LABELS[draft.intendedTarget] ?? draft.intendedTarget}`;
  }
  return `${prefix}${draft.title || 'Untitled'}`;
}

export function workshopTabLabel(
  draft: WorkshopDocument,
  anchorTitle?: string,
  flatPages?: WikiTreeNode[],
): string {
  return workshopDraftDisplayLabel(draft, { anchorTitle, flatPages });
}

export { TARGET_LABELS as WORKSHOP_CREATE_TARGET_LABELS };

export function readMetadataFieldValue(metadata: unknown, path: string): string {
  if (path === 'profession') {
    return parseCharacterMetadata(metadata).profession ?? '';
  }
  const parts = path.split('.');
  let current: unknown = metadata;
  for (const part of parts) {
    if (!current || typeof current !== 'object') return '';
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : '';
}

export function buildMetadataPatch(path: string, value: string): Record<string, unknown> {
  const trimmed = value.trim() || null;
  if (!path.includes('.')) {
    return { [path]: trimmed };
  }
  const [head, ...rest] = path.split('.');
  let nested: Record<string, unknown> = { [rest[rest.length - 1]!]: trimmed };
  for (let i = rest.length - 2; i >= 0; i -= 1) {
    nested = { [rest[i]!]: nested };
  }
  return { [head!]: nested };
}
