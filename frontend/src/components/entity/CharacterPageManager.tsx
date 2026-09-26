import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Trash2, X } from 'lucide-react';
import type { CharacterPageDescriptor, PluginPageRemovalMode } from '@shared/characterPages';
import {
  deleteCustomCharacterPage,
  duplicateCharacterPageToCustom,
  patchCharacterPage,
  removePluginCharacterPage,
  reorderCharacterPages,
} from '@/lib/wiki';

interface CharacterPageManagerProps {
  campaignHandle: string;
  characterPageId: string;
  pages: CharacterPageDescriptor[];
  onPagesChange: (pages: CharacterPageDescriptor[]) => void;
  onClose: () => void;
}

export function CharacterPageManager({
  campaignHandle,
  characterPageId,
  pages,
  onPagesChange,
  onClose,
}: CharacterPageManagerProps) {
  const ordered = [...pages].sort((a, b) => a.displayOrder - b.displayOrder);

  const move = async (index: number, delta: number) => {
    const target = index + delta;
    if (index === 0 || target <= 0 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target]!, next[index]!];
    const normalized = next.map((page, position) => ({ ...page, displayOrder: position * 10 }));
    onPagesChange(normalized);
    await reorderCharacterPages(campaignHandle, characterPageId, normalized.map((page) => page.key));
  };

  const rename = async (page: CharacterPageDescriptor) => {
    const title = window.prompt('Page name', page.title)?.trim();
    if (!title || title === page.title) return;
    const updated = await patchCharacterPage(campaignHandle, characterPageId, page.id, { title });
    onPagesChange(pages.map((item) => item.id === page.id ? updated : item));
  };

  const removePlugin = async (page: CharacterPageDescriptor) => {
    const answer = window.prompt(
      'Remove plugin page: enter KEEP to retain data, CONVERT for a custom canvas, or DELETE to permanently remove page data.',
      'KEEP',
    )?.trim().toUpperCase();
    const modes: Record<string, PluginPageRemovalMode> = {
      KEEP: 'RETAIN_DATA',
      CONVERT: 'CONVERT_TO_CUSTOM',
      DELETE: 'DELETE_DATA',
    };
    const mode = answer ? modes[answer] : undefined;
    if (!mode) return;
    if (mode === 'DELETE_DATA' && !window.confirm('Permanently delete this character’s plugin page and all associated plugin data?')) return;
    if (mode === 'CONVERT_TO_CUSTOM' && page.renderMode === 'PLUGIN' && !window.confirm('This purpose-built plugin renderer cannot be copied to the generic canvas. Only portable Esiana content will remain; opaque plugin data will be retained separately. Continue?')) return;
    await removePluginCharacterPage(campaignHandle, characterPageId, page.id, mode);
    if (mode === 'CONVERT_TO_CUSTOM') {
      onPagesChange(pages.map((item) => item.id === page.id ? {
        ...item,
        key: `custom:${item.id}`,
        origin: 'CUSTOM',
        renderMode: 'CANVAS',
        pluginId: undefined,
        sourceKey: undefined,
        renderer: undefined,
        providerState: undefined,
        capabilities: {
          ...item.capabilities,
          canRename: true,
          canDelete: true,
          allowAddWidget: true,
          allowArrange: true,
        },
      } : item));
    } else {
      onPagesChange(pages.filter((item) => item.id !== page.id));
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="manage-character-pages-title">
      <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-surface p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="manage-character-pages-title" className="text-lg font-semibold text-foreground">Manage pages</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted hover:text-foreground" aria-label="Close manage pages"><X className="size-4" /></button>
        </div>
        <div className="space-y-1">
          {ordered.map((page, index) => (
            <div key={page.key} className="flex items-center gap-2 rounded-lg border border-border/40 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{page.title}</p>
                <p className="text-xs text-muted">{page.origin.toLowerCase()} · {page.renderMode.toLowerCase()}</p>
              </div>
              {page.capabilities.canRename ? <button type="button" className="text-xs text-muted hover:text-foreground" onClick={() => void rename(page)}>Rename</button> : null}
              {page.capabilities.canHide ? (
                <button type="button" className="rounded p-1 text-muted hover:text-foreground" aria-label={page.hidden ? `Show ${page.title}` : `Hide ${page.title}`} onClick={() => void patchCharacterPage(campaignHandle, characterPageId, page.id, { hidden: !page.hidden }).then((updated) => onPagesChange(pages.map((item) => item.id === page.id ? updated : item)))}>
                  {page.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </button>
              ) : null}
              {page.capabilities.canReorder ? (
                <>
                  <button type="button" className="rounded p-1 text-muted disabled:opacity-30" disabled={index <= 1} onClick={() => void move(index, -1)} aria-label={`Move ${page.title} earlier`}><ArrowUp className="size-4" /></button>
                  <button type="button" className="rounded p-1 text-muted disabled:opacity-30" disabled={index === ordered.length - 1} onClick={() => void move(index, 1)} aria-label={`Move ${page.title} later`}><ArrowDown className="size-4" /></button>
                </>
              ) : null}
              {page.origin === 'PLUGIN' && !page.id.startsWith('virtual:') ? <button type="button" className="text-xs text-muted hover:text-destructive" onClick={() => void removePlugin(page)}>Remove</button> : null}
              {page.origin !== 'CORE' && !page.id.startsWith('virtual:') ? <button type="button" className="rounded p-1 text-muted hover:text-foreground" aria-label={`Duplicate ${page.title} into a custom page`} onClick={() => void duplicateCharacterPageToCustom(campaignHandle, characterPageId, page.id).then((result) => {
                if (result.conversion.omitted.length > 0) window.alert(`Not copied: ${result.conversion.omitted.join(', ')}`);
                onPagesChange([...pages, result.page]);
              })}><Copy className="size-4" /></button> : null}
              {page.capabilities.canDelete ? (
                <button type="button" className="rounded p-1 text-muted hover:text-destructive" aria-label={`Delete ${page.title}`} onClick={() => {
                  if (!window.confirm(`Delete ${page.title}?`)) return;
                  void deleteCustomCharacterPage(campaignHandle, characterPageId, page.id).then(() => onPagesChange(pages.filter((item) => item.id !== page.id)));
                }}><Trash2 className="size-4" /></button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
