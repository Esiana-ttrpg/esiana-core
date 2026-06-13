import type { LucideIcon } from 'lucide-react';
import {
  Coins,
  EyeOff,
  Handshake,
  Shield,
  Church,
  Skull,
  Users,
} from 'lucide-react';
import type {
  OrgRelationCategory,
  OrgRelationStance,
  RelationVisibility,
} from './entityRelationTypes';

export type StanceBorderStyle = 'solid' | 'dashed' | 'double';

export interface StanceVisualSpec {
  label: string;
  borderStyle: StanceBorderStyle;
  accentClass: string;
  categoryIcon?: LucideIcon;
  visibilityIcon?: LucideIcon;
  ariaLabel: string;
}

const STANCE_LABELS: Record<OrgRelationStance, string> = {
  ALLY: 'Ally',
  NEUTRAL: 'Neutral',
  HOSTILE: 'Hostile',
  SECRET_HOSTILE: 'Secret hostile',
  VASSAL: 'Vassal',
  UNKNOWN: 'Unknown',
};

const CATEGORY_ICONS: Record<OrgRelationCategory, LucideIcon> = {
  DIPLOMATIC: Handshake,
  ECONOMIC: Coins,
  RELIGIOUS: Church,
  MILITARY: Shield,
  CRIMINAL: Skull,
  SECRET: EyeOff,
  BLOODLINE: Users,
};

function stanceBorderStyle(
  stance: OrgRelationStance | null | undefined,
  relationType?: OrgRelationCategory,
): StanceBorderStyle {
  if (stance === 'VASSAL') return 'double';
  if (stance === 'SECRET_HOSTILE' || relationType === 'SECRET') return 'dashed';
  return 'solid';
}

function stanceAccentClass(stance: OrgRelationStance | null | undefined): string {
  switch (stance) {
    case 'ALLY':
      return 'border-emerald-600/60 text-emerald-700 dark:text-emerald-400';
    case 'HOSTILE':
    case 'SECRET_HOSTILE':
      return 'border-red-600/60 text-red-700 dark:text-red-400';
    case 'VASSAL':
      return 'border-amber-600/60 text-amber-700 dark:text-amber-400';
    case 'NEUTRAL':
      return 'border-border text-muted';
    default:
      return 'border-border text-foreground';
  }
}

function isHiddenVisibility(visibility?: RelationVisibility): boolean {
  return visibility === 'SECRET' || visibility === 'GM_ONLY';
}

export function resolveStanceVisual(
  stance: OrgRelationStance | null | undefined,
  relationType?: OrgRelationCategory,
  visibility?: RelationVisibility,
): StanceVisualSpec {
  const resolvedStance = stance ?? 'UNKNOWN';
  const label = STANCE_LABELS[resolvedStance];
  const borderStyle = stanceBorderStyle(resolvedStance, relationType);
  const categoryIcon = relationType ? CATEGORY_ICONS[relationType] : undefined;
  const visibilityIcon = isHiddenVisibility(visibility) ? EyeOff : undefined;

  const parts = [label];
  if (relationType) parts.push(relationType.toLowerCase());
  if (visibilityIcon) parts.push('hidden');

  return {
    label,
    borderStyle,
    accentClass: stanceAccentClass(resolvedStance),
    categoryIcon,
    visibilityIcon,
    ariaLabel: parts.join(', '),
  };
}

/** Member / neutral chips without diplomatic stance */
export function resolveNeutralEntityVisual(subtitle?: string): StanceVisualSpec {
  return {
    label: subtitle?.trim() || 'PARTICIPANT',
    borderStyle: 'solid',
    accentClass: 'border-border text-foreground',
    ariaLabel: subtitle?.trim() ? `Member, ${subtitle}` : 'PARTICIPANT',
  };
}

export function stanceBorderClassName(borderStyle: StanceBorderStyle): string {
  switch (borderStyle) {
    case 'dashed':
      return 'border-dashed';
    case 'double':
      return 'border-[3px] border-double';
    default:
      return 'border-solid';
  }
}
