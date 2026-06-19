import { useRef, useState } from 'react';
import {
  previewCreatePageMarkdownImport,
  type CreatePageImportPreviewResult,
} from '@/lib/createPageMarkdownImport';

type ImportMenuState = 'idle' | 'parsing' | 'confirm';

interface CreateImportMenuProps {
  campaignHandle: string;
  categoryTitle: string;
  disabled?: boolean;
  onApply: (result: CreatePageImportPreviewResult) => void;
}

export function CreateImportMenu({
  campaignHandle,
  categoryTitle,
  disabled = false,
  onApply,
}: CreateImportMenuProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ImportMenuState>('idle');
  const [pending, setPending] = useState<CreatePageImportPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setState('idle');
    setPending(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    const name = file.name.toLowerCase();
    if (!name.endsWith('.md')) {
      setError('Only .md files are supported.');
      reset();
      return;
    }

    setError(null);
    setState('parsing');
    setPending(null);

    try {
      const markdown = await file.text();
      const result = await previewCreatePageMarkdownImport(campaignHandle, {
        markdown,
        categoryTitle,
        filename: file.name,
      });
      setPending(result);
      setState('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to parse markdown file.');
      setState('idle');
    }
  }

  function handleApply() {
    if (!pending) return;
    onApply(pending);
    reset();
  }

  function handleCancel() {
    reset();
  }

  const importDisabled = disabled || state === 'parsing';

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept=".md,text/markdown"
        className="hidden"
        onChange={handleFileChange}
        disabled={importDisabled}
      />
      <button
        type="button"
        disabled={importDisabled}
        onClick={() => inputRef.current?.click()}
        className="rounded-lg border border-border bg-elevated px-3 py-1.5 text-sm text-foreground hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === 'parsing' ? 'Parsing…' : 'Import'}
      </button>

      {error ? (
        <p className="absolute right-0 top-full z-10 mt-1 w-56 rounded-lg border border-red-900/60 bg-red-950/80 px-2 py-1 text-xs text-red-200">
          {error}
        </p>
      ) : null}

      {state === 'confirm' && pending ? (
        <div
          role="dialog"
          aria-label="Apply markdown import"
          className="absolute right-0 top-full z-20 mt-2 w-72 rounded-lg border border-border bg-surface p-3 shadow-lg"
        >
          <p className="text-sm font-medium text-foreground">Apply to form?</p>
          <dl className="mt-2 space-y-1 text-xs text-muted">
            <div>
              <dt className="inline font-medium text-foreground">Title: </dt>
              <dd className="inline">{pending.prefill.title || '(empty)'}</dd>
            </div>
            {pending.prefill.tags.length > 0 ? (
              <div>
                <dt className="inline font-medium text-foreground">Tags: </dt>
                <dd className="inline">{pending.prefill.tags.length}</dd>
              </div>
            ) : null}
            {pending.prefill.visibility ? (
              <div>
                <dt className="inline font-medium text-foreground">Visibility: </dt>
                <dd className="inline">{pending.prefill.visibility}</dd>
              </div>
            ) : null}
            {pending.warnings.length > 0 ? (
              <div>
                <dt className="inline font-medium text-amber-300">Warnings: </dt>
                <dd className="inline">{pending.warnings.length}</dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleApply}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-background hover:bg-primary-hover"
            >
              Apply to form
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-border bg-elevated px-3 py-1.5 text-xs text-foreground hover:bg-background"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
