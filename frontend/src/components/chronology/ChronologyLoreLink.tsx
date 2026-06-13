import { Link } from 'react-router-dom';
import { ExternalLink, Lock, Plus } from 'lucide-react';
import { useWiki } from '@/contexts/WikiContext';
import { campaignEventLorePath } from '@/lib/campaignPaths';
import { CampaignCapabilities } from '@shared/campaignPolicy/capabilities';

interface ChronologyLoreLinkProps {
  campaignHandle: string;
  baseEventId: string;
  title: string;
  className?: string;
}

export function ChronologyLoreLink({
  campaignHandle,
  baseEventId,
  title,
  className = '',
}: ChronologyLoreLinkProps) {
  const { flatPages, can } = useWiki();

  const lorePageId = `event-${baseEventId}`;
  const hasWikiPage = flatPages.some((page) => page.id === lorePageId);
  const canManage = can(CampaignCapabilities.CHRONOLOGY_EDIT);

  const loreOpenHref = campaignEventLorePath(campaignHandle, baseEventId);
  const loreCreateHref = campaignEventLorePath(campaignHandle, baseEventId, {
    create: true,
    prefillTitle: title,
  });

  if (hasWikiPage) {
    return (
      <Link
        to={loreOpenHref}
        onClick={(event) => event.stopPropagation()}
        className={`inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-background hover:bg-primary-hover ${className}`}
      >
        Open Lore Page
        <ExternalLink className="size-3.5" />
      </Link>
    );
  }

  if (canManage) {
    return (
      <Link
        to={loreCreateHref}
        onClick={(event) => event.stopPropagation()}
        className={`inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-primary/60 bg-transparent px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10 ${className}`}
      >
        <Plus className="size-3.5" />
        Initialize Lore Page
      </Link>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface/40 px-3 py-2 text-xs font-medium text-muted-foreground/70 ${className}`}
      aria-disabled
    >
      <Lock className="size-3.5" />
      Lore Page Pending
    </span>
  );
}
