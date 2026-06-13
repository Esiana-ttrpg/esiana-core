import type { LucideIcon } from 'lucide-react';
import type { HubSectionVariant } from '@/lib/hubAmbientTheme';

interface HubSectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  variant: HubSectionVariant;
  size?: 'lg' | 'sm';
}

export function HubSectionHeader({
  title,
  subtitle,
  icon: Icon,
  variant,
  size = 'lg',
}: HubSectionHeaderProps) {
  const titleClass =
    size === 'lg'
      ? 'hub-section-header__title text-lg font-semibold text-foreground'
      : 'hub-section-header__title text-sm font-semibold text-foreground';

  return (
    <div className={`hub-section-header hub-section-header--${variant}`}>
      {Icon ? (
        <div className="mb-1 flex items-center gap-2">
          <Icon className="hub-section-header__icon size-5" strokeWidth={1.5} />
          <h2 className={titleClass}>{title}</h2>
        </div>
      ) : (
        <h2 className={titleClass}>{title}</h2>
      )}
      {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
    </div>
  );
}
