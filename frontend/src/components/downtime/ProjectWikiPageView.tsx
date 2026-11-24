import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildWikiBreadcrumbs,
  buildWikiPageLookup,
  resolveWikiParentChain,
} from '@/lib/wiki';
import { fetchDowntimeProjectByWikiPage } from '@/lib/downtime';
import {
  parseSystemCategoryKey,
  SYSTEM_CATEGORY_DOWNTIME,
} from '@/lib/wikiSystemCategory';
import { useWiki } from '@/contexts/WikiContext';
import { CampaignCapabilities } from '@shared/campaignPolicy/capabilities';
import type { WikiTreeNode } from '@/types/wiki';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ProjectOverviewView } from '@/components/downtime/ProjectOverviewView';

interface ProjectWikiPageViewProps {
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

export function ProjectWikiPageView({
  campaignHandle,
  wikiPageId,
  pageTitle,
  flatPages,
}: ProjectWikiPageViewProps) {
  const { can } = useWiki();
  const canManageAdmin = can(CampaignCapabilities.DOWNTIME_MANAGE);

  const [projectId, setProjectId] = useState<string | null>(null);
  const [canDeleteResource, setCanDeleteResource] = useState(false);
  const [canEditResource, setCanEditResource] = useState(false);
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

  const loadProject = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const project = await fetchDowntimeProjectByWikiPage(campaignHandle, wikiPageId);
      setProjectId(project.id);
      setCanDeleteResource(Boolean(project.canDelete));
      setCanEditResource(Boolean(project.canEdit));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project.');
      setProjectId(null);
      setCanDeleteResource(false);
      setCanEditResource(false);
    } finally {
      setLoading(false);
    }
  }, [campaignHandle, wikiPageId, can]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner label="Loading operation…" />
      </div>
    );
  }

  if (error || !projectId) {
    return (
      <div className="p-6">
        <p className="rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error ?? 'Project not found.'}
        </p>
      </div>
    );
  }

  return (
    <ProjectOverviewView
      campaignHandle={campaignHandle}
      projectId={projectId}
      wikiPageId={wikiPageId}
      downtimeCategoryPageId={downtimeCategoryPageId}
      breadcrumbs={breadcrumbs}
      flatPages={flatPages}
      canManageEffects={canManageAdmin}
      canDelete={canDeleteResource}
      canManage={canEditResource}
    />
  );
}
