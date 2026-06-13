import { Plus, Trash2 } from 'lucide-react';
import type { LineageLink } from '@/lib/characterLineageMetadata';
import type { WikiTreeNode } from '@/types/wiki';

const fieldClass =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60';

interface LineageLinksEditorProps {
  title: string;
  links: LineageLink[];
  npcPages: WikiTreeNode[];
  onAdd: () => void;
  onUpdate: (linkId: string, patch: Partial<LineageLink>) => void;
  onRemove: (linkId: string) => void;
}

export function LineageLinksEditor({
  title,
  links,
  npcPages,
  onAdd,
  onUpdate,
  onRemove,
}: LineageLinksEditorProps) {
  return (
    <div className="space-y-2 rounded-md border border-border/50 bg-surface/30 p-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          {title}
        </span>
        <button
          type="button"
          onClick={onAdd}
          disabled={npcPages.length === 0}
          className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-[10px] hover:border-primary/40 disabled:opacity-50"
        >
          <Plus className="size-3" />
          Add
        </button>
      </div>
      {links.length === 0 ? (
        <p className="text-[10px] text-muted">None linked.</p>
      ) : null}
      {links.map((link) => (
        <div
          key={link.id}
          className="flex flex-wrap items-center gap-2 rounded border border-border/60 p-2"
        >
          <select
            className={fieldClass}
            value={link.targetCharacterId}
            onChange={(e) => onUpdate(link.id, { targetCharacterId: e.target.value })}
          >
            {npcPages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.title}
              </option>
            ))}
          </select>
          <select
            className={fieldClass}
            value={link.relationshipType}
            onChange={(e) =>
              onUpdate(link.id, {
                relationshipType: e.target.value as LineageLink['relationshipType'],
              })
            }
          >
            <option value="BIOLOGICAL">Biological</option>
            <option value="ADOPTIVE">Adoptive</option>
            <option value="STEP">Step</option>
            <option value="MARRIAGE">Marriage</option>
            <option value="OTHER">Other</option>
          </select>
          <button
            type="button"
            onClick={() => onRemove(link.id)}
            className="ml-auto text-muted hover:text-red-400"
            aria-label="Remove link"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
