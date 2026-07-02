import { buildInfoboxProjection } from '@/lib/buildInfoboxProjection';
import { ProfileDetailsCard } from './ProfileDetailsCard';
import type { WikiPageBlock } from '@/types/wiki';
import type { WikiTreeNode } from '@/types/wiki';
import { campaignRelationsPath } from '@/lib/campaignPaths';
import { Link } from 'react-router-dom';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface FamilyOverviewDashboardProps {
  campaignHandle: string;
  pageId: string;
  templateType: string;
  blocks: WikiPageBlock[];
  flatPages: WikiTreeNode[];
  pageMetadata: unknown;
  isDMUser?: boolean;
  isEditingPage: boolean;
  onJumpToTab: (subviewId: string) => void;
  onBlocksChange: (updater: (blocks: WikiPageBlock[]) => WikiPageBlock[]) => void;
}

export function FamilyOverviewDashboard({
  campaignHandle,
  pageId,
  templateType,
  blocks,
  flatPages,
  pageMetadata,
  isDMUser: isDMUserProp,
  isEditingPage,
  onJumpToTab,
  onBlocksChange,
}: FamilyOverviewDashboardProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);

  const infoboxBlock = blocks.find((b) => b.type === 'wiki-infobox');
  const infoboxFields =
    (infoboxBlock?.content as { fields?: { key: string; value: string }[] })?.fields ??
    buildInfoboxProjection(templateType, pageMetadata, flatPages, 'family');

  function updateInfoboxFields(fields: { key: string; value: string }[]) {
    onBlocksChange((prev) =>
      prev.map((b) =>
        b.type === 'wiki-infobox'
          ? { ...b, content: { ...(b.content as object), fields } }
          : b,
      ),
    );
  }

  return (
    <div className="mb-4 space-y-4">
      <ProfileDetailsCard
        fields={infoboxFields}
        isEditingPage={isEditingPage}
        isDMUser={isDMUser}
        onFieldsChange={updateInfoboxFields}
      />

      <nav
        className="flex flex-wrap gap-2 rounded-lg border border-border/40 bg-surface/20 p-3"
        aria-label="Explore family"
      >
        <button
          type="button"
          onClick={() => onJumpToTab('lore')}
          className="rounded-md border border-border/50 px-2 py-1 text-left text-xs transition-colors hover:border-primary/40"
        >
          <span className="font-medium text-foreground">Lore</span>
          <span className="ml-1 text-muted">· House history & narrative</span>
        </button>
        <button
          type="button"
          onClick={() => onJumpToTab('lineage')}
          className="rounded-md border border-border/50 px-2 py-1 text-left text-xs transition-colors hover:border-primary/40"
        >
          <span className="font-medium text-foreground">Lineage</span>
          <span className="ml-1 text-muted">· Living members & generations</span>
        </button>
        <button
          type="button"
          onClick={() => onJumpToTab('relationships')}
          className="rounded-md border border-border/50 px-2 py-1 text-left text-xs transition-colors hover:border-primary/40"
        >
          <span className="font-medium text-foreground">Relationships</span>
          <span className="ml-1 text-muted">· Alliances & kinship</span>
        </button>
        {isDMUser ? (
          <Link
            to={campaignRelationsPath(campaignHandle, { lens: 'kinship', focus: `family:${pageId}` })}
            className="rounded-md border border-border/50 px-2 py-1 text-xs text-muted hover:border-primary/40 hover:text-primary"
          >
            Kinship workspace →
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
