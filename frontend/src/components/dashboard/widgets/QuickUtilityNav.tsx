import { Compass } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWiki } from '@/contexts/WikiContext';
import {
  campaignChronologyPath,
  campaignDashboardPath,
  campaignNotesPath,
  campaignPartyPath,
  campaignPath,
  campaignWikiPath,
} from '@/lib/campaignPaths';
import { resolveWikiIndexPageId } from '@/lib/wikiIndexEntry';
import { DashboardWidgetShell } from '../DashboardWidgetShell';

interface QuickUtilityNavProps {
  campaignHandle: string;
  isLookingForGroup?: boolean;
  customizeMode?: boolean;
  onHide?: () => void;
}

export function QuickUtilityNav({
  campaignHandle,
  isLookingForGroup,
  customizeMode,
  onHide,
}: QuickUtilityNavProps) {
  const { resolvePageId, flatPages } = useWiki();

  const codexPath = useMemo(() => {
    const pageId = resolveWikiIndexPageId(resolvePageId, flatPages);
    return pageId ? campaignWikiPath(campaignHandle, pageId, flatPages) : null;
  }, [campaignHandle, flatPages, resolvePageId]);

  const links = [
    ...(codexPath ? [{ label: 'Codex', to: codexPath }] : []),
    { label: 'Session notes', to: campaignNotesPath(campaignHandle) },
    { label: 'Chronology', to: campaignChronologyPath(campaignHandle) },
    { label: 'The party', to: campaignPartyPath(campaignHandle) },
    { label: 'Recent changes', to: campaignPath(campaignHandle, 'recent-changes') },
    { label: 'Settings', to: campaignPath(campaignHandle, 'settings') },
    ...(isLookingForGroup
      ? [{ label: 'Recruitment', to: campaignPath(campaignHandle, 'recruitment') }]
      : []),
    { label: 'Campaign home', to: campaignDashboardPath(campaignHandle) },
  ];

  return (
    <DashboardWidgetShell
      title="Quick Links"
      icon={<Compass className="size-4 text-cyan-400" />}
      customizeMode={customizeMode}
      onHide={onHide}
    >
      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-elevated hover:text-primary"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </DashboardWidgetShell>
  );
}
