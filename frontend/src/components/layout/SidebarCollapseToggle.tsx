import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCampaignNav } from '@/contexts/CampaignNavContext';

interface SidebarCollapseToggleProps {
  className?: string;
}

export function SidebarCollapseToggle({ className = '' }: SidebarCollapseToggleProps) {
  const campaignNav = useCampaignNav();
  const isCollapsed = campaignNav.sidebarCollapsed;

  return (
    <button
      type="button"
      onClick={() => campaignNav.toggleSidebarCollapsed()}
      className={`sidebar-rail-toggle ${className}`.trim()}
      aria-label={isCollapsed ? 'Expand campaign menu' : 'Collapse campaign menu'}
      aria-expanded={!isCollapsed}
    >
      {isCollapsed ? (
        <ChevronRight className="sidebar-rail-toggle__icon" strokeWidth={2} />
      ) : (
        <ChevronLeft className="sidebar-rail-toggle__icon" strokeWidth={2} />
      )}
    </button>
  );
}
