import { ArrowRight, Pencil } from 'lucide-react';
import { parseBestiaryMetadata } from '@/lib/bestiaryMetadata';
import type { BestiaryIntelProjection } from '@/lib/bestiaryIdentityProjection';
import { maskIntelValue } from '@/lib/bestiaryIdentityProjection';
import { buildInfoboxProjection } from '@/lib/buildInfoboxProjection';
import { formatRichDiscoveryStateLabel } from '@/lib/wikiPageHeaderMeta';
import type { DiscoveryStateProjection } from '@shared/discoveryProjection';
import type { EntitySubviewId } from '@/lib/entityPageShells/types';
import type { InfoboxField, WikiPageBlock, WikiTreeNode } from '@/types/wiki';
import { EntityRelationChip } from '@/components/entity/EntityRelationChip';
import { useCampaignChronologyNow } from '@/hooks/useCampaignChronologyNow';

function DashboardCard({
  title,
  children,
  editMode,
  isEditingPage,
  jumpLabel,
  onJump,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  editMode: 'inline' | 'jump-to-tab' | 'read-only';
  isEditingPage: boolean;
  jumpLabel?: string;
  onJump?: () => void;
  className?: string;
}) {
  return (
    <article
      className={`rounded-lg border border-border/60 bg-surface/40 p-4 ${className}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
          {title}
        </h3>
        {isEditingPage && editMode === 'jump-to-tab' && onJump ? (
          <button
            type="button"
            onClick={onJump}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Pencil className="size-3" aria-hidden />
            {jumpLabel ?? 'Edit'}
          </button>
        ) : null}
        {!isEditingPage && onJump ? (
          <button
            type="button"
            onClick={onJump}
            className="inline-flex items-center gap-0.5 text-xs text-muted hover:text-primary"
          >
            View
            <ArrowRight className="size-3" aria-hidden />
          </button>
        ) : null}
      </div>
      {children}
    </article>
  );
}

function getNarrativeExcerpt(blocks: WikiPageBlock[]): string {
  const tiptap = blocks.find((b) => b.type === 'text-tiptap');
  const md = (tiptap?.content as { markdown?: string })?.markdown ?? '';
  const plain = md.replace(/[#*_`>\[\]()]/g, '').trim();
  if (!plain) return '';
  return plain.length > 200 ? `${plain.slice(0, 200).trim()}…` : plain;
}

interface CreatureOverviewDashboardProps {
  campaignHandle: string;
  pageId: string;
  blocks: WikiPageBlock[];
  flatPages: WikiTreeNode[];
  pageMetadata: unknown;
  intel: BestiaryIntelProjection;
  discovery?: DiscoveryStateProjection | null;
  isEditingPage: boolean;
  onJumpToTab: (subviewId: EntitySubviewId, focus?: string) => void;
}

