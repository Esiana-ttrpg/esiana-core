import { useEffect, useState } from 'react';
import { fetchThreadHub, updateThreadMetadata } from '@/lib/wiki';

interface AttachToThreadModalProps {
  campaignHandle: string;
  entityPageId: string;
  onClose: () => void;
  onAttached: () => void;
}

export function AttachToThreadModal({
  campaignHandle,
  entityPageId,
  onClose,
  onAttached,
}: AttachToThreadModalProps) {
  const [threads, setThreads] = useState<
    { id: string; title: string; relatedPageIds: string[] }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchThreadHub(campaignHandle)
      .then((hub) => {
        function flatten(
          nodes: typeof hub.threads,
        ): { id: string; title: string; relatedPageIds: string[] }[] {
          const out: { id: string; title: string; relatedPageIds: string[] }[] =
            [];
          for (const n of nodes) {
            out.push({
              id: n.id,
              title: n.title,
              relatedPageIds: n.thread?.relatedPageIds ?? [],
            });
            if (n.children?.length) out.push(...flatten(n.children));
          }
          return out;
        }
        setThreads(flatten(hub.threads ?? []));
      })
      .catch(() => setError('Could not load threads.'))
      .finally(() => setLoading(false));
  }, [campaignHandle]);

  async function attach(threadId: string, existing: string[]) {
    if (existing.includes(entityPageId)) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateThreadMetadata(campaignHandle, threadId, {
        relatedPageIds: [...existing, entityPageId],
      });
      onAttached();
      onClose();
    } catch {
      setError('Failed to attach entity to thread.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="attach-thread-title"
    >
      <div className="max-h-[70vh] w-full max-w-md overflow-hidden rounded-lg border border-border bg-background shadow-xl">
        <header className="border-b border-border px-4 py-3">
          <h2 id="attach-thread-title" className="text-sm font-semibold">
            Attach to thread
          </h2>
          <p className="mt-1 text-xs text-muted">
            Link this entity to an open narrative thread.
          </p>
        </header>
        <div className="max-h-64 overflow-y-auto px-4 py-3">
          {loading ? (
            <p className="text-sm text-muted">Loading threads…</p>
          ) : threads.length === 0 ? (
            <p className="text-sm text-muted">No threads available.</p>
          ) : (
            <ul className="space-y-1">
              {threads.map((thread) => (
                <li key={thread.id}>
                  <button
                    type="button"
                    disabled={saving}
                    className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-elevated/40 disabled:opacity-50"
                    onClick={() =>
                      attach(thread.id, thread.relatedPageIds)
                    }
                  >
                    {thread.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
        </div>
        <footer className="border-t border-border px-4 py-2">
          <button
            type="button"
            className="text-xs text-muted hover:text-foreground"
            onClick={onClose}
          >
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
}
