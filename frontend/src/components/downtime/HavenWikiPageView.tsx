import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildWikiBreadcrumbs,
  buildWikiPageLookup,
  resolveWikiParentChain,
} from '@/lib/wiki';
import { fetchDowntimeHavenByWikiPage } from '@/lib/downtime';
import {
  parseSystemCategoryKey,
  SYSTEM_CATEGORY_DOWNTIME,
} from '@/lib/wikiSystemCategory';
import { useWiki } from '@/contexts/WikiContext';
import { CampaignMemberRoles } from '@/types/domain';
import type { WikiTreeNode } from '@/types/wiki';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { HavenOverviewView } from '@/components/downtime/HavenOverviewView';

interface HavenWikiPageViewProps {
  campaignHandle: string;
  wikiPageId: string;
  pageTitle: string;
  flatPages: WikiTreeNode[];
}

function findDowntimeCategoryPageId(
  pageId: string,
  flatPages: readonly Pick<WikiTreeNode, 'id' | 'parentId' | 'metadata'>[],
): string | null {
  const pageById = new Map(flatPages.map((page) => [page.id, page]));
  const visited = new Set<string>();
  let current: string | null = pageId;

  while (current) {
    if (visited.has(current)) break;
    visited.add(current);
    const node = pageById.get(current);
    if (!node) break;
    if (parseSystemCategoryKey(node.metadata) === SYSTEM_CATEGORY_DOWNTIME) {
      return node.id;
    }
    current = node.parentId;
  }

  return null;
}

export function HavenWikiPageView({
  campaignHandle,
  wikiPageId,
  pageTitle,
  flatPages,
}: HavenWikiPageViewProps) {
  const { campaign } = useWiki();
  const canManage =
    campaign?.role === CampaignMemberRoles.GAMEMASTER ||
    campaign?.role === CampaignMemberRoles.WRITER;

  const [havenId, setHavenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageById = useMemo(() => buildWikiPageLookup(flatPages), [flatPages]);

  const breadcrumbs = useMemo(() => {
    const parentChain = resolveWikiParentChain(wikiPageId, null, pageById);
    return buildWikiBreadcrumbs(parentChain, {
      id: wikiPageId,
      title: pageTitle,
    });
  }, [pageById, pageTitle, wikiPageId]);

  const downtimeCategoryPageId = useMemo(
    () => findDowntimeCategoryPageId(wikiPageId, flatPages),
    [flatPages, wikiPageId],
  );

  const loadHaven = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const haven = await fetchDowntimeHavenByWikiPage(campaignHandle, wikiPageId);
      setHavenId(haven.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load haven.');
      setHavenId(null);
    } finally {
      setLoading(false);
    }
  }, [campaignHandle, wikiPageId]);

  useEffect(() => {
    void loadHaven();
  }, [loadHaven]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner label="Loading haven…" />
      </div>
    );
  }

  if (error || !havenId) {
    return (
      <div className="p-6">
        <p className="rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error ?? 'Haven not found.'}
        </p>
      </div>
    );
  }

  return (
    <HavenOverviewView
      campaignHandle={campaignHandle}
      havenId={havenId}
      wikiPageId={wikiPageId}
      downtimeCategoryPageId={downtimeCategoryPageId}
      breadcrumbs={breadcrumbs}
      flatPages={flatPages}
      canManage={canManage}
    />
  );
}
