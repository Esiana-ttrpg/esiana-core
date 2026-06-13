/**
 * Canonical visibility tier labels for browse-surface chips.
 * Leaf module — safe for convergenceFeedDisplay and frontend affordances.
 */

export type VisibilityTierLabel =
  | 'public'
  | 'party'
  | 'staff'
  | 'draft'
  | 'future';

export type VisibilityTierLucideIcon =
  | 'Globe'
  | 'Users'
  | 'Eye'
  | 'Pencil'
  | 'Clock';

export const VISIBILITY_TIER_CHIP_SPEC: Record<
  VisibilityTierLabel,
  { label: string; tone: string; lucideIcon: VisibilityTierLucideIcon }
> = {
  public: {
    label: 'Public',
    tone: 'border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-100',
    lucideIcon: 'Globe',
  },
  party: {
    label: 'Party',
    tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100',
    lucideIcon: 'Users',
  },
  staff: {
    label: 'Staff',
    tone: 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100',
    lucideIcon: 'Eye',
  },
  draft: {
    label: 'Draft',
    tone: 'border-border/60 bg-surface/60 text-muted',
    lucideIcon: 'Pencil',
  },
  future: {
    label: 'Future',
    tone: 'border-violet-500/30 bg-violet-500/10 text-violet-900 dark:text-violet-100',
    lucideIcon: 'Clock',
  },
};

export function formatVisibilityTierLabel(tier: VisibilityTierLabel): string {
  return VISIBILITY_TIER_CHIP_SPEC[tier].label;
}

function normalizePageVisibility(visibility: string): string {
  return visibility.trim();
}

export function resolveVisibilityTierLabel(input: {
  pageVisibility: string;
  narrativeStatus?: string | null;
  isFuture?: boolean;
}): VisibilityTierLabel {
  if (input.isFuture) return 'future';
  if (input.narrativeStatus === 'DRAFT') return 'draft';
  const visibility = normalizePageVisibility(input.pageVisibility);
  const upper = visibility.toUpperCase();
  if (visibility === 'DM_Only' || upper === 'DM_ONLY' || upper === 'GM_ONLY') {
    return 'staff';
  }
  if (visibility === 'Party' || upper === 'PARTY') return 'party';
  return 'public';
}

export function visibilityTierLabelFromProjection(
  projectionTier: string,
): VisibilityTierLabel {
  const normalized = projectionTier.trim().toUpperCase();
  if (normalized === 'ELEVATED_ONLY' || normalized === 'SECRET' || normalized === 'GM_ONLY') {
    return 'staff';
  }
  if (normalized === 'PARTY') return 'party';
  return 'public';
}

/** Show chip when tier is not the default party-visible baseline. */
export function shouldShowVisibilityTierChip(tier: VisibilityTierLabel): boolean {
  return tier !== 'public' && tier !== 'party';
}

export function shouldShowProjectionVisibilityBadge(
  projectionTier: string,
): boolean {
  const normalized = projectionTier.trim().toUpperCase();
  return normalized === 'ELEVATED_ONLY' || normalized === 'SECRET';
}

export function formatProjectionVisibilityTier(projectionTier: string): string {
  return formatVisibilityTierLabel(
    visibilityTierLabelFromProjection(projectionTier),
  );
}
