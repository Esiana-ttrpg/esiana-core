import type { SidebarConfig, SidebarSectionId } from '@/lib/sidebarConfig';
import { resolveSidebarIconForSection } from '@/lib/resolveSidebarIcon';

interface SidebarNavIconProps {
  config: SidebarConfig;
  sectionId: SidebarSectionId;
  className?: string;
}

export function SidebarNavIcon({
  config,
  sectionId,
  className = 'size-3.5 shrink-0 opacity-80',
}: SidebarNavIconProps) {
  const resolved = resolveSidebarIconForSection(config, sectionId);

  if (resolved.kind === 'image') {
    return (
      <img
        src={resolved.url}
        alt=""
        className={className}
        aria-hidden
      />
    );
  }

  const Icon = resolved.Icon;
  return <Icon className={className} aria-hidden />;
}
