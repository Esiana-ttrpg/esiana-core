import type { LucideIcon } from 'lucide-react';
import { catalogLucideIcon } from './tagIconCatalog';
import { parseCatalogIconAssetId } from './catalogIconValidation';
import {
  defaultSidebarIconValue,
  defaultSidebarLucideName,
} from './sidebarIconDefaults';
import type { SidebarConfig, SidebarSectionId } from './sidebarConfig';
import {
  getSidebarSectionIcon,
  getSidebarSectionIconAssetUrl,
} from './sidebarConfig';

export type ResolvedSidebarIcon =
  | { kind: 'lucide'; Icon: LucideIcon }
  | { kind: 'image'; url: string };

export function resolveSidebarIconFromValues(
  icon: string | null | undefined,
  sectionId: SidebarSectionId,
  iconAssetUrl?: string | null,
): ResolvedSidebarIcon {
  const effective = icon?.trim() || defaultSidebarIconValue(sectionId);
  const assetId = parseCatalogIconAssetId(effective);
  if (effective.startsWith('asset:') && assetId && iconAssetUrl) {
    return { kind: 'image', url: iconAssetUrl };
  }
  const lucideName = effective.startsWith('lucide:')
    ? effective.slice('lucide:'.length)
    : defaultSidebarLucideName(sectionId);
  return { kind: 'lucide', Icon: catalogLucideIcon(lucideName) };
}

export function resolveSidebarIconForSection(
  config: SidebarConfig,
  sectionId: SidebarSectionId,
): ResolvedSidebarIcon {
  return resolveSidebarIconFromValues(
    getSidebarSectionIcon(config, sectionId),
    sectionId,
    getSidebarSectionIconAssetUrl(config, sectionId),
  );
}
