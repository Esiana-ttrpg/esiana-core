import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { DowntimeProjectOverviewPayload } from '@shared/downtimeHub';
import { fetchDowntimeProjectOverview } from '@/lib/downtime';
import { downtimeSectionHref } from '@/lib/downtimeLayout';
import { campaignDowntimeHubPath, campaignWikiPath } from '@/lib/campaignPaths';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { DowntimeOperationCard } from '@/components/downtime/DowntimeOperationCard';
import { DowntimeFeedCardList } from '@/components/downtime/DowntimeFeedCardList';
import { WikiPageBreadcrumbs } from '@/components/wiki/WikiPageBreadcrumbs';
import { ManageProjectModal } from '@/components/downtime/ManageProjectModal';
import type { WikiTreeNode } from '@/types/wiki';

interface ProjectOverviewViewProps {
  campaignHandle: string;
  projectId: string;
  wikiPageId: string;
  downtimeCategoryPageId: string | null;
  breadcrumbs: Array<{ id: string; title: string }>;
  flatPages: WikiTreeNode[];
  canManage: boolean;
}

function formatStatusLabel(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
}

function formatOutcomeSummary(
  outcome: DowntimeProjectOverviewPayload['outcomes'][number],
): string | null {
  if (outcome.outcomeKind === 'treasury_effect' && outcome.treasuryEffect) {
    const effect = outcome.treasuryEffect;
    const sign = effect.kind === 'credit' ? '+' : '-';
    return `${sign}${effect.amount}g${effect.title ? ` — ${effect.title}` : ''}`;
  }
  return outcome.description;
}

export function ProjectOverviewView({
  campaignHandle,
  projectId,
  wikiPageId,
  downtimeCategoryPageId,
  breadcrumbs,
  flatPages,
  canManage,
}: ProjectOverviewViewProps) {
  const [overview, setOverview] = useState<DowntimeProjectOverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loreOpen, setLoreOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);

  const loreEditHref = `${campaignWikiPath(campaignHandle, wikiPageId, flatPages)}?view=lore`;
  const ledgerHref = downtimeSectionHref(campaignDowntimeHubPath(campaignHandle), 'ledger');

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchDowntimeProjectOverview(campaignHandle, projectId);
      setOverview(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load operation overview.');
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [campaignHandle, projectId]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const projectsHubHref = downtimeSectionHref(
    campaignDowntimeHubPath(campaignHandle),
    'projects',
  );

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner label="Loading operation…" />
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="p-6">
        <p className="rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error ?? 'Operation not found.'}
        </p>
      </div>
    );
  }

  const { operation } = overview;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-6">
      <WikiPageBreadcrumbs crumbs={breadcrumbs} campaignHandle={campaignHandle} />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        {projectsHubHref ? (
          <Link
            to={projectsHubHref}
            className="inline-block text-sm text-primary hover:underline"
          >
            ← Back to operations
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
              Manage operation
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

      <section className="rounded-lg border border-primary/20 bg-primary/5 p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-foreground">
            {formatStatusLabel(operation.status)}
          </span>
          {operation.remainingLabel ? (
            <span className="text-sm text-muted-foreground">{operation.remainingLabel}</span>
          ) : null}
          {operation.stalledLabel ? (
            <span className="text-sm text-amber-200/90">{operation.stalledLabel}</span>
          ) : null}
        </div>
        <DowntimeOperationCard card={operation} />
      </section>

      {(overview.owner || overview.haven) && (
        <section className="flex flex-wrap gap-4 text-sm">
          {overview.owner ? (
            <p className="text-muted-foreground">
              Led by{' '}
              <Link to={overview.owner.href} className="text-primary hover:underline">
                {overview.owner.label}
              </Link>
            </p>
          ) : null}
          {overview.haven ? (
            <p className="text-muted-foreground">
              Linked haven{' '}
              <Link to={overview.haven.href} className="text-primary hover:underline">
                {overview.haven.label}
              </Link>
            </p>
          ) : null}
        </section>
      )}

      {overview.pendingTreasurySuggestions &&
      overview.pendingTreasurySuggestions.length > 0 &&
      ledgerHref ? (
        <section className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-4">
          <p className="text-sm font-medium text-foreground">Pending treasury event</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {overview.pendingTreasurySuggestions[0]?.title}
            {overview.pendingTreasurySuggestions[0]?.amountLabel
              ? ` (${overview.pendingTreasurySuggestions[0].amountLabel})`
              : ''}
          </p>
          <Link to={ledgerHref} className="mt-2 inline-block text-sm text-primary hover:underline">
            Review in Ledger →
          </Link>
        </section>
      ) : null}

      <section className="rounded-lg border border-primary/20 bg-primary/5 p-5">
        <h2 className={TYPE_DISPLAY_CLASS}>Recent changes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Operational memory — what shifted as this undertaking progressed.
        </p>
        <div className="mt-4">
          <DowntimeFeedCardList
            cards={overview.recentChanges}
            emptyMessage="Nothing recorded yet — history begins when the operation moves."
          />
        </div>
      </section>

      {overview.resources.length > 0 ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">Requirements</h2>
          <ul className="mt-3 space-y-2">
            {overview.resources.map((resource) => (
              <li
                key={resource.id}
                className={`rounded-md border px-3 py-2 text-sm ${
                  resource.satisfied
                    ? 'border-border/60 bg-muted/20 text-muted-foreground line-through'
                    : 'border-border bg-elevated/20 text-foreground'
                }`}
              >
                {resource.label}
                {resource.sourceKind === 'ledger' && resource.ledgerAmount != null ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({resource.ledgerImpactKind === 'credit' ? '+' : '-'}
                    {resource.ledgerAmount}g)
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {overview.blockers.length > 0 ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">Obstacles</h2>
          <ul className="mt-3 space-y-2">
            {overview.blockers.map((blocker) => (
              <li
                key={blocker.id}
                className={`rounded-md border px-3 py-2 text-sm ${
                  blocker.resolved
                    ? 'border-border/60 bg-muted/20 text-muted-foreground line-through'
                    : 'border-amber-500/30 bg-amber-950/10 text-foreground'
                }`}
              >
                {blocker.label}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {overview.outcomes.length > 0 ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">Outcomes</h2>
          <ul className="mt-3 space-y-2">
            {overview.outcomes.map((outcome) => {
              const summary = formatOutcomeSummary(outcome);
              return (
                <li
                  key={outcome.id}
                  className="rounded-md border border-border bg-elevated/20 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-foreground">
                    {outcome.outcomeKind.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={`ml-2 rounded px-1.5 py-0.5 text-xs ${
                      outcome.status === 'applied'
                        ? 'bg-primary/15 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {outcome.status}
                  </span>
                  {summary ? (
                    <p className="mt-1 text-muted-foreground">{summary}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
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

      <ManageProjectModal
        open={isManageOpen}
        campaignHandle={campaignHandle}
        projectId={projectId}
        flatPages={flatPages}
        onClose={() => setIsManageOpen(false)}
        onUpdated={() => void loadOverview()}
      />
    </div>
  );
}
