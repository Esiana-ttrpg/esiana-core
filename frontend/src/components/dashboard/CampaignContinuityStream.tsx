import { Link } from 'react-router-dom';
import { Calendar, Flame, ScrollText } from 'lucide-react';
import type { DashboardSummary } from '@/lib/dashboardSummary';
import type { DashboardQuestPage } from '@/lib/dashboardConfig';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import { RecentEntityFeed } from '@/components/dashboard/widgets/RecentEntityFeed';
import { WorldPressureForecastContent } from '@/components/dashboard/WorldPressureForecastContent';
import {
  CANVAS_RECESS_CLASS,
  REGION_DEPTH_3_CLASS,
  SECTION_GAP_CLASS,
  TYPE_META_CLASS,
  TYPE_PROSE_CLASS,
} from '@/lib/surfaceLayout';

interface CampaignContinuityStreamProps {
  /** When true, omits outer focal surface — parent owns the workspace field */
  embedded?: boolean;
  campaignHandle: string;
  summary: DashboardSummary;
  questPages: DashboardQuestPage[];
}

function ContinuitySection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className={`${TYPE_META_CLASS} flex items-center gap-1.5 font-semibold uppercase tracking-wider text-focal-muted`}>
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

export function CampaignContinuityStream({
  embedded = false,
  campaignHandle,
  summary,
  questPages,
}: CampaignContinuityStreamProps) {
  const { flatPages } = useWiki();
  const recentItems = summary.recent.items.slice(0, 6);
  const openQuests = questPages
    .filter((q) => q.questStatus !== 'COMPLETED' && q.questStatus !== 'ABANDONED')
    .slice(0, 4);
  const containerClass = embedded
    ? `${CANVAS_RECESS_CLASS} flex flex-col ${SECTION_GAP_CLASS}`
    : `wiki-focal-region wiki-focal-region--canvas flex flex-col ${SECTION_GAP_CLASS}`;

  const preview = summary.worldPressurePreview;
  const forecastSectionTitle =
    preview?.paused === false &&
    summary.nextSession != null &&
    preview.projectedByNextSession != null
      ? 'Upcoming session pressure'
      : 'World pressure forecast';

  return (
    <div className={containerClass}>
      {summary.campaignPulse.lines.length > 0 ? (
        <ContinuitySection
          title="Since your last visit"
          icon={<Flame className="size-3.5 text-primary" aria-hidden />}
        >
          <ul className={`${TYPE_PROSE_CLASS} space-y-1.5 text-sm text-focal-foreground`}>
            {summary.campaignPulse.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </ContinuitySection>
      ) : null}

      <ContinuitySection
        title="Recent continuity"
        icon={<ScrollText className="size-3.5 text-primary" aria-hidden />}
      >
        <RecentEntityFeed
          items={recentItems}
          showReason
          tone="focal"
          emptyMessage="Your chronicle is quiet — lore updates and session notes will appear here."
        />
      </ContinuitySection>

      {preview ? (
        <ContinuitySection
          title={forecastSectionTitle}
          icon={<Calendar className="size-3.5 text-primary" aria-hidden />}
        >
          <WorldPressureForecastContent
            campaignHandle={campaignHandle}
            preview={preview}
            nextSession={summary.nextSession}
            nextSessionInDays={summary.campaignPulse.nextSessionInDays}
            tone="focal"
          />
        </ContinuitySection>
      ) : null}

      {openQuests.length > 0 ? (
        <ContinuitySection
          title="Active tensions"
          icon={<Flame className="size-3.5 text-amber-600" aria-hidden />}
        >
          <ul className="space-y-2">
            {openQuests.map((quest) => (
              <li key={quest.id}>
                <Link
                  to={campaignWikiPath(campaignHandle, quest.id, flatPages)}
                  className={`${TYPE_PROSE_CLASS} ${REGION_DEPTH_3_CLASS} block rounded-md px-3 py-2 text-sm text-focal-foreground transition-colors hover:bg-focal-elevated`}
                >
                  {quest.title}
                </Link>
              </li>
            ))}
          </ul>
        </ContinuitySection>
      ) : null}
    </div>
  );
}
