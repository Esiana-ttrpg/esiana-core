import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { ArrowRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  MAX_CURRENT_PRESSURES,
  parseOrganizationMetadata,
} from '@/lib/organizationMetadata';
import { buildOrganizationStructureProjection } from '@/lib/organizationStructureProjection';
import { buildOrganizationPresenceProjection } from '@/lib/organizationPresenceProjection';
import { buildOrganizationPeopleProjection } from '@/lib/organizationPeopleProjection';
import { orgDiplomaticTensions } from '@/lib/entityProjectionQueries';
import { useOrganizationReputationStanding } from '@/hooks/useOrganizationReputationStanding';
import { useCampaignChronologyNow } from '@/hooks/useCampaignChronologyNow';
import { updateOrganizationMetadata } from '@/lib/wiki';
import { campaignRelationsPath } from '@/lib/campaignPaths';
import type { EntitySubviewId } from '@/lib/entityPageShells/types';
import type { WikiTreeNode } from '@/types/wiki';
import { useState } from 'react';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

function DashboardCard({
  title,
  children,
  editMode,
  isEditingPage,
  jumpLabel,
  onJump,
}: {
  title: string;
  children: React.ReactNode;
  editMode: 'jump-to-tab' | 'read-only' | 'inline';
  isEditingPage: boolean;
  jumpLabel?: string;
  onJump?: () => void;
}) {
  return (
    <article className="rounded-lg border border-border/60 bg-surface/40 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className={META_SECTION_LABEL_CLASS}>{title}</h3>
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

function toneClass(tone: string | undefined): string {
  if (tone === 'escalation') return 'text-red-400';
  if (tone === 'warning') return 'text-amber-400';
  return 'text-foreground';
}

interface OrganizationOverviewDashboardProps {
  campaignHandle: string;
  pageId: string;
  flatPages: WikiTreeNode[];
  pageMetadata: unknown;
  isDMUser?: boolean;
  isEditingPage: boolean;
  onJumpToTab: (subviewId: EntitySubviewId, focus?: string) => void;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
}

export function OrganizationOverviewDashboard({
  campaignHandle,
  pageId,
  flatPages,
  pageMetadata,
  isDMUser: isDMUserProp,
  isEditingPage,
  onJumpToTab,
  onMetadataSaved,
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

  const structure = buildOrganizationStructureProjection(pageId, snapshots);
  const presence = buildOrganizationPresenceProjection(pageId, snapshots);
  const people = buildOrganizationPeopleProjection(pageId, snapshots, campaignNow, isDMUser);
  const pageSnapshot = snapshots.find((s) => s.id === pageId);
  const tensions = pageSnapshot
    ? orgDiplomaticTensions(pageSnapshot, snapshots, campaignNow, isDMUser)
    : [];

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
    <div className="space-y-4">
      <DashboardCard
        title="Current pressures"
        editMode={isEditingPage && isDMUser ? 'inline' : 'jump-to-tab'}
        isEditingPage={isEditingPage}
        onJump={() => onJumpToTab('overview', 'currentPressures')}
      >
        {org.currentPressures.length === 0 ? (
          <p className="text-sm text-muted">
            No active pressures recorded. Add campaign-relevant stressors.
          </p>
        ) : (
          <ul className="space-y-1 text-sm text-foreground">
            {org.currentPressures.map((pressure, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-amber-500">•</span>
                <span>{pressure}</span>
              </li>
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
      </DashboardCard>

      <DashboardCard
        title="Why they matter now"
        editMode="read-only"
        isEditingPage={isEditingPage}
        onJump={() => onJumpToTab('relations')}
      >
        <div className="space-y-2 text-sm">
          {org.worldState ? (
            <p>
              <span className="text-muted">State:</span>{' '}
              <span className="font-medium capitalize">{org.worldState}</span>
            </p>
          ) : null}
          {standing ? (
            <p>
              <span className="text-muted">Party standing:</span>{' '}
              Trust{' '}
              <span className={toneClass(standing.trustTone)}>{standing.trustBand}</span>
              {' · '}
              Notoriety{' '}
              <span className={toneClass(standing.notorietyTone)}>{standing.notorietyBand}</span>
            </p>
          ) : (
            <p className="text-muted">No party standing recorded.</p>
          )}
          {tensions.length > 0 ? (
            <p>
              <span className="text-muted">Active tensions:</span> {tensions.length}
            </p>
          ) : null}
        </div>
      </DashboardCard>

      <nav
        className="flex flex-wrap gap-2 rounded-lg border border-border/40 bg-surface/20 p-3"
        aria-label="Explore organization"
      >
        <TeaserLink
          label="Structure"
          detail={
            structure
              ? `${structure.children.length} division${structure.children.length === 1 ? '' : 's'}${
                  structure.divergentChildCount > 0
                    ? ` · ${structure.divergentChildCount} divergent`
                    : ''
                }`
              : '—'
          }
          onClick={() => onJumpToTab('structure')}
        />
        <TeaserLink
          label="Presence"
          detail={presence?.excerpt ?? '—'}
          onClick={() => onJumpToTab('presence')}
        />
        <TeaserLink
          label="People"
          detail={
            people.length > 0
              ? `${people.length} figure${people.length === 1 ? '' : 's'}`
              : '—'
          }
          onClick={() => onJumpToTab('people')}
        />
        <TeaserLink
          label="Relations"
          detail={
            tensions.length > 0 ? `${tensions.length} tension${tensions.length === 1 ? '' : 's'}` : '—'
          }
          onClick={() => onJumpToTab('relations')}
        />
        <TeaserLink label="Lore" detail="Historical notes" onClick={() => onJumpToTab('lore')} />
        {isDMUser ? (
          <Link
            to={campaignRelationsPath(campaignHandle, { lens: 'structure', focus: `bloc:${pageId}` })}
            className="rounded-md border border-border/50 px-2 py-1 text-xs text-muted hover:border-primary/40 hover:text-primary"
          >
            Relations workspace →
          </Link>
        ) : null}
      </nav>
    </div>
  );
}

function TeaserLink({
  label,
  detail,
  onClick,
}: {
  label: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-border/50 px-2 py-1 text-left text-xs transition-colors hover:border-primary/40"
    >
      <span className="font-medium text-foreground">{label}</span>
      <span className="ml-1 text-muted">· {detail}</span>
    </button>
  );
}
