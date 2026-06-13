import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import type { DowntimeSimulationSnapshot } from '@/lib/downtime';
import {
  downtimeSectionHref,
  type DowntimeSectionId,
} from '@/lib/downtimeLayout';
import { campaignDowntimeHubPath, campaignProgressionPath } from '@/lib/campaignPaths';
import { DowntimePulseCard } from '@/components/downtime/DowntimePulseCard';
import { DowntimeFeedCardList } from '@/components/downtime/DowntimeFeedCardList';
import { WorldEventNarrativeFeed } from '@/components/downtime/WorldEventNarrativeFeed';

interface DowntimeOverviewSectionProps {
  campaignHandle: string;
  categoryPageId: string;
  snapshot: DowntimeSimulationSnapshot;
}

function sectionLink(campaignHandle: string, section: DowntimeSectionId): string {
  return downtimeSectionHref(campaignDowntimeHubPath(campaignHandle), section);
}

export function DowntimeOverviewSection({
  campaignHandle,
  categoryPageId,
  snapshot,
}: DowntimeOverviewSectionProps) {
  return (
    <div className="flex flex-col gap-8">
      <DowntimePulseCard pulse={snapshot.pulse} />

      {snapshot.factionPressureHint ? (
        <p className="text-sm text-muted-foreground">
          World pressure:{' '}
          <span className="text-foreground">{snapshot.factionPressureHint}</span>
          {' · '}
          <Link
            to={campaignProgressionPath(campaignHandle, 'insights')}
            className="text-primary hover:underline"
          >
            Progression › Trajectories
          </Link>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          <Link
            to={campaignProgressionPath(campaignHandle, 'insights')}
            className="text-primary hover:underline"
          >
            World pressure → Progression › Trajectories
          </Link>
        </p>
      )}

      <section>
        <h2 className="text-base font-semibold text-foreground">Recent consequences</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Unresolved escalations, neglected threads, and ticking pressures.
        </p>
        <div className="mt-4">
          <DowntimeFeedCardList
            cards={snapshot.recentConsequences}
            emptyMessage="Nothing demands immediate attention — for now."
          />
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">Recent world activity</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          What moved in the wider world while the party was elsewhere.
        </p>
        <div className="mt-4">
          <WorldEventNarrativeFeed
            items={snapshot.recentWorldActivity}
            variant="compact"
            emptyMessage="The chronology is quiet — the world waits for time to pass."
          />
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">Active operations</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            to={sectionLink(campaignHandle, 'projects')}
            className="rounded-lg border border-border bg-elevated/20 p-4 transition-colors hover:border-primary/30 hover:bg-primary/5"
          >
            <p className="font-medium text-foreground">Projects</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {snapshot.activeOperationsSummary.projects.count === 0
                ? 'No active projects yet. Long-term operations will appear here when time advances.'
                : `${snapshot.activeOperationsSummary.projects.count} active project(s).`}
            </p>
          </Link>
          <Link
            to={sectionLink(campaignHandle, 'havens')}
            className="rounded-lg border border-border bg-elevated/20 p-4 transition-colors hover:border-primary/30 hover:bg-primary/5"
          >
            <p className="font-medium text-foreground">Havens</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {snapshot.activeOperationsSummary.havens.count === 0
                ? 'No havens registered yet. Operational bases will take shape here.'
                : `${snapshot.activeOperationsSummary.havens.count} haven(s) under watch.`}
            </p>
          </Link>
        </div>
      </section>

      <section className="border-t border-border pt-4">
        <h2 className="text-base font-semibold text-foreground">Current downtime period</h2>
        {snapshot.currentDowntimePeriod ? (
          <div className="mt-3 rounded-lg border border-border bg-elevated/20 p-4">
            <p className="font-medium text-foreground">{snapshot.currentDowntimePeriod.title}</p>
            {snapshot.currentDowntimePeriod.spanLabel ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {snapshot.currentDowntimePeriod.spanLabel}
              </p>
            ) : null}
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {snapshot.currentDowntimePeriod.rollupHeadline}
            </p>
            <Link
              to={snapshot.currentDowntimePeriod.chronologyFeedHref}
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Calendar className="size-3.5" />
              View in campaign chronology
            </Link>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No open downtime span yet — time advances and session chronicle points will define
            periods here.
          </p>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          <span className="text-foreground/80">Campaign now:</span> {snapshot.currentTimeLabel}
        </p>
        {snapshot.elapsedSinceLabel ? (
          <p className="mt-1 text-sm text-muted-foreground">{snapshot.elapsedSinceLabel}</p>
        ) : null}
      </section>
    </div>
  );
}
