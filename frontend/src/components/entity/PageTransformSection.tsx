import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { META_FIELD_LABEL_CLASS } from '@/lib/surfaceLayout';
import {
  moduleKeyToDisplayLabel,
  resolvePageModuleScope,
  resolvePageSurfaceKey,
} from '@shared/pageModuleScope';
import { getTransformOptions } from '@shared/pageTransform';
import { transformWikiPage, type WikiTransformResult } from '@/lib/wiki';
import type { WikiTreeNode } from '@/types/wiki';

const fieldSelectClass =
  'w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none transition-colors focus:border-primary/60 disabled:opacity-60';

interface PageTransformSectionProps {
  campaignHandle: string;
  pageId: string;
  pageTitle: string;
  flatPages: WikiTreeNode[];
  pageMetadata?: unknown;
  onTransformed: (result: WikiTransformResult) => void | Promise<void>;
}

export function PageTransformSection({
  campaignHandle,
  pageId,
  pageTitle,
  flatPages,
  pageMetadata,
  onTransformed,
}: PageTransformSectionProps) {
  const [targetModule, setTargetModule] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPage = useMemo(
    () =>
      flatPages.find((page) => page.id === pageId) ?? {
        id: pageId,
        title: pageTitle,
        parentId: null,
        templateType: 'DEFAULT',
        metadata: pageMetadata,
      },
    [flatPages, pageId, pageMetadata, pageTitle],
  );

  const moduleScope = useMemo(
    () => resolvePageModuleScope(currentPage, flatPages),
    [currentPage, flatPages],
  );

  const transformOptions = useMemo(
    () => getTransformOptions(resolvePageSurfaceKey(currentPage, flatPages)),
    [currentPage, flatPages],
  );

  if (transformOptions.length === 0) return null;

  const selectedTarget = transformOptions.find(
    (option) => option.moduleKey === targetModule,
  );

  async function handleTransform() {
    if (!targetModule) return;
    const confirmed = window.confirm(
      `Transform "${pageTitle}" from ${moduleKeyToDisplayLabel(moduleScope.moduleKey)} to ${selectedTarget?.label ?? targetModule}? This updates blocks, metadata, and module placement.`,
    );
    if (!confirmed) return;

    setPending(true);
    setError(null);
    try {
      const result = await transformWikiPage(campaignHandle, pageId, targetModule);
      await onTransformed(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to transform page');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2 border-t border-border pt-4">
      <div className="space-y-1">
        <span className={META_FIELD_LABEL_CLASS}>Transform</span>
        <p className="text-[10px] text-muted">
          Move between modules. Current module:{' '}
          {moduleKeyToDisplayLabel(moduleScope.moduleKey)}.
        </p>
      </div>

      <label className="space-y-1">
        <span className="sr-only">Target module</span>
        <select
          value={targetModule}
          onChange={(event) => setTargetModule(event.target.value)}
          disabled={pending}
          className={`${fieldSelectClass} text-xs`}
        >
          <option value="">Choose target…</option>
          {transformOptions.map((option) => (
            <option key={option.moduleKey} value={option.moduleKey}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={() => void handleTransform()}
        disabled={!targetModule || pending}
        className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
        Transform
      </button>

      {error ? (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
