import { useEffect, useState } from 'react';
import { fetchWorldActivity } from '@/lib/wikiLoreGraph';

interface WorldActivityViewProps {
  campaignHandle: string;
}

export function WorldActivityView({ campaignHandle }: WorldActivityViewProps) {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchWorldActivity>> | null>(
    null,
  );

  useEffect(() => {
    fetchWorldActivity(campaignHandle, 30).then(setData).catch(() => setData(null));
  }, [campaignHandle]);

  if (!data) {
    return <div className="p-4 text-sm text-muted">Loading world activity…</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <header>
        <h2 className="text-lg font-semibold text-foreground">World activity</h2>
        <p className="text-sm text-muted">
          How your campaign memory grew in the last {data.periodDays} days.
        </p>
      </header>
      <p className="rounded-lg border border-border bg-muted/10 px-4 py-3 text-foreground">
        {data.message}
      </p>
      <dl className="grid grid-cols-3 gap-3 text-center text-sm">
        <div className="rounded border border-border p-3">
          <dt className="text-muted">Pages expanded</dt>
          <dd className="text-xl font-semibold text-foreground">{data.pagesEdited}</dd>
        </div>
        <div className="rounded border border-border p-3">
          <dt className="text-muted">New connections</dt>
          <dd className="text-xl font-semibold text-foreground">{data.linksCreated}</dd>
        </div>
        <div className="rounded border border-border p-3">
          <dt className="text-muted">References resolved</dt>
          <dd className="text-xl font-semibold text-foreground">{data.stubsResolved}</dd>
        </div>
      </dl>
    </div>
  );
}
