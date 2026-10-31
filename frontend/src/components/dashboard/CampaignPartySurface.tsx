import { useDashboardPreviewLimit } from './DashboardWidgetShell';
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
  const previewLimit = useDashboardPreviewLimit(6);
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
          className={`${REGION_DEPTH_3_CLASS} rounded-lg px-2 py-3`}
        >
          <p className={`${TYPE_PROSE_CLASS} text-prose-muted`}>
            Your party characters will appear here.
          </p>
          <Link to={roster.href} className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            Open Characters
          </Link>
        </div>
      ) : (
        <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
          {roster.members.slice(0, previewLimit).map((member) => (
            <Link
              key={member.id}
              to={member.href}
              className={`${REGION_DEPTH_3_CLASS} flex min-w-0 items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-focal-elevated`}
            >
              <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-elevated text-sm text-muted" aria-hidden>
                {member.title.slice(0, 1)}
                {member.portraitUrl ? <img src={member.portraitUrl} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : null}
              </span>
              <div className="min-w-0"><p className="break-words font-semibold leading-snug text-focal-foreground">{member.title}</p>
              {member.tagline ? (
                <p className={`${TYPE_META_CLASS} mt-1.5 line-clamp-2 normal-case tracking-normal text-recessed-foreground`}>
                  {member.tagline}
                </p>
              ) : null}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
