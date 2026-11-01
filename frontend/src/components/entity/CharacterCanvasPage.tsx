import { useEffect, useRef, useState } from 'react';
import { LayoutGrid, Plus, Save } from 'lucide-react';
import type { CharacterPageDescriptor } from '@shared/characterPages';
import type { WikiPageBlock } from '@/types/wiki';
import { WikiPageRenderer } from '@/components/wiki/WikiPageRenderer';
import { createWikiBlock } from '@/utils/pageTemplates';
import { saveCharacterPageBlocks } from '@/lib/wiki';

interface CharacterCanvasPageProps {
  campaignHandle: string;
  characterPageId: string;
  page: CharacterPageDescriptor;
  canEdit: boolean;
  widgetOptions: Array<{ value: string; label: string; group?: string }>;
  onPageSaved?: (page: CharacterPageDescriptor) => void;
}

export function CharacterCanvasPage({
  campaignHandle,
  characterPageId,
  page,
  canEdit,
  widgetOptions,
  onPageSaved,
}: CharacterCanvasPageProps) {
  const [blocks, setBlocks] = useState<WikiPageBlock[]>((page.blocks ?? []) as unknown as WikiPageBlock[]);
  const [arranging, setArranging] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const editVersionRef = useRef(0);
  useEffect(() => {
    if (dirty) return;
    setBlocks((page.blocks ?? []) as unknown as WikiPageBlock[]);
  }, [dirty, page.id, page.blocks]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const changeBlocks = (updater: WikiPageBlock[] | ((previous: WikiPageBlock[]) => WikiPageBlock[])) => {
    setBlocks((previous) => typeof updater === 'function' ? updater(previous) : updater);
    editVersionRef.current += 1;
    setDirty(true);
  };

  const save = async () => {
    const savingVersion = editVersionRef.current;
    const savingBlocks = blocks;
    setSaving(true);
    setSaveError(null);
    try {
      const savedPage = await saveCharacterPageBlocks(campaignHandle, characterPageId, page.id, savingBlocks);
      onPageSaved?.(savedPage);
      if (editVersionRef.current === savingVersion) setDirty(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save this character page');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-3" aria-label={page.title}>
      {canEdit ? (
        <div className="flex flex-wrap justify-end gap-1" role="toolbar" aria-label={`${page.title} canvas tools`}>
          {page.capabilities.allowAddWidget ? (
            <label className="relative inline-flex h-8 items-center gap-1.5 rounded-md border border-border/50 px-2 text-xs text-muted">
              <Plus className="size-3.5" aria-hidden /> Add Widget
              <select
                value=""
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Add widget"
                onChange={(event) => {
                  if (!event.target.value) return;
                  setBlocks((previous) => [...previous, createWikiBlock(event.target.value as WikiPageBlock['type'], 0, previous.length * 2, 3, 2)]);
                  editVersionRef.current += 1;
                  setDirty(true);
                  event.target.value = '';
                }}
              >
                <option value="">Add widget</option>
                {widgetOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          ) : null}
          {page.capabilities.allowArrange ? (
            <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/50 px-2 text-xs text-muted" onClick={() => setArranging((value) => !value)} aria-pressed={arranging}>
              <LayoutGrid className="size-3.5" aria-hidden /> {arranging ? 'Done arranging' : 'Arrange Blocks'}
            </button>
          ) : null}
          <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2 text-xs text-primary disabled:opacity-40" disabled={!dirty || saving} onClick={() => void save()}>
            <Save className="size-3.5" aria-hidden /> Save
          </button>
        </div>
      ) : null}
      {saveError ? <p className="text-sm text-destructive" role="alert">{saveError}</p> : null}
      <WikiPageRenderer
        blocks={blocks}
        templateType="DEFAULT"
        isEditingPage={canEdit}
        showGridLines={arranging}
        onShowGridLinesChange={setArranging}
        onBlocksChange={changeBlocks}
        isDirty={dirty}
        isSaving={saving}
        campaignHandle={campaignHandle}
        pageId={characterPageId}
        surfaceProfileKey={null}
      />
    </section>
  );
}
