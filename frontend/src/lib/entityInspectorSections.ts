import type { WikiTreeNode } from '@/types/wiki';
import {
  getInspectorProfileLabel,
  getInspectorSectionsForProfile,
  resolveEntitySurfaceProfile,
  resolveSectionForFocusField,
  TYPED_INFOBOX_SURFACE_KEYS,
  type InspectorProfile,
  type InspectorSectionDef,
  type SurfaceProfileKey,
} from '@/lib/entitySurfaceProfile';

export type { InspectorProfile, InspectorSectionDef, SurfaceProfileKey };

export function getInspectorSections(profile: InspectorProfile) {
  return getInspectorSectionsForProfile(profile);
}

export { getInspectorProfileLabel, resolveSectionForFocusField };

/** @deprecated Use TYPED_INFOBOX_SURFACE_KEYS + resolveEntitySurfaceProfile instead */
export const TYPED_INFOBOX_TEMPLATES = new Set([
  'CHARACTER',
  'ORGANIZATION',
  'FAMILY',
  'BESTIARY',
]);

export function resolveInspectorProfile(
  pageId: string,
  templateType: string,
  flatPages: WikiTreeNode[],
  metadata?: unknown,
): InspectorProfile {
  const profile = resolveEntitySurfaceProfile({
    pageId,
    templateType,
    metadata,
    flatPages,
  });
  return profile.inspectorProfile;
}

export function surfaceKeyUsesTypedInfobox(key: SurfaceProfileKey): boolean {
  return TYPED_INFOBOX_SURFACE_KEYS.has(key);
}
