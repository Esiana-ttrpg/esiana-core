import { Link } from 'react-router-dom';
import type { CreativeDriftReawakenedItem } from '@shared/creativeDrift';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import {
  UNRESOLVED_REAWAKENED_DESCRIPTION,
  UNRESOLVED_REAWAKENED_TITLE,
} from '@/lib/unresolvedCopy';

interface CreativeDriftReawakenedStripProps {
  campaignHandle: string;
  items: CreativeDriftReawakenedItem[];
}

export function CreativeDriftReawakenedStrip({
  campaignHandle,
  items,
}: CreativeDriftReawakenedStripProps) {
  const { flatPages } = useWiki();

  if (items.length === 0) return null;

  return (
    <section className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
      <h2 className="text-sm font-semibold text-primary/90">
        {UNRESOLVED_REAWAKENED_TITLE}
      </h2>
      <p className="mt-1 text-xs text-muted">
        {UNRESOLVED_REAWAKENED_DESCRIPTION}
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.fingerprint} className="text-sm">
            <Link
              to={campaignWikiPath(campaignHandle, item.subjectId, flatPages)}
              className="font-medium text-foreground hover:text-primary"
            >
              {item.title}
            </Link>
            <span className="ml-2 text-xs text-primary/80">
              {item.reactivationCopy}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
