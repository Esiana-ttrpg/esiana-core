import { Link } from 'react-router-dom';
import {
  Clock,
  Map,
  ScrollText,
  Swords,
  Users,
} from 'lucide-react';
import { campaignPath } from '@/lib/campaignPaths';
import {
  SURFACE_CONTEXTUAL_INLINE_CLASS,
  SURFACE_FLOAT_CLASS,
  TYPE_META_CLASS,
} from '@/lib/surfaceLayout';

interface CampaignContextRailProps {
  campaignHandle: string;
  /** Inline rails sit flush on the canvas edge without card chrome */
  layout?: 'inline' | 'elevated';
}

const QUICK_LINKS = [
  { label: 'Adventure', segment: 'adventures', icon: Swords },
  { label: 'Party', segment: 'party', icon: Users },
  { label: 'Threads', segment: 'threads', icon: ScrollText },
  { label: 'Timeline', segment: 'chronology', icon: Clock },
  { label: 'Maps', segment: 'maps', icon: Map },
] as const;

export function CampaignContextRail({
  campaignHandle,
  layout = 'inline',
}: CampaignContextRailProps) {
  const surfaceClass =
    layout === 'inline' ? SURFACE_CONTEXTUAL_INLINE_CLASS : SURFACE_FLOAT_CLASS;

  return (
    <aside
      className={`${surfaceClass} flex flex-col overflow-hidden`}
      aria-label="Campaign quick links"
    >
      <header className="shrink-0 px-3 py-2">
        <h2 className="text-sm font-semibold text-contextual-foreground/85">Explore</h2>
        <p className={`${TYPE_META_CLASS} normal-case tracking-normal text-recessed-foreground`}>
          Jump to campaign surfaces
        </p>
      </header>
      <nav className="flex flex-wrap gap-2 px-3 pb-3" aria-label="Quick links">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.label}
              to={campaignPath(campaignHandle, link.segment)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/30 bg-focal/40 px-3 py-1.5 text-xs font-medium text-contextual-foreground/90 transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Icon className="size-3.5 shrink-0 opacity-70" aria-hidden />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
