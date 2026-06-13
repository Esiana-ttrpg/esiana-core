import { useIdentityDisplay, type IdentityDisplaySource } from '@/hooks/useIdentityDisplay';

interface MemberIdentityLabelProps {
  source: IdentityDisplaySource;
  className?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
}

export function MemberIdentityLabel({
  source,
  className = '',
  primaryClassName = 'text-sm text-foreground',
  secondaryClassName = 'text-[11px] text-muted',
}: MemberIdentityLabelProps) {
  const identity = useIdentityDisplay(source);

  return (
    <span className={`flex min-w-0 flex-col gap-0.5 ${className}`}>
      <span className={`truncate font-medium ${primaryClassName}`}>{identity.primaryLabel}</span>
      {identity.showSecondary && (
        <span className={`truncate ${secondaryClassName}`}>{identity.playerContext}</span>
      )}
    </span>
  );
}
