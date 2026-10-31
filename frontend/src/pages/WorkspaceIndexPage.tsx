import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { CampaignWorkspace } from '@shared/campaignWorkspace';
import { useTranslation } from 'react-i18next';
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
import { JournalPage } from '@/pages/JournalPage';
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
  const { t } = useTranslation();
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
    return <LoadingSpinner label={t('campaign.core.workspaceLoading')} />;
  }

  // The Journal is a first-class publication + release surface, not a wiki
  // category browser, so it intercepts its segment before category resolution.
  if (segment === 'journals') {
    return <JournalPage campaignHandle={campaignHandle} />;
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

  if (segment === 'event-pages' || segment === 'era-pages') {
    const workspace = segment === 'event-pages' ? CampaignWorkspace.EVENTS : CampaignWorkspace.ERAS;
    // flatPages comes from the authorized tree; never fetch hidden ancestors.
    const pages = flatPages.filter(page => page.workspace === workspace && page.pathKey);
    return <div className="p-6"><h1>{route.title}</h1>{pages.length
      ? <ul>{pages.map(page => <li key={page.id}><Link className="inline-flex min-h-11 items-center underline" to={campaignWikiPath(campaignHandle, page.id, flatPages)}>{page.title}</Link></li>)}</ul>
      : <p className="text-muted">No authored {segment === 'event-pages' ? 'event' : 'era'} pages available.</p>}</div>;
  }
  return <Navigate to={campaignDashboardPath(campaignHandle)} replace />;
}
