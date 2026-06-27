import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { ArrowRight, Pencil } from 'lucide-react';
import { EntityRelationChip } from '@/components/entity/EntityRelationChip';
import { AncestryInheritancePanel } from './AncestryInheritancePanel';
import {
  buildAncestryInheritanceProjection,
} from '@/lib/ancestryInheritanceProjection';
import { buildAncestryPresenceProjection, formatPresenceExcerpt } from '@/lib/ancestryPresenceProjection';
import {
  ANCESTRY_ENTITY_KIND_LABELS,
  parseAncestryMetadata,
  POPULATION_PRESENCE_LABELS,
} from '@/lib/ancestryMetadata';
import { charactersOfAncestry } from '@/lib/charactersOfAncestry';
import type { EntitySubviewId } from '@/lib/entityPageShells/types';
import type { WikiPageBlock, WikiTreeNode } from '@/types/wiki';
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
        <h3 className={META_SECTION_LABEL_CLASS}>
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

interface AncestryOverviewDashboardProps {
  campaignHandle: string;
  pageId: string;
  blocks: WikiPageBlock[];
  flatPages: WikiTreeNode[];
  pageMetadata: unknown;
  isEditingPage: boolean;
  onJumpToTab: (subviewId: EntitySubviewId, focus?: string) => void;
}

