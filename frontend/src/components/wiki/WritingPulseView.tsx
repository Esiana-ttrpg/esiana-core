import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchWritingPulse } from '@/lib/wikiLoreGraph';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';

interface WritingPulseViewProps {
  campaignHandle: string;
}

export function WritingPulseView({ campaignHandle }: WritingPulseViewProps) {
  const { flatPages } = useWiki();
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchWritingPulse>> | null>(
    null,
  );

  useEffect(() => {
    fetchWritingPulse(campaignHandle, 30).then(setData).catch(() => setData(null));
  }, [campaignHandle]);

  if (!data) {
    return <div className="p-4 text-sm text-muted">Loading your writing pulse…</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <header>
        <h2 className="text-lg font-semibold text-foreground">Writing pulse</h2>
        <p className="text-sm text-muted">
          Private reflection on your lore cadence — not shared or ranked.
        </p>
      </header>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded border border-border p-3">
          <dt className="text-muted">Your edits (30d)</dt>
          <dd className="text-xl font-semibold">{data.pagesEdited}</dd>
        </div>
        <div className="rounded border border-border p-3">
          <dt className="text-muted">Words in touched pages</dt>
          <dd className="text-xl font-semibold">{data.totalWordsInTouchedPages}</dd>
        </div>
      </dl>
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Recently expanded
        </h3>
        <ul className="mt-2 space-y-1">
          {data.recentlyTouched.map((row) => (
            <li key={row.pageId}>
              <Link
                to={campaignWikiPath(campaignHandle, row.pageId, flatPages)}
                className="text-primary hover:underline"
              >
                {row.title}
              </Link>
              <span className="ml-2 text-xs text-muted">{row.wordCount} words</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
