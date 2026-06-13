import { Navigate, useLocation, useParams } from 'react-router-dom';
import { workspaceSegmentFromCampaignPath } from '@/lib/resolveWikiRoutePageId';
import { readCampaignHandle, campaignDashboardPath } from '@/lib/campaignPaths';
import { resolveWorkspaceRoute } from '@/lib/campaignWorkspaceRoutes';
import { useWiki } from '@/contexts/WikiContext';
import { parseSystemCategoryKey } from '@/lib/wikiSystemCategory';
import { MapsHubPage } from '@/pages/MapsHubPage';
import { AdventureView } from '@/components/adventure/AdventureView';
import { DowntimeView } from '@/components/downtime/DowntimeView';
import { ThreadHubView } from '@/components/thread/ThreadHubView';
import { CharacterHubView } from '@/components/character/CharacterHubView';
import { BestiaryHubView } from '@/components/bestiary/BestiaryHubView';
import { AncestryHubView } from '@/components/ancestry/AncestryHubView';
import { OrganizationHubView } from '@/components/organization/OrganizationHubView';
import { TagsHubView } from '@/components/wiki/TagsHubView';
import { EntityBrowserView } from '@/components/wiki/WikiIndexView';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

function resolveCategoryPageId(
  segment: string,
  flatPages: { id: string; title: string; metadata?: unknown }[],
  resolvePageId: (title: string) => string | undefined,
  resolvePageIdBySystemKey: (key: string) => string | undefined,
): string | undefined {
  const route = resolveWorkspaceRoute(segment);
  if (!route) return undefined;

  const resolver = route.indexResolver;
  if (resolver.type === 'wikiTitle') {
    return resolvePageId(resolver.title);
  }
  if (resolver.type === 'systemCategoryKey') {
    return resolvePageIdBySystemKey(resolver.key);
  }
  return undefined;
}

export function WorkspaceIndexPage() {
  const params = useParams<{ campaignHandle?: string }>();
  const location = useLocation();
  const campaignHandle = readCampaignHandle(params);
  const segment = workspaceSegmentFromCampaignPath(location.pathname, campaignHandle) ?? '';
  const route = resolveWorkspaceRoute(segment);
  const { flatPages, loading, resolvePageId, resolvePageIdBySystemKey } = useWiki();

  if (!route) {
    return <Navigate to={campaignDashboardPath(campaignHandle)} replace />;
  }

  if (loading) {
    return <LoadingSpinner label="Loading workspace…" />;
  }

  const categoryPageId = resolveCategoryPageId(
    segment,
    flatPages,
    resolvePageId,
    resolvePageIdBySystemKey,
  );

  if (segment === 'maps' && categoryPageId) {
    return <MapsHubPage campaignHandle={campaignHandle} categoryPageId={categoryPageId} />;
  }

  if (segment === 'adventures' && categoryPageId) {
    return <AdventureView campaignHandle={campaignHandle} categoryPageId={categoryPageId} />;
  }

  if (segment === 'threads' && categoryPageId) {
    return <ThreadHubView campaignHandle={campaignHandle} categoryPageId={categoryPageId} />;
  }

  if (segment === 'downtime') {
    const downtimePageId =
      resolvePageIdBySystemKey('downtime') ??
      flatPages.find((p) => parseSystemCategoryKey(p.metadata) === 'downtime')?.id;
    if (downtimePageId) {
      return <DowntimeView campaignHandle={campaignHandle} categoryPageId={downtimePageId} />;
    }
  }

  if (segment === 'characters' && categoryPageId) {
    return <CharacterHubView campaignHandle={campaignHandle} categoryPageId={categoryPageId} />;
  }

  if (segment === 'bestiary' && categoryPageId) {
    return <BestiaryHubView campaignHandle={campaignHandle} categoryPageId={categoryPageId} />;
  }

  if (segment === 'ancestries' && categoryPageId) {
    return <AncestryHubView campaignHandle={campaignHandle} categoryPageId={categoryPageId} />;
  }

  if (segment === 'organizations' && categoryPageId) {
    return (
      <OrganizationHubView campaignHandle={campaignHandle} categoryPageId={categoryPageId} />
    );
  }

  if (segment === 'tags') {
    return <TagsHubView campaignHandle={campaignHandle} />;
  }

  if (categoryPageId) {
    const categoryTitle =
      route.indexResolver.type === 'wikiTitle' ? route.indexResolver.title : route.title;
    return (
      <EntityBrowserView categoryPageId={categoryPageId} categoryTitle={categoryTitle} />
    );
  }

  return <Navigate to={campaignDashboardPath(campaignHandle)} replace />;
}
