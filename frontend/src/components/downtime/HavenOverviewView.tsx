import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { DowntimeHavenOverviewPayload } from '@shared/downtimeHub';
import { fetchDowntimeHavenOverview } from '@/lib/downtime';
import {
  downtimeSectionHref,
} from '@/lib/downtimeLayout';
import { campaignDowntimeHubPath, campaignWikiPath } from '@/lib/campaignPaths';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { DowntimePulseCard } from '@/components/downtime/DowntimePulseCard';
import { DowntimeFeedCardList } from '@/components/downtime/DowntimeFeedCardList';
import { DowntimeOperationCard } from '@/components/downtime/DowntimeOperationCard';
import { WikiPageBreadcrumbs } from '@/components/wiki/WikiPageBreadcrumbs';
import { ManageHavenModal } from '@/components/downtime/ManageHavenModal';
import { HavenIdentityStrip } from '@/components/downtime/HavenIdentityStrip';
import { HavenReferencesSection } from '@/components/downtime/HavenReferencesSection';
import { HavenSpacesSection } from '@/components/downtime/HavenSpacesSection';
import type { WikiTreeNode } from '@/types/wiki';

interface HavenOverviewViewProps {
  campaignHandle: string;
  havenId: string;
  wikiPageId: string;
  downtimeCategoryPageId: string | null;
  breadcrumbs: Array<{ id: string; title: string }>;
  flatPages: WikiTreeNode[];
  canManage: boolean;
}

function toneClass(tone: 'neutral' | 'warning' | 'escalation'): string {
  if (tone === 'escalation') return 'border-red-500/30 bg-red-950/20';
  if (tone === 'warning') return 'border-amber-500/30 bg-amber-950/20';
  return 'border-border bg-elevated/20';
}

export function HavenOverviewView({
  campaignHandle,
  havenId,
  wikiPageId,
  downtimeCategoryPageId,
  breadcrumbs,
  flatPages,
  canManage,
}: HavenOverviewViewProps) {
  const [overview, setOverview] = useState<DowntimeHavenOverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loreOpen, setLoreOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);

  const loreEditHref = `${campaignWikiPath(campaignHandle, wikiPageId, flatPages)}?view=lore`;

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchDowntimeHavenOverview(campaignHandle, havenId);
      setOverview(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load haven overview.');
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [campaignHandle, havenId]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const havensHubHref = downtimeSectionHref(campaignDowntimeHubPath(campaignHandle), 'havens');

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner label="Loading haven…" />
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="p-6">
        <p className="rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error ?? 'Haven not found.'}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-6">
      <WikiPageBreadcrumbs crumbs={breadcrumbs} campaignHandle={campaignHandle} />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        {havensHubHref ? (
          <Link
            to={havensHubHref}
            className="inline-block text-sm text-primary hover:underline"
          >
            ← Back to havens
          </Link>
        ) : (
          <span />
        )}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canManage ? (
            <button
              type="button"
              onClick={() => setIsManageOpen(true)}
              className="rounded border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted"
            >
              Manage haven
            </button>
          ) : null}
          {canManage ? (
            <Link
              to={loreEditHref}
              className="rounded border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Edit lore
            </Link>
          ) : null}
        </div>
      </div>

      <HavenIdentityStrip title={overview.title} identity={overview.identity} />

      <DowntimePulseCard pulse={overview.pulse} />

      {overview.simulation.enabled || canManage ? (
        <section className="rounded-lg border border-border bg-elevated/20 p-5">
          <h2 className="text-base font-semibold text-foreground">Underlying pressures</h2>
          {!overview.simulation.enabled ? (
            canManage ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Simulation inactive — enable in Manage haven to react to time passage.
              </p>
            ) : null
          ) : overview.simulation.pausedReason ? (
            <p className="mt-2 text-sm text-amber-200/90">
              Paused: {overview.simulation.pausedReason}
            </p>
          ) : overview.simulation.pressureHeadline ? (
            <p className="mt-2 text-sm font-medium text-foreground">
              {overview.simulation.pressureHeadline}
            </p>
          ) : null}
          {overview.simulation.enabled && !overview.simulation.pausedReason ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {overview.simulation.axes.map((axis) => (
                <div
                  key={axis.id}
                  className={`rounded-full border px-3 py-1 text-sm ${toneClass(axis.tone)}`}
                  title={
                    canManage && overview.simulation.axisDrivers[axis.id]?.length
                      ? overview.simulation.axisDrivers[axis.id]!.join(' · ')
                      : undefined
                  }
                >
                  <span className="text-muted-foreground">{axis.label}:</span>{' '}
                  <span className="text-foreground">{axis.bandLabel}</span>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-lg border border-primary/20 bg-primary/5 p-5">
        <h2 className="text-lg font-semibold text-foreground">Recent changes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          What happened here — the living memory of this haven.
        </p>
        <div className="mt-4">
          <DowntimeFeedCardList
            cards={overview.recentChanges}
            emptyMessage="Nothing recorded yet — history begins with the next session."
          />
        </div>
      </section>

      <HavenReferencesSection
        references={overview.references}
        relatedPages={overview.identity.relatedPages}
      />

      <HavenSpacesSection spaces={overview.spaces} />

      {overview.activeOperations.length > 0 ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">Active operations</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Projects tied to this haven.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {overview.activeOperations.map((card) => (
              <DowntimeOperationCard key={card.id} card={card} />
            ))}
          </div>
        </section>
      ) : null}

      {overview.threats.length > 0 ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">Current threats</h2>
          <div className="mt-4 flex flex-col gap-3">
            {overview.threats.map((threat) => (
              <div
                key={threat.id}
                className={`rounded-lg border p-4 ${toneClass(threat.tone)}`}
              >
                <p className="font-medium text-foreground">{threat.label}</p>
                {threat.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{threat.description}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {overview.improvements.length > 0 ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">Improvements & facilities</h2>
          <div className="mt-4 flex flex-col gap-3">
            {overview.improvements.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-border bg-elevated/20 p-4"
              >
                <p className="font-medium text-foreground">{item.label}</p>
                {item.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                ) : null}
                {item.provenanceLabel ? (
                  <p className="mt-2 text-xs text-primary/80">{item.provenanceLabel}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {(overview.present.residents.length > 0 || overview.present.crew.length > 0) ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">Present</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {overview.present.residents.map((resident) => (
              <Link
                key={resident.pageId}
                to={campaignWikiPath(campaignHandle, resident.pageId, flatPages)}
                className="rounded-full border border-border bg-elevated/30 px-3 py-1 text-sm text-foreground hover:border-primary/40"
              >
                {resident.label}
              </Link>
            ))}
            {overview.present.crew.map((member) => (
              <span
                key={member.id}
                className="rounded-full border border-border bg-elevated/30 px-3 py-1 text-sm text-muted-foreground"
              >
                {member.label}
                {member.role ? ` (${member.role})` : ''}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {overview.loreMarkdown ? (
        <section className="border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setLoreOpen((prev) => !prev)}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {loreOpen ? 'Hide lore' : 'Show lore'}
          </button>
          {loreOpen ? (
            <div className="prose prose-invert mt-4 max-w-none text-sm">
              <p className="whitespace-pre-wrap text-muted-foreground">
                {overview.loreMarkdown}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      <ManageHavenModal
        open={isManageOpen}
        campaignHandle={campaignHandle}
        havenId={havenId}
        flatPages={flatPages}
        downtimeCategoryPageId={downtimeCategoryPageId}
        onClose={() => setIsManageOpen(false)}
        onUpdated={() => void loadOverview()}
      />
    </div>
  );
}
