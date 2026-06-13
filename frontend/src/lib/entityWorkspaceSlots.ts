import type { SurfaceProfileKey } from '@/lib/entitySurfaceProfile';

/** Phase 2 — per-surface emphasis inside EntityWorkspaceSurface (slots, not shell tokens). */
export interface EntityWorkspaceSlotConfig {
  /** Player-facing read-context panel heading. */
  emphasisTitle: string;
  /** Show EntityReadContextPanel above lore for non-DM readers. */
  readerFirst: boolean;
  /** Max relationship / preview chips in the emphasis panel. */
  relationshipPreviewLimit: number;
  /** Structure tab link label when structureTab is set on the profile. */
  structureLinkLabel?: string;
}

const ENTITY_WORKSPACE_SLOTS: Record<
  Extract<
    SurfaceProfileKey,
    | 'character'
    | 'organization'
    | 'family'
    | 'bestiary'
    | 'ancestry'
    | 'object'
    | 'location'
  >,
  EntityWorkspaceSlotConfig
> = {
  character: {
    emphasisTitle: 'Character at a glance',
    readerFirst: true,
    relationshipPreviewLimit: 4,
  },
  organization: {
    emphasisTitle: 'Organization at a glance',
    readerFirst: true,
    relationshipPreviewLimit: 3,
    structureLinkLabel: 'structure',
  },
  family: {
    emphasisTitle: 'House at a glance',
    readerFirst: true,
    relationshipPreviewLimit: 4,
    structureLinkLabel: 'lineage',
  },
  location: {
    emphasisTitle: 'Place in the world',
    readerFirst: true,
    relationshipPreviewLimit: 3,
  },
  object: {
    emphasisTitle: 'Object significance',
    readerFirst: true,
    relationshipPreviewLimit: 3,
  },
  bestiary: {
    emphasisTitle: 'Creature profile',
    readerFirst: true,
    relationshipPreviewLimit: 3,
  },
  ancestry: {
    emphasisTitle: 'Cultural identity',
    readerFirst: true,
    relationshipPreviewLimit: 3,
  },
};

export function getEntityWorkspaceSlots(
  surfaceKey: SurfaceProfileKey,
): EntityWorkspaceSlotConfig | null {
  if (!(surfaceKey in ENTITY_WORKSPACE_SLOTS)) return null;
  return ENTITY_WORKSPACE_SLOTS[surfaceKey as keyof typeof ENTITY_WORKSPACE_SLOTS];
}

export function entityWorkspaceReaderFirst(surfaceKey: SurfaceProfileKey): boolean {
  return getEntityWorkspaceSlots(surfaceKey)?.readerFirst ?? false;
}
