import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Layers } from 'lucide-react';
import {
  compileSessionNotes,
  type SessionCompileResult,
} from '@/lib/wiki';
import { ApiError } from '@/lib/api';
import { WikiMarkdown } from '@/components/wiki/WikiMarkdown';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function SessionNotesCompilePage() {
  const { campaignHandle = '' } = useParams<{ campaignHandle: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [result, setResult] = useState<SessionCompileResult | null>(
    (location.state as { compileResult?: SessionCompileResult } | null)
      ?.compileResult ?? null,
  );
  const [loading, setLoading] = useState(!result);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (result) return;
    setLoading(true);
    compileSessionNotes(campaignHandle)
      .then(setResult)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 413) {
          setError('Too many notes to compile at once. Try a smaller scope or ask your DM.');
          return;
        }
        setError(err instanceof Error ? err.message : 'Compile failed');
      })
      .finally(() => setLoading(false));
  }, [campaignHandle, result]);

  if (loading) {
    return <LoadingSpinner label="Compiling session notes…" />;
  }

  if (error || !result) {
    return (
      <p className="text-red-300">{error ?? 'No compiled notes available.'}</p>
    );
  }

  return (
    <article className="max-w-3xl">
      <header className="mb-6 border-b border-border pb-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Layers className="size-7 text-primary" />
          {result.title}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Merged from {result.pageCount} wiki page
          {result.pageCount === 1 ? '' : 's'} under Player Session Notes.
          {result.truncated ? ' (output truncated)' : ''}
        </p>
        {result.warnings && result.warnings.length > 0 && (
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
      <WikiMarkdown content={result.compiledMarkdown} />
    </article>
  );
}
