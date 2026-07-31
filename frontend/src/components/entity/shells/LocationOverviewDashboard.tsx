import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Map } from 'lucide-react';
import { TiptapWidget } from '@/components/wiki/widgets/TiptapWidget';
import { LocationMetadataEditor } from '@/components/entity/LocationMetadataEditor';
import { EntityPageSection } from './EntityPageSection';
import {
  EntityFactReadValue,
  EntityFactRow,
  EntityFactRowList,
} from './EntityFactRow';
import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useCampaignChronologyNow } from '@/hooks/useCampaignChronologyNow';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';
import { parseLocationMetadata, resolveLocationRegionLabel } from '@/lib/locationMetadata';
import { buildLocationHubProjection } from '@/lib/locationHubProjection';
import { buildLocationStateProjection } from '@/lib/locationStateProjection';
import {
  collectLocationSceneEvents,
  groupLocationEventsByBucket,
} from '@/lib/locationEventsProjection';
import {
  formatMapContextKindLabel,
  type LocationMapContextEntry,
} from '@/lib/locationMapContext';
import { campaignWikiPath } from '@/lib/campaignPaths';
import type { EntityOverviewProps } from '@/lib/entityPageShells/types';
import type { WikiPageBlock } from '@/types/wiki';

type LocationOverviewDashboardProps = Pick<
  EntityOverviewProps,
  | 'campaignHandle'
  | 'pageId'
  | 'displayTitle'
  | 'templateType'
  | 'blocks'
  | 'flatPages'
  | 'isDMUser'
  | 'isEditingPage'
  | 'pageMetadata'
  | 'onBlocksChange'
> & {
  mapAssetId?: string | null;
  campaignMaps?: Array<{ id: string; title: string }>;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
  onJumpToTab: (subviewId: string) => void;
  prosePrimary?: boolean;
};

function findStoryBlock(blocks: WikiPageBlock[]): WikiPageBlock | undefined {
  return blocks.find((b) => b.type === 'text-tiptap');
}

