import { Link } from 'react-router-dom';
import type { CampaignNarrativeSnapshot } from '@/lib/dashboardNarrativeSnapshot';
import { META_SECTION_LABEL_CLASS, SURFACE_FLOAT_CLASS, TYPE_DISPLAY_CLASS, TYPE_META_CLASS, TYPE_PROSE_CLASS } from '@/lib/surfaceLayout';

interface CampaignStateCardProps {
  campaignState: CampaignNarrativeSnapshot['campaignState'];
  /** Omit section chrome when rendered inside DashboardWidgetShell */
  embedded?: boolean;
}

function StateFact({
  fact,
}: {
  fact: {
    label: string;
    value: string;
    href?: string | null;
    emptyPrompt?: string | null;
  };
}) {
  const isEmpty = Boolean(fact.emptyPrompt);
  const content = (
    <div className="space-y-1">
      <p className={META_SECTION_LABEL_CLASS}>
        {fact.label}
      </p>
      <p
        className={`${TYPE_PROSE_CLASS} text-base font-medium leading-snug text-focal-foreground sm:text-lg ${
          isEmpty ? 'text-focal-muted' : ''
        }`}
      >
        {fact.value}
      </p>
      {fact.emptyPrompt ? (
        <p className={`${TYPE_META_CLASS} normal-case tracking-normal text-recessed-foreground`}>
          {fact.emptyPrompt}
        </p>
      ) : null}
    </div>
  );

  if (fact.href) {
    return (
      <Link
        to={fact.href}
        className="block rounded-lg p-4 transition-colors hover:bg-focal-elevated/60"
      >
        {content}
      </Link>
    );
  }
  return <div className="p-4">{content}</div>;
}

export function CampaignStateCard({ campaignState, embedded = false }: CampaignStateCardProps) {
  const facts = [
    campaignState.calendarDate,
    campaignState.nextSession,
    campaignState.partySummary,
    campaignState.location,
  ];

  const factGrid = (
    <div className="grid gap-0 sm:grid-cols-2">
      {facts.map((fact) => (
        <StateFact key={fact.label} fact={fact} />
      ))}
    </div>
  );

  if (embedded) return factGrid;

  return (
    <div className={`${SURFACE_FLOAT_CLASS} region-depth-2 overflow-hidden rounded-xl`}>
      <div className="border-b border-border/20 px-6 py-4 sm:px-8">
        <h2 className={TYPE_DISPLAY_CLASS}>
          Campaign at a Glance
        </h2>
      </div>
      {factGrid}
    </div>
  );
}
