import { CampaignSettingsNav } from '@/components/campaign/CampaignSettingsNav';
import { useCampaignSettingsChrome } from '@/hooks/useCampaignSettingsChrome';
import { useWiki } from '@/contexts/WikiContext';

interface CampaignSettingsSidebarProps {
  backHref: string;
  collapsed?: boolean;
  onNavigate?: () => void;
  onClose?: () => void;
}

export function CampaignSettingsSidebar({
  backHref,
  collapsed = false,
  onNavigate,
  onClose,
}: CampaignSettingsSidebarProps) {
  const { campaign, loading } = useWiki();
  const chrome = useCampaignSettingsChrome();

  return (
    <CampaignSettingsNav
      groups={chrome.groups}
      activeTab={chrome.activeTab}
      sectionHref={chrome.sectionHref}
      navigationLabel={chrome.navigationLabel}
      backHref={backHref}
      backLabel={chrome.backLabel}
      collapsed={collapsed}
      onNavigate={onNavigate}
      onClose={onClose}
      loading={loading && !campaign}
    />
  );
}