function MapContextLinks({ entries }: { entries: LocationMapContextEntry[] }) {
  if (entries.length === 0) return null;
  const primary = entries.find((e) => e.isPrimary) ?? entries[0]!;
  return (
    <div className="space-y-2">
      <Link
        to={primary.href}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-raised/50 px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40"
      >
        <Map className="h-3.5 w-3.5" />
        View map
      </Link>
      {entries.length > 1 ? (
        <ul className="space-y-1 text-xs text-muted">
          {entries.map((entry) => (
            <li key={entry.mapAssetId}>
              <Link to={entry.href} className="hover:text-primary">
                {entry.label}
                <span className="ml-1 text-[10px] opacity-70">
                  ({formatMapContextKindLabel(entry.kind)})
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function LocationOverviewDashboard({
  campaignHandle,
  pageId,
  displayTitle,
  templateType,
  blocks,
  flatPages,
  isDMUser: isDMUserProp,
  isEditingPage,
  pageMetadata,
  mapAssetId,
  campaignMaps,
  onMetadataSaved,
  onBlocksChange,
  onJumpToTab,
  prosePrimary = false,
}: LocationOverviewDashboardProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const canEdit = isEditingPage && isDMUser;
  const campaignNow = useCampaignChronologyNow(campaignHandle);
  const location = parseLocationMetadata(pageMetadata);
  const storyBlock = findStoryBlock(blocks);
  const storyContent = (storyBlock?.content as Record<string, unknown>) ?? { markdown: '' };

  const hub = useMemo(
    () =>
      buildLocationHubProjection({
        campaignHandle,
        locationPageId: pageId,
        pageMetadata,
        flatPages,
        mapAssetId,
        campaignMaps,
        campaignNow,
      }),
    [
      campaignHandle,
      pageId,
      pageMetadata,
      flatPages,
      mapAssetId,
      campaignMaps,
      campaignNow,
    ],
  );

  const stateProjection = useMemo(() => buildLocationStateProjection(), []);
  const eventTeasers = useMemo(() => {
    const events = collectLocationSceneEvents(pageId, flatPages, null);
    const grouped = groupLocationEventsByBucket(events);
    return [
      ...grouped.current.slice(0, 2),
      ...grouped.upcoming.slice(0, 2),
      ...grouped.historical.slice(0, 2),
    ].slice(0, 5);
  }, [pageId, flatPages]);

  const regionDisplay = resolveLocationRegionLabel(location, flatPages);
  const selfPage = flatPages.find((p) => p.id === pageId);
  const parentTitle =
    selfPage?.parentId != null
      ? flatPages.find((p) => p.id === selfPage.parentId)?.title ?? null
      : null;

  const readFacts = [
    { label: 'Type', value: location.locationType },
    { label: 'Population', value: location.population },
    { label: 'Government', value: location.rulerOrAuthority },
    { label: 'Climate', value: location.climate },
    { label: 'Current status', value: location.currentStatus },
  ].filter((row) => row.value?.trim());

  const showLocationContext = Boolean(parentTitle?.trim() || regionDisplay?.trim());

  return (
    <div className="space-y-6">
      <EntityPageSection id="location-description" title="Description">
        {canEdit && storyBlock ? (
          <TiptapWidget
            content={storyContent}
            onChange={(next) =>
              onBlocksChange?.((prev) =>
                prev.map((b) =>
                  b.id === storyBlock.id ? { ...b, content: next } : b,
                ),
              )
            }
            isEditingLayout={canEdit}
            prosePrimary={prosePrimary}
            templateType={templateType}
          />
        ) : storyBlock ? (
          <TiptapWidget
            content={storyContent}
            onChange={() => {}}
            isEditingLayout={false}
            prosePrimary={prosePrimary}
            templateType={templateType}
          />
        ) : (
          <p className="text-sm text-muted">No description yet.</p>
        )}
      </EntityPageSection>

      <EntityPageSection id="location-at-a-glance" title="At a glance">
        {canEdit ? (
          <LocationMetadataEditor
            campaignHandle={campaignHandle}
            pageId={pageId}
            metadata={pageMetadata}
            flatPages={flatPages}
            onSaved={onMetadataSaved}
            section="atlas"
            bare
          />
        ) : (
          <>
            {showLocationContext ? (
              <div className="mb-4 space-y-2">
                <h3 className={META_SECTION_LABEL_CLASS}>Location context</h3>
                <div className="grid max-w-2xl gap-x-6 gap-y-2 sm:grid-cols-2">
                  {parentTitle?.trim() ? (
                    <EntityFactRow label="Parent page">
                      <EntityFactReadValue value={parentTitle} />
                    </EntityFactRow>
                  ) : null}
                  {regionDisplay?.trim() ? (
                    <EntityFactRow label="Region">
                      <EntityFactReadValue value={regionDisplay} />
                    </EntityFactRow>
                  ) : null}
                </div>
              </div>
            ) : null}
            <EntityFactRowList>
              {readFacts.map((row) => (
              <EntityFactRow key={row.label} label={row.label}>
                <EntityFactReadValue value={row.value} />
              </EntityFactRow>
            ))}
            {location.threats.length > 0 ? (
              <EntityFactRow label="Threats">
                <div className="flex flex-wrap gap-1">
                  {location.threats.map((threat) => (
                    <span
                      key={threat}
                      className="rounded-full border border-border/70 bg-surface-raised/40 px-2 py-0.5 text-xs font-normal text-foreground"
                    >
                      {threat}
                    </span>
                  ))}
                </div>
              </EntityFactRow>
            ) : null}
            {location.knownFor.length > 0 ? (
              <EntityFactRow label="Known for">
                <div className="flex flex-wrap gap-1">
                  {location.knownFor.map((entry) => (
                    <span
                      key={entry}
                      className="rounded-full border border-border/70 bg-surface-raised/40 px-2 py-0.5 text-xs font-normal text-foreground"
                    >
                      {entry}
                    </span>
                  ))}
                </div>
              </EntityFactRow>
            ) : null}
          </EntityFactRowList>
          </>
        )}
      </EntityPageSection>

      {hub.mapContexts.length > 0 ? (
        <EntityPageSection id="location-map" title="Map">
          <MapContextLinks entries={hub.mapContexts} />
        </EntityPageSection>
      ) : null}

      <EntityPageSection id="location-pulse" title="Location pulse">
        {location.currentStatus ? (
          <p className="mb-2 text-sm text-foreground">{location.currentStatus}</p>
        ) : null}
        <p className="text-sm text-muted">
          {stateProjection.signals.length === 0
            ? 'Trends will appear as world developments and faction pressure accumulate.'
            : null}
        </p>
      </EntityPageSection>

      {eventTeasers.length > 0 ? (
        <EntityPageSection id="location-timeline-summary" title="Timeline summary">
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              className="text-[11px] text-primary hover:underline"
              onClick={() => onJumpToTab('timeline')}
            >
              See timeline
            </button>
          </div>
          <ul className="space-y-1 text-sm">
            {eventTeasers.map((ev) => (
              <li key={ev.pageId}>
                <Link
                  to={campaignWikiPath(campaignHandle, ev.pageId, flatPages)}
                  className="hover:text-primary"
                >
                  {ev.title}
                </Link>
                <span className="ml-2 text-[10px] uppercase text-muted">{ev.bucket}</span>
              </li>
            ))}
          </ul>
        </EntityPageSection>
      ) : null}
    </div>
  );
}
