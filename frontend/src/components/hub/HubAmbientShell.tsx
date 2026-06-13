import type { ReactNode } from 'react';
import { useBranding } from '@/contexts/BrandingContext';
import { buildHubAmbientTokens, isTransDualToneProfile } from '@/lib/hubAmbientTheme';

interface HubAmbientShellProps {
  children: ReactNode;
  className?: string;
}

export function HubAmbientShell({
  children,
  className = '',
}: HubAmbientShellProps) {
  const { resolvedProfile } = useBranding();
  const style = buildHubAmbientTokens(resolvedProfile);
  const dualToneClass = isTransDualToneProfile(resolvedProfile) ? 'hub-ambient--dual-tone' : '';

  return (
    <div className={`hub-ambient relative ${dualToneClass} ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}
