import { Link } from 'react-router-dom';
import { AlertTriangle, Check } from 'lucide-react';
import {
  LoreSourceTypeIcon,
  LoreStickySubheader,
} from '@/components/entity/lore/LoreKnowledgeUi';
import type { CalendarEventRecord } from '@/lib/calendarEventsApi';
import { resolveLoreSourceDisplay } from '@/lib/resolveLoreSourceDisplay';
import type { LoreClaimSourceRecord } from '@/lib/loreKnowledgeProjection';
import type { LorePageLookup } from '@/lib/resolveLoreSourceDisplay';

type RoleIcon = 'check' | 'warn' | 'dot';

const ROLE_LABELS: Record<LoreClaimSourceRecord['role'], string> = {
  SUPPORTS: 'Supported by',
  CONTRADICTS: 'Contradicted by',
  REFERENCES: 'Referenced in',
};

function RoleGroup({
  sources,
  role,
  icon,
  flatPages,
  events,
  campaignHandle,
}: {
  sources: LoreClaimSourceRecord[];
  role: LoreClaimSourceRecord['role'];
  icon: RoleIcon;
  flatPages: LorePageLookup[];
  events: CalendarEventRecord[];
  campaignHandle: string;
}) {
  const filtered = sources.filter((s) => s.role === role);
  if (filtered.length === 0) return null;

  return (
    <div className="mt-3">
      <LoreStickySubheader badge={`${filtered.length}`}>
        {ROLE_LABELS[role]}
      </LoreStickySubheader>
      <ul className="mt-1.5 space-y-2">
        {filtered.map((source) => {
          const display = resolveLoreSourceDisplay(source, flatPages, events, campaignHandle);
          return (
            <li key={source.id} className="flex gap-2">
              <span className="mt-0.5 shrink-0">
                {icon === 'check' ? (
                  <Check className="size-3.5 text-emerald-600/80" aria-hidden />
                ) : icon === 'warn' ? (
                  <AlertTriangle className="size-3.5 text-amber-600/80" aria-hidden />
                ) : (
                  <span className="inline-block size-2 rounded-full bg-muted-foreground/50" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-1.5">
                  <LoreSourceTypeIcon sourceType={source.sourceType} />
                  {display.href ? (
                    <Link
                      to={display.href}
                      className="text-sm font-medium text-foreground hover:text-primary"
                    >
                      {display.primaryTitle}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-foreground">
                      {display.primaryTitle}
                    </span>
                  )}
                </div>
                {display.secondaryLine ? (
                  <p className="mt-0.5 text-xs text-muted">{display.secondaryLine}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface LoreCitationListProps {
  sources: LoreClaimSourceRecord[];
  flatPages: LorePageLookup[];
  events: CalendarEventRecord[];
  campaignHandle: string;
}

export function LoreCitationList({
  sources,
  flatPages,
  events,
  campaignHandle,
}: LoreCitationListProps) {
  if (sources.length === 0) return null;
  return (
    <div>
      <RoleGroup
        sources={sources}
        role="SUPPORTS"
        icon="check"
        flatPages={flatPages}
        events={events}
        campaignHandle={campaignHandle}
      />
      <RoleGroup
        sources={sources}
        role="CONTRADICTS"
        icon="warn"
        flatPages={flatPages}
        events={events}
        campaignHandle={campaignHandle}
      />
      <RoleGroup
        sources={sources}
        role="REFERENCES"
        icon="dot"
        flatPages={flatPages}
        events={events}
        campaignHandle={campaignHandle}
      />
    </div>
  );
}
