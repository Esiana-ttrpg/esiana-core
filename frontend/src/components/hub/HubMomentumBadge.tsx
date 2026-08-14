import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { HUB_MOMENTUM_TONE_CLASS, type HubMomentumLabel } from '@/lib/hubAmbientTheme';

interface HubMomentumBadgeProps {
  label: HubMomentumLabel;
  className?: string;
}

export function HubMomentumBadge({ label, className = '' }: HubMomentumBadgeProps) {
  return (
    <span className={`hub-momentum ${HUB_MOMENTUM_TONE_CLASS[label]} ${className}`.trim()}>
      {label}
    </span>
  );
}

interface HubRoleMomentumMetaProps {
  role?: string | null;
  momentum?: HubMomentumLabel | null;
  className?: string;
}

export function HubRoleMomentumMeta({ role, momentum, className = '' }: HubRoleMomentumMetaProps) {
  if (!role && !momentum) return null;

  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`.trim()}>
      {role ? (
        <span className={META_SECTION_LABEL_CLASS}>{role}</span>
      ) : null}
      {role && momentum ? <span className="text-[10px] text-muted/60">·</span> : null}
      {momentum ? <HubMomentumBadge label={momentum} /> : null}
    </span>
  );
}
