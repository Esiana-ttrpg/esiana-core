import { ArrowRight, Pencil } from 'lucide-react';
import {
  buildEntityRelationshipProjection,
  type WikiPageLineageSnapshot,
} from '@/lib/entityProjectionQueries';
import { buildInfoboxProjection } from '@/lib/buildInfoboxProjection';
import { projectEntityAppearance } from '@/lib/entityAppearanceProjection';
import { formatCharacterStatusLabel, resolveCharacterStatus } from '@/lib/characterMetadata';
import { parseCharacterLineageMetadata } from '@/lib/characterLineageMetadata';
import { parseCharacterMetadata } from '@/lib/characterMetadata';
import { formatRichDiscoveryStateLabel } from '@/lib/wikiPageHeaderMeta';
import type { EntityOverviewProps } from '@/lib/entityPageShells/types';
import type { InfoboxField, WikiPageBlock } from '@/types/wiki';
import { EntityRelationChip } from '@/components/entity/EntityRelationChip';
import { useCampaignChronologyNow } from '@/hooks/useCampaignChronologyNow';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

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

function getBiographyExcerpt(blocks: WikiPageBlock[]): string {
  const bio = blocks.find((b) => b.type === 'text-biography');
  const md = (bio?.content as { markdown?: string })?.markdown ?? '';
  const plain = md.replace(/[#*_`>\[\]()]/g, '').trim();
  if (!plain) return '';
  return plain.length > 200 ? `${plain.slice(0, 200).trim()}…` : plain;
}

function ProfileInlineEditor({
  fields,
  onFieldsChange,
}: {
  fields: InfoboxField[];
  onFieldsChange: (fields: InfoboxField[]) => void;
}) {
  if (fields.length === 0) {
    return <p className="text-sm text-muted">No profile fields yet.</p>;
  }
  return (
    <dl className="space-y-2">
      {fields.map((field, index) => (
        <div key={`${field.key}-${index}`} className="grid gap-1 sm:grid-cols-[6rem_1fr]">
          <dt className="text-xs font-medium text-muted">{field.key}</dt>
          <dd>
            <input
              type="text"
              value={field.value}
              onChange={(e) => {
                const next = [...fields];
                next[index] = { ...field, value: e.target.value };
                onFieldsChange(next);
              }}
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary/50"
            />
          </dd>
        </div>
      ))}
    </dl>
  );
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

  const appearance = projectEntityAppearance(pageMetadata, 'character');

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
    <div className="grid gap-3 sm:grid-cols-2">
      <DashboardCard
        title="Summary"
        editMode="jump-to-tab"
        isEditingPage={isEditingPage}
        jumpLabel="Edit biography"
        onJump={() => onJumpToTab('biography')}
        className="sm:col-span-1"
      >
        {biographyExcerpt || characterProjection?.identityLine ? (
          <p className="text-sm leading-relaxed text-foreground/90">
            {biographyExcerpt || characterProjection?.identityLine}
          </p>
        ) : (
          <p className="text-sm text-muted">No story summary yet.</p>
        )}
      </DashboardCard>

      <DashboardCard
        title="Current Status"
        editMode="inline"
        isEditingPage={isEditingPage}
      >
        <dl className="space-y-1.5 text-sm">
          <div>
            <dt className="text-xs font-medium text-muted">Life status</dt>
            <dd>{status ? formatCharacterStatusLabel(status) : '—'}</dd>
          </div>
          {discovery ? (
            <div>
              <dt className="text-xs font-medium text-muted">Party knowledge</dt>
              <dd>{formatRichDiscoveryStateLabel(discovery.state)}</dd>
            </div>
          ) : null}
        </dl>
      </DashboardCard>

      <DashboardCard
        title="Active Form"
        editMode="jump-to-tab"
        isEditingPage={isEditingPage}
        jumpLabel="Edit appearance"
        onJump={() => onJumpToTab('appearance')}
      >
        {appearance.portraitUrl ? (
          <img
            src={appearance.portraitUrl}
            alt=""
            className="mb-2 size-16 rounded-lg border border-border object-cover"
          />
        ) : null}
        {appearance.summary ? (
          <p className="text-sm text-foreground/90">{appearance.summary}</p>
        ) : (
          <p className="text-sm text-muted">No active form described yet.</p>
        )}
      </DashboardCard>

      <DashboardCard
        title="Relationships"
        editMode="read-only"
        isEditingPage={isEditingPage}
        onJump={() => onJumpToTab('relationships')}
      >
        {projection.affiliations.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {projection.affiliations.slice(0, 3).map((row) => (
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
        ) : (
          <p className="text-sm text-muted">No key relationships yet.</p>
        )}
      </DashboardCard>

      <DashboardCard
        title="Profile"
        editMode="inline"
        isEditingPage={isEditingPage}
      >
        {isEditingPage && isDMUser ? (
          <ProfileInlineEditor
            fields={infoboxFields}
            onFieldsChange={updateInfoboxFields}
          />
        ) : infoboxFields.length > 0 ? (
          <dl className="space-y-1.5 text-sm">
            {infoboxFields.slice(0, 6).map((field) => (
              <div key={field.key} className="flex justify-between gap-2">
                <dt className="text-muted">{field.key}</dt>
                <dd className="text-right font-medium">{field.value || '—'}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted">No profile vitals yet.</p>
        )}
      </DashboardCard>

      <DashboardCard
        title="Recent Events"
        editMode="read-only"
        isEditingPage={isEditingPage}
        onJump={() => onJumpToTab('timeline')}
      >
        <p className="text-sm text-muted">
          Timeline milestones will appear here as chronology hooks mature.
        </p>
      </DashboardCard>
    </div>
  );
}
