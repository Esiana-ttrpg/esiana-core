import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tag } from 'lucide-react';
import { compileSessionNotes } from '@/lib/wiki';
import { ApiError } from '@/lib/api';
import { useWiki } from '@/contexts/WikiContext';
import { WikiMarkdown } from '@/components/wiki/WikiMarkdown';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function SessionTagNotesPage() {
  const { campaignHandle = '', sessionId = '' } = useParams<{
    campaignHandle: string;
    sessionId: string;
  }>();
  const navigate = useNavigate();
  const { flatPages } = useWiki();
  const sessionPage = flatPages.find((p) => p.id === sessionId);

  const [result, setResult] = useState<Awaited<
    ReturnType<typeof compileSessionNotes>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    compileSessionNotes(campaignHandle, sessionId)
      .then((r) => {
        setResult(r);
        setError(null);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 413) {
          setError('Too many notes to compile for this session.');
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load session');
      })
      .finally(() => setLoading(false));
  }, [campaignHandle, sessionId]);

  if (loading) {
    return <LoadingSpinner label="Loading session notes…" />;
  }

  if (error) {
    return <p className="text-red-300">{error}</p>;
  }

  return (
    <article className="max-w-3xl">
      <header className="mb-6 border-b border-border pb-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Tag className="size-7 text-primary" />
          {sessionPage?.title ?? 'Session'}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Compiled wiki pages linked to this session tag
          {result?.truncated ? ' (output truncated)' : ''}
        </p>
        {result?.warnings && result.warnings.length > 0 && (
          <ul className="mt-3 rounded-lg border border-amber-900/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-200/90">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-3 text-sm text-primary hover:underline"
        >
          Back
        </button>
      </header>
      <WikiMarkdown content={result?.compiledMarkdown ?? ''} />
    </article>
  );
}
