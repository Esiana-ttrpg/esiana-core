import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import { catalogLucideIcon } from './tagIconCatalog';
import { effectiveTagIcon, lucideNameFromTagIcon } from './tagIconDefaults';

export type ResolvedTagIcon =
  | { kind: 'lucide'; Icon: LucideIcon }
  | { kind: 'image'; url: string };

export function resolveTagIcon(
  icon: string | null | undefined,
  tagName: string,
  iconAssetUrl?: string | null,
): ResolvedTagIcon {
  const effective = effectiveTagIcon(icon, tagName);
  if (effective?.startsWith('asset:') && iconAssetUrl) {
    return { kind: 'image', url: iconAssetUrl };
  }
  const lucideName = lucideNameFromTagIcon(effective, tagName);
  return { kind: 'lucide', Icon: catalogLucideIcon(lucideName) };
}

export function tagChipStyle(color: string | null | undefined): CSSProperties | undefined {
  if (!color) return undefined;
  return {
    borderColor: color,
    color,
    backgroundColor: `${color}18`,
  };
}