export function AncestryOverviewDashboard({
  campaignHandle,
  pageId,
  blocks,
  flatPages,
  pageMetadata,
  isEditingPage,
  onJumpToTab,
}: AncestryOverviewDashboardProps) {
  const campaignNow = useCampaignChronologyNow(campaignHandle);
  const ancestry = parseAncestryMetadata(pageMetadata);
  const inheritance = buildAncestryInheritanceProjection(pageId, flatPages);
  const characters = charactersOfAncestry(pageId, flatPages);
  const presence = buildAncestryPresenceProjection(pageId, flatPages, {
    campaignCharacterLocationIds: characters
      .map((c) => c.currentLocationId)
      .filter((id): id is string => Boolean(id)),
  });
  const presenceExcerpt = formatPresenceExcerpt(presence);
  const narrativeExcerpt = getNarrativeExcerpt(blocks);

  const snapshots = flatPages.map((p) => ({
    id: p.id,
    title: p.title,
    templateType: p.templateType,
    metadata: p.metadata ?? null,
  }));

  const previewContext = { campaignNow, isDMUser: true, viewerPageId: pageId };
  const primarySociety = ancestry.societies[0];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <DashboardCard
        title="Identity"
        editMode="jump-to-tab"
        isEditingPage={isEditingPage}
        jumpLabel="Edit identity"
        onJump={() => onJumpToTab('overview', 'ancestryType')}
      >
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Kind</dt>
            <dd className="font-medium">{ANCESTRY_ENTITY_KIND_LABELS[ancestry.entityKind]}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Type</dt>
            <dd className="font-medium">{ancestry.ancestryType ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Known for</dt>
            <dd className="text-right font-medium">{ancestry.knownFor ?? '—'}</dd>
          </div>
        </dl>
      </DashboardCard>

      <DashboardCard
        title="Portrait"
        editMode="jump-to-tab"
        isEditingPage={isEditingPage}
        jumpLabel="Edit portrait"
        onJump={() => onJumpToTab('overview', 'appearance.portraitUrl')}
      >
        {ancestry.appearance.portraitUrl ? (
          <img
            src={ancestry.appearance.portraitUrl}
            alt=""
            className="mb-2 size-16 max-h-16 max-w-full rounded-lg border border-border object-cover"
          />
        ) : null}
        {ancestry.appearance.summary ? (
          <p className="text-sm text-foreground/90">{ancestry.appearance.summary}</p>
        ) : ancestry.appearance.portraitUrl ? null : (
          <p className="text-sm text-muted">No portrait yet.</p>
        )}
      </DashboardCard>

      <DashboardCard
        title="Presence"
        editMode="jump-to-tab"
        isEditingPage={isEditingPage}
        onJump={() => onJumpToTab('presence')}
      >
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Distribution</dt>
            <dd className="text-right font-medium">
              {ancestry.populationPresence
                ? POPULATION_PRESENCE_LABELS[ancestry.populationPresence]
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Where found</dt>
            <dd className="mt-0.5 font-medium">{presenceExcerpt ?? '—'}</dd>
          </div>
        </dl>
      </DashboardCard>

      <DashboardCard
        title="Lineages"
        editMode="jump-to-tab"
        isEditingPage={isEditingPage}
        onJump={() => onJumpToTab('lineages')}
      >
        {inheritance.childLineages.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {inheritance.childLineages.slice(0, 4).map((lineage) => (
              <li key={lineage.id} className="font-medium">
                {lineage.title}
              </li>
            ))}
            {inheritance.childLineages.length > 4 ? (
              <li className="text-muted">+{inheritance.childLineages.length - 4} more</li>
            ) : null}
          </ul>
        ) : ancestry.entityKind === 'lineage' ? (
          <p className="text-sm text-muted">Lineage branch of a parent ancestry.</p>
        ) : (
          <p className="text-sm text-muted">No child lineages recorded yet.</p>
        )}
      </DashboardCard>

      <DashboardCard
        title="Societies"
        editMode="jump-to-tab"
        isEditingPage={isEditingPage}
        onJump={() => onJumpToTab('societies')}
      >
        {primarySociety ? (
          <div className="text-sm">
            <p className="font-medium">{primarySociety.name}</p>
            {primarySociety.summary ? (
              <p className="mt-1 text-foreground/80">{primarySociety.summary}</p>
            ) : null}
            {ancestry.societies.length > 1 ? (
              <p className="mt-1 text-xs text-muted">
                +{ancestry.societies.length - 1} more societies
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted">No societies defined yet.</p>
        )}
      </DashboardCard>

      <DashboardCard
        title="Inheritance"
        editMode="jump-to-tab"
        isEditingPage={isEditingPage}
        onJump={() => onJumpToTab('lineages')}
        className="sm:col-span-2"
      >
        <AncestryInheritancePanel
          pageId={pageId}
          flatPages={flatPages}
          showEffectiveTraits={false}
        />
      </DashboardCard>

      <DashboardCard
        title="Characters"
        editMode="jump-to-tab"
        isEditingPage={isEditingPage}
        onJump={() => onJumpToTab('characters')}
      >
        {characters.length > 0 ? (
          <p className="text-sm">
            <span className="font-semibold">{characters.length}</span>
            <span className="text-muted"> linked character{characters.length === 1 ? '' : 's'}</span>
          </p>
        ) : (
          <p className="text-sm text-muted">No characters linked yet.</p>
        )}
      </DashboardCard>

      <DashboardCard
        title="Cultural Notes"
        editMode="jump-to-tab"
        isEditingPage={isEditingPage}
        jumpLabel="Edit notes"
        onJump={() => onJumpToTab('overview')}
        className="sm:col-span-2"
      >
        {narrativeExcerpt ? (
          <p className="text-sm leading-relaxed text-foreground/90">{narrativeExcerpt}</p>
        ) : (
          <p className="text-sm text-muted">No cultural notes yet.</p>
        )}
      </DashboardCard>

      <DashboardCard
        title="Related"
        editMode="read-only"
        isEditingPage={isEditingPage}
        onJump={() => onJumpToTab('relations')}
        className="sm:col-span-2"
      >
        {ancestry.relatedAncestryIds.length > 0 || ancestry.relatedLocationIds.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {[...ancestry.relatedAncestryIds, ...ancestry.relatedLocationIds]
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
        ) : (
          <p className="text-sm text-muted">No related ancestries or locations yet.</p>
        )}
      </DashboardCard>
    </div>
  );
}