export function CreatureOverviewDashboard({
  campaignHandle,
  pageId,
  blocks,
  flatPages,
  pageMetadata,
  intel,
  discovery,
  isEditingPage,
  onJumpToTab,
}: CreatureOverviewDashboardProps) {
  const campaignNow = useCampaignChronologyNow(campaignHandle);
  const bestiary = parseBestiaryMetadata(pageMetadata);
  const narrativeExcerpt = getNarrativeExcerpt(blocks);
  const infoboxFields = buildInfoboxProjection('DEFAULT', pageMetadata, flatPages, 'bestiary');

  const weaknessDisplay = maskIntelValue(
    intel.discoveryMask.weaknesses,
    intel.weaknesses,
    'Unknown',
  );
  const resistDisplay = maskIntelValue(
    intel.discoveryMask.resistances,
    intel.resistances,
    'Unknown',
  );
  const immuneDisplay = maskIntelValue(
    intel.discoveryMask.immunities,
    intel.immunities,
    'Unknown',
  );

  const snapshots = flatPages.map((p) => ({
    id: p.id,
    title: p.title,
    templateType: p.templateType,
    metadata: p.metadata ?? null,
  }));

  const previewContext = { campaignNow, isDMUser: true, viewerPageId: pageId };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <DashboardCard
        title="Threat Profile"
        editMode="jump-to-tab"
        isEditingPage={isEditingPage}
        jumpLabel="Edit ecology"
        onJump={() => onJumpToTab('overview', 'threatLevel')}
      >
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Threat</dt>
            <dd className="font-medium">
              {maskIntelValue(intel.discoveryMask.threat, intel.threatLevel) ?? '—'}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Temperament</dt>
            <dd className="font-medium">
              {maskIntelValue(intel.discoveryMask.temperament, intel.temperament) ?? '—'}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Intelligence</dt>
            <dd className="font-medium">{intel.intelligence ?? '—'}</dd>
          </div>
        </dl>
      </DashboardCard>

      <DashboardCard
        title="Habitat & Range"
        editMode="jump-to-tab"
        isEditingPage={isEditingPage}
        onJump={() => onJumpToTab('encounters')}
      >
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Region</dt>
            <dd className="font-medium">
              {maskIntelValue(intel.discoveryMask.region, intel.region) ?? '—'}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Habitat</dt>
            <dd className="font-medium">{intel.habitat ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Encounter</dt>
            <dd className="text-right font-medium">
              {maskIntelValue(intel.discoveryMask.encounter, intel.encounterConditions) ?? '—'}
            </dd>
          </div>
        </dl>
      </DashboardCard>

      <DashboardCard
        title="Combat Intel"
        editMode="jump-to-tab"
        isEditingPage={isEditingPage}
        onJump={() => onJumpToTab('combat')}
      >
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Weak to</dt>
            <dd className="font-medium">{weaknessDisplay ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Resists</dt>
            <dd className="font-medium">{resistDisplay ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Immune</dt>
            <dd className="font-medium">{immuneDisplay ?? '—'}</dd>
          </div>
        </dl>
      </DashboardCard>

      <DashboardCard
        title="Behavior"
        editMode="jump-to-tab"
        isEditingPage={isEditingPage}
        onJump={() => onJumpToTab('combat')}
      >
        {intel.behaviorSummary ? (
          <p className="text-sm leading-relaxed text-foreground/90">
            {maskIntelValue(intel.discoveryMask.behavior, intel.behaviorSummary)}
          </p>
        ) : (
          <p className="text-sm text-muted">No observed behavior recorded yet.</p>
        )}
      </DashboardCard>

      <DashboardCard title="Discovery Status" editMode="read-only" isEditingPage={isEditingPage}>
        <dl className="space-y-1.5 text-sm">
          {discovery ? (
            <div>
              <dt className="text-xs font-medium text-muted">Party knowledge</dt>
              <dd>{formatRichDiscoveryStateLabel(discovery.state)}</dd>
            </div>
          ) : (
            <p className="text-sm text-muted">No discovery state yet.</p>
          )}
        </dl>
      </DashboardCard>

      <DashboardCard
        title="Field Notes"
        editMode="jump-to-tab"
        isEditingPage={isEditingPage}
        jumpLabel="Edit lore"
        onJump={() => onJumpToTab('lore')}
        className="sm:col-span-2"
      >
        {narrativeExcerpt ? (
          <p className="text-sm leading-relaxed text-foreground/90">{narrativeExcerpt}</p>
        ) : (
          <p className="text-sm text-muted">No field notes yet.</p>
        )}
      </DashboardCard>

      <DashboardCard
        title="Related"
        editMode="read-only"
        isEditingPage={isEditingPage}
        onJump={() => onJumpToTab('relationships')}
        className="sm:col-span-2"
      >
        {bestiary.relatedCreatureIds.length > 0 || bestiary.relatedLocationIds.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {[...bestiary.relatedCreatureIds, ...bestiary.relatedLocationIds]
              .slice(0, 6)
              .map((relatedId) => {
                const page = flatPages.find((p) => p.id === relatedId);
                if (!page) return null;
                return (
                  <li key={relatedId}>
                    <EntityRelationChip
                      campaignHandle={campaignHandle}
                      pageId={relatedId}
                      title={page.title}
                      templateType={page.templateType}
                      flatPages={snapshots}
                      previewContext={previewContext}
                      compact
                    />
                  </li>
                );
              })}
          </ul>
        ) : infoboxFields.length > 0 ? (
          <dl className="grid gap-1.5 text-sm sm:grid-cols-2">
            {infoboxFields.slice(0, 4).map((field: InfoboxField) => (
              <div key={field.key} className="flex justify-between gap-2">
                <dt className="text-muted">{field.key}</dt>
                <dd className="font-medium">{field.value || '—'}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted">No related creatures or locations yet.</p>
        )}
      </DashboardCard>
    </div>
  );
}
