import { META_SECTION_LABEL_CLASS, REGION_DEPTH_3_CLASS, TYPE_PROSE_CLASS } from '@/lib/surfaceLayout';
import { ArrowRight } from 'lucide-react';
import {
  buildEntityRelationshipProjection,
  type WikiPageLineageSnapshot,
} from '@/lib/entityProjectionQueries';
import { buildInfoboxProjection } from '@/lib/buildInfoboxProjection';
import { formatCharacterStatusLabel, resolveCharacterStatus } from '@/lib/characterMetadata';
import { parseCharacterLineageMetadata } from '@/lib/characterLineageMetadata';
import { parseCharacterMetadata } from '@/lib/characterMetadata';
import { formatRichDiscoveryStateLabel } from '@/lib/wikiPageHeaderMeta';
import type { EntityOverviewProps } from '@/lib/entityPageShells/types';
import type { InfoboxField, WikiPageBlock } from '@/types/wiki';
import { EntityRelationChip } from '@/components/entity/EntityRelationChip';
import { useCampaignChronologyNow } from '@/hooks/useCampaignChronologyNow';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';
import { ProfileDetailsCard } from './ProfileDetailsCard';

function getBiographyExcerpt(blocks: WikiPageBlock[]): string {
  const bio = blocks.find((b) => b.type === 'text-biography');
  const md = (bio?.content as { markdown?: string })?.markdown ?? '';
  const plain = md.replace(/[#*_`>\[\]()]/g, '').trim();
  if (!plain) return '';
  return plain.length > 200 ? `${plain.slice(0, 200).trim()}…` : plain;
}

export function CharacterOverviewDashboard({
  campaignHandle,
  pageId,
  templateType,
  blocks,
  flatPages,
  isDMUser: isDMUserProp,
  isEditingPage,
  pageMetadata,
  characterProjection,
  discovery,
  onJumpToTab,
  onBlocksChange,
}: EntityOverviewProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const campaignNow = useCampaignChronologyNow(campaignHandle);
  const snapshots: WikiPageLineageSnapshot[] = flatPages.map((p) => ({
    id: p.id,
    title: p.title,
    templateType: p.templateType,
    metadata: p.metadata ?? null,
  }));

  const projection = buildEntityRelationshipProjection(
    pageId,
    templateType,
    snapshots,
    campaignNow,
    isDMUser,
  );

  const infoboxBlock = blocks.find((b) => b.type === 'wiki-infobox');
  const infoboxFields =
    (infoboxBlock?.content as { fields?: InfoboxField[] })?.fields ??
    buildInfoboxProjection(templateType, pageMetadata, flatPages, 'character');

  const identity = parseCharacterMetadata(pageMetadata);
  const lineage = parseCharacterLineageMetadata(pageMetadata);
  const status = resolveCharacterStatus(identity, lineage);
  const biographyExcerpt = getBiographyExcerpt(blocks);

  const previewContext = {
    campaignNow,
    isDMUser,
    viewerPageId: pageId,
  };

  function updateInfoboxFields(fields: InfoboxField[]) {
    onBlocksChange((prev) =>
      prev.map((b) =>
        b.type === 'wiki-infobox'
          ? { ...b, content: { ...(b.content as object), fields } }
          : b,
      ),
    );
  }

  return (
    <div className="space-y-6">
      {biographyExcerpt || characterProjection?.identityLine ? (
        <p className={`${TYPE_PROSE_CLASS} max-w-3xl text-prose-muted`}>
          {biographyExcerpt || characterProjection?.identityLine}
        </p>
      ) : (
        <p className="text-sm text-muted">No story summary yet.</p>
      )}

      <div className={`${REGION_DEPTH_3_CLASS} space-y-4 px-1 py-1`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className={META_SECTION_LABEL_CLASS}>Current status</span>
          <span className="text-sm text-foreground">
            {status ? formatCharacterStatusLabel(status) : '—'}
            {discovery ? ` · ${formatRichDiscoveryStateLabel(discovery.state)}` : ''}
          </span>
        </div>

        {projection.affiliations.length > 0 ? (
          <div>
            <span className={`${META_SECTION_LABEL_CLASS} mb-2 block`}>Key relationships</span>
            <ul className="flex flex-wrap gap-2">
              {projection.affiliations.slice(0, 4).map((row) => (
                <li key={row.org.id}>
                  <EntityRelationChip
                    campaignHandle={campaignHandle}
                    pageId={row.org.id}
                    title={row.role ? `${row.org.title} (${row.role})` : row.org.title}
                    templateType={row.org.templateType}
                    flatPages={snapshots}
                    previewContext={previewContext}
                    compact
                  />
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => onJumpToTab('relationships')}
              className="mt-2 inline-flex items-center gap-0.5 text-xs text-muted hover:text-primary"
            >
              All relationships
              <ArrowRight className="size-3" aria-hidden />
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
          <button
            type="button"
            onClick={() => onJumpToTab('biography')}
            className="text-muted hover:text-primary"
          >
            Biography
          </button>
          <button
            type="button"
            onClick={() => onJumpToTab('appearance')}
            className="text-muted hover:text-primary"
          >
            Appearance
          </button>
          <button
            type="button"
            onClick={() => onJumpToTab('timeline')}
            className="text-muted hover:text-primary"
          >
            Timeline
          </button>
        </div>
      </div>

      <ProfileDetailsCard
        title="Profile"
        fields={infoboxFields}
        isEditingPage={isEditingPage}
        isDMUser={isDMUser}
        onFieldsChange={updateInfoboxFields}
      />
    </div>
  );
}
