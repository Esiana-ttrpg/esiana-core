import { META_SECTION_LABEL_CLASS, REGION_DEPTH_3_CLASS, TYPE_PROSE_CLASS } from '@/lib/surfaceLayout';
import { Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  MAX_CURRENT_PRESSURES,
  parseOrganizationMetadata,
} from '@/lib/organizationMetadata';
import { orgDiplomaticTensions } from '@/lib/entityProjectionQueries';
import { useOrganizationReputationStanding } from '@/hooks/useOrganizationReputationStanding';
import { useCampaignChronologyNow } from '@/hooks/useCampaignChronologyNow';
import { updateOrganizationMetadata } from '@/lib/wiki';
import { campaignRelationsPath } from '@/lib/campaignPaths';
import { buildInfoboxProjection } from '@/lib/buildInfoboxProjection';
import { ProfileDetailsCard } from './ProfileDetailsCard';
import type { EntitySubviewId } from '@/lib/entityPageShells/types';
import type { WikiPageBlock, WikiTreeNode } from '@/types/wiki';
import { useState } from 'react';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

function toneClass(tone: string | undefined): string {
  if (tone === 'escalation') return 'text-red-400';
  if (tone === 'warning') return 'text-amber-400';
  return 'text-foreground';
}

interface OrganizationOverviewDashboardProps {
  campaignHandle: string;
  pageId: string;
  templateType: string;
  blocks: WikiPageBlock[];
  flatPages: WikiTreeNode[];
  pageMetadata: unknown;
  isDMUser?: boolean;
  isEditingPage: boolean;
  onJumpToTab: (subviewId: EntitySubviewId, focus?: string) => void;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
  onBlocksChange: (updater: (blocks: WikiPageBlock[]) => WikiPageBlock[]) => void;
}

export function OrganizationOverviewDashboard({
  campaignHandle,
  pageId,
  templateType,
  blocks,
  flatPages,
  pageMetadata,
  isDMUser: isDMUserProp,
  isEditingPage,
  onJumpToTab,
  onMetadataSaved,
  onBlocksChange,
}: OrganizationOverviewDashboardProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const campaignNow = useCampaignChronologyNow(campaignHandle);
  const org = parseOrganizationMetadata(pageMetadata);
  const { standing } = useOrganizationReputationStanding(campaignHandle, pageId);
  const [saving, setSaving] = useState(false);

  const snapshots = flatPages.map((p) => ({
    id: p.id,
    title: p.title,
    templateType: p.templateType,
    metadata: p.metadata ?? null,
  }));

  const pageSnapshot = snapshots.find((s) => s.id === pageId);
  const tensions = pageSnapshot
    ? orgDiplomaticTensions(pageSnapshot, snapshots, campaignNow, isDMUser)
    : [];

  const infoboxBlock = blocks.find((b) => b.type === 'wiki-infobox');
  const infoboxFields =
    (infoboxBlock?.content as { fields?: { key: string; value: string }[] })?.fields ??
    buildInfoboxProjection(templateType, pageMetadata, flatPages, 'organization');

  function updateInfoboxFields(fields: { key: string; value: string }[]) {
    onBlocksChange((prev) =>
      prev.map((b) =>
        b.type === 'wiki-infobox'
          ? { ...b, content: { ...(b.content as object), fields } }
          : b,
      ),
    );
  }

  async function persistPressures(next: string[]) {
    setSaving(true);
    try {
      const result = await updateOrganizationMetadata(campaignHandle, pageId, {
        currentPressures: next.filter((p) => p.trim()),
      });
      onMetadataSaved(result.metadata);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className={META_SECTION_LABEL_CLASS}>Current pressures</h2>
          {!isEditingPage ? (
            <button
              type="button"
              onClick={() => onJumpToTab('overview', 'currentPressures')}
              className="text-xs text-muted hover:text-primary"
            >
              View all
            </button>
          ) : null}
        </div>
        {org.currentPressures.length === 0 ? (
          <p className="text-sm text-muted">No active pressures recorded.</p>
        ) : (
          <ul className={`${TYPE_PROSE_CLASS} list-disc space-y-1 pl-5 text-sm`}>
            {org.currentPressures.map((pressure, i) => (
              <li key={i}>{pressure}</li>
            ))}
          </ul>
        )}
        {isEditingPage && isDMUser ? (
          <div className="mt-3 space-y-2">
            {org.currentPressures.map((pressure, index) => (
              <div key={index} className="flex gap-2">
                <input
                  className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                  value={pressure}
                  onChange={(e) => {
                    const next = [...org.currentPressures];
                    next[index] = e.target.value;
                    void persistPressures(next);
                  }}
                  disabled={saving}
                />
                <button
                  type="button"
                  onClick={() =>
                    void persistPressures(org.currentPressures.filter((_, i) => i !== index))
                  }
                  className="text-muted hover:text-red-400"
                  aria-label="Remove"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
            {org.currentPressures.length < MAX_CURRENT_PRESSURES ? (
              <button
                type="button"
                onClick={() => void persistPressures([...org.currentPressures, ''])}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="size-3" />
                Add pressure
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      <div className={`${REGION_DEPTH_3_CLASS} space-y-2 text-sm text-muted`}>
        {org.worldState ? (
          <p>
            State: <span className="text-foreground capitalize">{org.worldState}</span>
          </p>
        ) : null}
        {standing ? (
          <p>
            Party standing: Trust{' '}
            <span className={toneClass(standing.trustTone)}>{standing.trustBand}</span>
            {' · '}
            Notoriety{' '}
            <span className={toneClass(standing.notorietyTone)}>{standing.notorietyBand}</span>
          </p>
        ) : null}
        {tensions.length > 0 ? (
          <p>
            Active tensions: <span className="text-foreground">{tensions.length}</span>
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <button type="button" onClick={() => onJumpToTab('structure')} className="text-muted hover:text-primary">
          Structure
        </button>
        <button type="button" onClick={() => onJumpToTab('presence')} className="text-muted hover:text-primary">
          Presence
        </button>
        <button type="button" onClick={() => onJumpToTab('people')} className="text-muted hover:text-primary">
          People
        </button>
        <button type="button" onClick={() => onJumpToTab('relations')} className="text-muted hover:text-primary">
          Relations
        </button>
        <button type="button" onClick={() => onJumpToTab('lore')} className="text-muted hover:text-primary">
          Lore
        </button>
        {isDMUser ? (
          <Link
            to={campaignRelationsPath(campaignHandle, { lens: 'structure', focus: `bloc:${pageId}` })}
            className="text-muted hover:text-primary"
          >
            Relations workspace
          </Link>
        ) : null}
      </div>

      <ProfileDetailsCard
        fields={infoboxFields}
        isEditingPage={isEditingPage}
        isDMUser={isDMUser}
        onFieldsChange={updateInfoboxFields}
      />
    </div>
  );
}
