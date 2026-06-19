import { useState } from 'react';
import { FieldLabel } from '@/components/admin/AdminSectionCard';
import { controlClasses } from '@/components/admin/adminFormStyles';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

export function InstallFromManifestModal({
  open,
  installing,
  error,
  onClose,
  onInstall,
}: {
  open: boolean;
  installing: boolean;
  error: string | null;
  onClose: () => void;
  onInstall: (url: string) => void;
}) {
  const [url, setUrl] = useState('');
  useBodyScrollLock(open);

  if (!open) return null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onInstall(url);
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 bg-black/40"
        aria-label="Close install from URL"
        onClick={onClose}
      />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-label="Install from manifest URL"
      >
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-sm font-semibold text-foreground">Install from URL</h2>
          <p className="mt-1 text-xs text-muted">
            Paste a raw JSON manifest URL. The server fetches and validates the manifest
            securely.
          </p>
          <div className="mt-4">
            <FieldLabel>Manifest URL</FieldLabel>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://raw.githubusercontent.com/org/repo/main/plugin.json"
              className={controlClasses}
              autoFocus
            />
          </div>
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-elevated"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={installing}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background hover:bg-primary-hover disabled:opacity-60"
            >
              {installing ? 'Installing…' : 'Install'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
