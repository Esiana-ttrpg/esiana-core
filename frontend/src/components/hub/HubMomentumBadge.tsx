import { HUB_MOMENTUM_TONES, type HubMomentumLabel } from '@/lib/hubAmbientTheme';

interface HubMomentumBadgeProps {
  label: HubMomentumLabel;
  className?: string;
}

export function HubMomentumBadge({ label, className = '' }: HubMomentumBadgeProps) {
  const tone = HUB_MOMENTUM_TONES[label];

  return (
    <span
      className={`hub-momentum ${className}`.trim()}
      style={{
        color: tone.color,
        backgroundColor: tone.bg,
        borderColor: tone.border,
      }}
    >
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
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">{role}</span>
      ) : null}
      {role && momentum ? <span className="text-[10px] text-muted/60">·</span> : null}
      {momentum ? <HubMomentumBadge label={momentum} /> : null}
    </span>
  );
}
