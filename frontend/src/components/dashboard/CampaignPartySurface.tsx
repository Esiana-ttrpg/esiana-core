import { Link } from 'react-router-dom';
import type { CampaignNarrativeSnapshot } from '@/lib/dashboardNarrativeSnapshot';
import {
  REGION_DEPTH_3_CLASS,
  TYPE_DISPLAY_CLASS,
  TYPE_META_CLASS,
  TYPE_PROSE_CLASS,
} from '@/lib/surfaceLayout';

interface CampaignPartySurfaceProps {
  roster: CampaignNarrativeSnapshot['partyRoster'];
  /** Omit section chrome when rendered inside DashboardWidgetShell */
  embedded?: boolean;
}

export function CampaignPartySurface({ roster, embedded = false }: CampaignPartySurfaceProps) {
  return (
    <div className={embedded ? 'space-y-3' : 'space-y-4'}>
      {!embedded ? (
        <div className="flex items-baseline justify-between gap-3 px-1">
          <h2 className={TYPE_DISPLAY_CLASS}>
            Party
          </h2>
          {roster.members.length > 0 ? (
            <Link to={roster.href} className="text-sm text-primary hover:underline">
              All characters
            </Link>
          ) : null}
        </div>
      ) : roster.members.length > 0 ? (
        <div className="flex justify-end">
          <Link to={roster.href} className="text-xs text-primary hover:underline">
            All characters
          </Link>
        </div>
      ) : null}
      {roster.members.length === 0 ? (
        <div
          className={`${REGION_DEPTH_3_CLASS} rounded-xl border border-dashed border-border/40 px-6 py-8 text-center`}
        >
          <p className={`${TYPE_PROSE_CLASS} text-prose-muted`}>
            {roster.emptyPrompt ?? 'Your fellowship will appear here.'}
          </p>
          <Link to={roster.href} className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            Open Characters
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {roster.members.map((member) => (
            <Link
              key={member.id}
              to={member.href}
              className={`${REGION_DEPTH_3_CLASS} block rounded-xl px-4 py-4 transition-colors hover:bg-focal-elevated`}
            >
              <p className="font-semibold leading-snug text-focal-foreground">{member.title}</p>
              {member.tagline ? (
                <p className={`${TYPE_META_CLASS} mt-1.5 line-clamp-2 normal-case tracking-normal text-recessed-foreground`}>
                  {member.tagline}
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
