import { useMemo, useState } from 'react';
import { Copy, Download } from 'lucide-react';
import { formatSessionSnapshotMarkdown } from '@/lib/sessionSnapshotFormat';
import { WikiMarkdown } from '@/components/wiki/WikiMarkdown';
import type { CombinedSessionNotesPayload } from '@/types/wiki';

interface SessionSnapshotExporterProps {
  payload: CombinedSessionNotesPayload;
  campaignName: string;
}

export function SessionSnapshotExporter({
  payload,
  campaignName,
}: SessionSnapshotExporterProps) {
  const [copied, setCopied] = useState(false);

  const snapshot = useMemo(
    () => formatSessionSnapshotMarkdown(payload, { campaignName }),
    [payload, campaignName],
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(snapshot.markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.alert('Unable to copy to clipboard.');
    }
  }

  function handleDownload() {
    const blob = new Blob([snapshot.markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${snapshot.title.replace(/[^\w\-]+/g, '_') || 'session'}_snapshot.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Session snapshot</h2>
          <p className="text-sm text-muted">
            Chronological export for reading or sharing (Markdown).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-surface"
          >
            <Copy className="size-4" aria-hidden />
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20"
          >
            <Download className="size-4" aria-hidden />
            Download .md
          </button>
        </div>
      </div>

      {snapshot.warnings.length > 0 && (
        <ul className="rounded-lg border border-amber-900/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-200/90">
          {snapshot.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}

      <div className="rounded-xl border border-border bg-background/60 p-4">
        <div className="prose prose-invert max-w-none">
          <WikiMarkdown content={snapshot.markdown} />
        </div>
      </div>
    </section>
  );
}
