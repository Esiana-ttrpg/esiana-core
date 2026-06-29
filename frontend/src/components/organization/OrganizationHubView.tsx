import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { useWiki } from '@/contexts/WikiContext';
import {
  campaignCategoryChildPath,
  readCampaignHandle,
} from '@/lib/campaignPaths';
import {
  buildWikiBreadcrumbs,
  buildWikiPageLookup,
  fetchCategoryIndex,
  resolveWikiParentChain,
  type CategoryIndexChild,
} from '@/lib/wiki';
import { WikiPageBreadcrumbs } from '@/components/wiki/WikiPageBreadcrumbs';
import { createItemLabel } from '@/lib/wikiLabels';
import type { WikiTreeNode } from '@/types/wiki';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CreatePageModal } from '@/components/CreatePageModal';
import { CategoryHubShell } from '@/components/wiki/indexBrowse/CategoryHubShell';
import { CategoryIndexToolbar } from '@/components/wiki/indexBrowse/CategoryIndexToolbar';
import { WorkspaceModeToggle } from '@/components/layout/WorkspaceModeToggle';
import { projectCategoryIndexBrowseChildren } from '@/lib/categoryIndexBrowse';
import {
  formatWorkspaceHubCountHint,
  resolveCategoryCountNouns,
} from '@/lib/workspaceHeaderPolicy';
import { parseOrganizationMetadata } from '@/lib/organizationMetadata';
import { fetchDowntimeHub } from '@/lib/downtime';
import type { ReputationStandingCard } from '@shared/downtimeHub';
import {
  groupOrganizations,
  type OrganizationGroupMode,
} from '@/lib/organizationHubGrouping';
import { OrganizationHubCard } from './OrganizationHubCard';

interface OrganizationHubViewProps {
  categoryPageId: string;
  campaignHandle: string;
}

export function OrganizationHubView({
  categoryPageId,
  campaignHandle,
}: OrganizationHubViewProps) {
  const params = useParams<{ campaignHandle?: string }>();
  const { campaignHandle: wikiCampaignSlug, flatPages, refresh } = useWiki();
  const resolvedSlug = readCampaignHandle(params) || wikiCampaignSlug || campaignHandle;
  const navigate = useNavigate();

  const [children, setChildren] = useState<CategoryIndexChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [groupMode, setGroupMode] = useState<OrganizationGroupMode>('hierarchy');
  const [standings, setStandings] = useState<ReputationStandingCard[]>([]);

  const categoryTitle = useMemo(() => {
    const node = flatPages.find((p) => p.id === categoryPageId);
    return node?.title ?? 'Organizations';
  }, [flatPages, categoryPageId]);

  const itemLabel = createItemLabel(categoryTitle);

  const loadChildren = useCallback(async () => {
    setLoading(true);
    try {
      const index = await fetchCategoryIndex(resolvedSlug, categoryPageId);
      setChildren(index.children ?? []);
    } finally {
      setLoading(false);
    }
  }, [resolvedSlug, categoryPageId]);

  useEffect(() => {
    void loadChildren();
  }, [loadChildren]);

  useEffect(() => {
    void fetchDowntimeHub(resolvedSlug, { section: 'reputation' })
      .then((payload) => setStandings(payload.reputation?.standings ?? []))
      .catch(() => setStandings([]));
  }, [resolvedSlug]);

  const projected = useMemo(
    () =>
      projectCategoryIndexBrowseChildren(children, {
        searchQuery: '',
        refineState: {},
        facetDefs: [],
        categoryTitle,
      }),
    [children, categoryTitle],
  );

  const sections = useMemo(
    () => groupOrganizations(projected, groupMode),
    [projected, groupMode],
  );

  const standingByFactionId = useMemo(
    () => new Map(standings.map((s) => [s.factionPageId, s])),
    [standings],
  );

  const pageById = useMemo(
    () => buildWikiPageLookup(flatPages as WikiTreeNode[]),
    [flatPages],
  );

  const indexBreadcrumbs = useMemo(() => {
    const parentChain = resolveWikiParentChain(categoryPageId, null, pageById);
    return buildWikiBreadcrumbs(parentChain, {
      id: categoryPageId,
      title: categoryTitle,
    });
  }, [categoryPageId, categoryTitle, pageById]);

  const countNouns = resolveCategoryCountNouns(categoryTitle);
  const resultCountLabel = formatWorkspaceHubCountHint({
    total: children.length,
    matching: projected.length,
    singular: countNouns.singular,
    plural: countNouns.plural,
  });

  function handleCreate() {
    setIsCreateOpen(true);
  }

  if (loading) {
    return <LoadingSpinner label="Loading organizations…" />;
  }

  return (
    <>
      <CategoryHubShell
        composition="codex"
        catalogGridClass="space-y-6"
        breadcrumbs={
          <WikiPageBreadcrumbs crumbs={indexBreadcrumbs} campaignHandle={resolvedSlug} />
        }
        breadcrumbCrumbs={indexBreadcrumbs}
        title={
          <>
            <Building2 className="size-6 text-primary" strokeWidth={1.25} />
            Powers &amp; Factions
          </>
        }
        actions={
          <CategoryIndexToolbar
            createLabel={`Catalog ${itemLabel}`}
            onCreate={handleCreate}
            resultCountLabel={resultCountLabel}
            modeControl={
              <WorkspaceModeToggle
                options={['hierarchy', 'world-state', 'region'] as const}
                value={groupMode}
                onChange={setGroupMode}
              />
            }
          />
        }
      >
        {sections.map((section) => (
          <section key={section.label || 'all'}>
            {section.label ? (
              <h2 className="mb-3 text-sm font-semibold text-foreground">{section.label}</h2>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {section.entries.map((child, index) => {
                const isNested =
                  groupMode === 'hierarchy' &&
                  index > 0 &&
                  parseOrganizationMetadata(child.metadata).parentOrgId !== null;
                return (
                  <OrganizationHubCard
                    key={child.id}
                    child={child}
                    campaignHandle={resolvedSlug}
                    standing={standingByFactionId.get(child.id) ?? null}
                    isNested={isNested}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </CategoryHubShell>

      <CreatePageModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        campaignHandle={resolvedSlug}
        parentId={categoryPageId}
        categoryTitle={categoryTitle}
        flatPages={flatPages}
        onCreated={(page) => {
          void refresh();
          void loadChildren();
          navigate(
            campaignCategoryChildPath(resolvedSlug, page.id, categoryTitle, flatPages),
          );
        }}
      />
    </>
  );
}
