import { Link } from 'react-router-dom';
import type { PartyQuestPursuit } from '@/lib/buildPartyProjection';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';

interface PartyPursuitsStripProps {
  pursuits: PartyQuestPursuit[];
  campaignHandle: string;
}

export function PartyPursuitsStrip({ pursuits, campaignHandle }: PartyPursuitsStripProps) {
  const { flatPages } = useWiki();

  if (pursuits.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="font-serif text-lg font-semibold text-foreground">Current pursuits</h2>
      <ul className="space-y-2">
        {pursuits.map((quest) => (
          <li key={quest.id}>
            <Link
              to={campaignWikiPath(campaignHandle, quest.id, flatPages)}
              className="group block rounded-lg border border-transparent px-1 py-1 transition-colors hover:border-border/60 hover:bg-surface/40"
            >
              <span className="font-medium text-foreground group-hover:text-primary">
                {quest.title}
              </span>
              <span className="ml-2 text-xs uppercase tracking-wide text-muted">
                {quest.statusLabel}
              </span>
              {quest.snippet ? (
                <p className="mt-0.5 line-clamp-2 text-sm text-muted">{quest.snippet}</p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
