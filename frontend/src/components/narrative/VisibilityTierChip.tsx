import { Clock, Eye, Globe, Pencil, Users, type LucideIcon } from 'lucide-react';
import {
  VISIBILITY_TIER_CHIP_SPEC,
  resolveVisibilityTierLabel,
  shouldShowVisibilityTierChip,
  type VisibilityTierLabel,
  type VisibilityTierLucideIcon,
} from '@shared/visibilityTier';

const LUCIDE_BY_NAME: Record<VisibilityTierLucideIcon, LucideIcon> = {
  Globe,
  Users,
  Eye,
  Pencil,
  Clock,
};

export function VisibilityTierChip({
  tier,
  compact = false,
}: {
  tier: VisibilityTierLabel;
  compact?: boolean;
}) {
  const spec = VISIBILITY_TIER_CHIP_SPEC[tier];
  const Icon = LUCIDE_BY_NAME[spec.lucideIcon];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-semibold uppercase tracking-wider ${spec.tone} ${
        compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'
      }`}
    >
      <Icon className={compact ? 'size-2.5' : 'size-3'} aria-hidden />
      {spec.label}
    </span>
  );
}

export function VisibilityTierChipFromPage(props: {
  pageVisibility: string;
  narrativeStatus?: string | null;
  isFuture?: boolean;
  compact?: boolean;
}) {
  const tier = resolveVisibilityTierLabel({
    pageVisibility: props.pageVisibility,
    narrativeStatus: props.narrativeStatus,
    isFuture: props.isFuture,
  });
  return <VisibilityTierChip tier={tier} compact={props.compact} />;
}

/** Browse/workarea surfaces — silent for Party/Public; Private/Draft/Future only for elevated viewers. */
export function BrowseVisibilityIndicator(props: {
  pageVisibility: string;
  narrativeStatus?: string | null;
  isFuture?: boolean;
  showWhenElevated: boolean;
  compact?: boolean;
  /** When set, overrides resolved tier (e.g. quest draft lifecycle chip). */
  tierOverride?: VisibilityTierLabel;
}) {
  if (!props.showWhenElevated) return null;
  const tier =
    props.tierOverride ??
    resolveVisibilityTierLabel({
      pageVisibility: props.pageVisibility,
      narrativeStatus: props.narrativeStatus,
      isFuture: props.isFuture,
    });
  if (!shouldShowVisibilityTierChip(tier)) return null;
  return <VisibilityTierChip tier={tier} compact={props.compact} />;
}

/** Staff/elevated browse surfaces — omit chip for party viewers. */
export function ElevatedBrowseVisibilityChip(props: {
  pageVisibility: string;
  narrativeStatus?: string | null;
  isFuture?: boolean;
  showWhenElevated: boolean;
  compact?: boolean;
}) {
  return <BrowseVisibilityIndicator {...props} />;
}
