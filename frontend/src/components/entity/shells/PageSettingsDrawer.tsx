import { X } from 'lucide-react';
import { DocumentSectionEditor } from '@/components/entity/DocumentSectionEditor';
import { PageTransformSection } from '@/components/entity/PageTransformSection';
import type { PageSettingsDrawerProps } from '@/lib/entityPageShells/types';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

export function PageSettingsDrawer({
  open,
  onClose,
  campaignHandle,
  pageId,
  pageTitle,
  parentId,
  parentChain,
  flatPages,
  pageMetadata,
  pageVisibility,
  onVisibilityChange,
  onParentChange,
  onTreeRefresh,
  pageTags,
  allCampaignTags,
  onPageTagsChange,
  onPageTransformed,
}: PageSettingsDrawerProps) {
  useBodyScrollLock(open);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 bg-black/40"
        aria-label="Close page settings"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-surface shadow-xl"
        role="dialog"
        aria-label="Page settings"
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Page settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted hover:bg-surface/80 hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <DocumentSectionEditor
            campaignHandle={campaignHandle}
            pageId={pageId}
            pageTitle={pageTitle}
            parentId={parentId}
            parentChain={parentChain}
            flatPages={flatPages}
            pageMetadata={pageMetadata}
            pageVisibility={pageVisibility}
            onVisibilityChange={onVisibilityChange}
            onParentChange={onParentChange}
            onTreeRefresh={onTreeRefresh}
            pageTags={pageTags}
            allCampaignTags={allCampaignTags}
            onPageTagsChange={onPageTagsChange}
            tagsSaveHint="Changes save when you close editing."
            transformSection={
              onPageTransformed ? (
                <PageTransformSection
                  campaignHandle={campaignHandle}
                  pageId={pageId}
                  pageTitle={pageTitle}
                  flatPages={flatPages}
                  pageMetadata={pageMetadata}
                  onTransformed={onPageTransformed}
                />
              ) : null
            }
          />
        </div>
      </aside>
    </>
  );
}
