import type { WorkshopDocument } from '@shared/workshopDocument';
import type { WorkshopTabSaveState } from '@/lib/workspacePersistence';
import { workshopTabLabel } from '@/lib/workshopFieldSchema';

function laneDot(state: WorkshopTabSaveState['prose'], title: string): string {
  if (state === 'saving') return '○';
  if (state === 'saved') return '●';
  if (state === 'error') return '!';
  return '·';
}

interface WorkshopDocumentTabsProps {
  drafts: WorkshopDocument[];
  activeDraftId: string | null;
  tabSaveStates: Record<string, WorkshopTabSaveState>;
  anchorTitles: Record<string, string>;
  flatPages: import('@/types/wiki').WikiTreeNode[];
  onSelect: (draftId: string) => void;
  onClose: (draftId: string) => void;
  onAdd: () => void;
}

export function WorkshopDocumentTabs({
  drafts,
  activeDraftId,
  tabSaveStates,
  anchorTitles,
  flatPages,
  onSelect,
  onClose,
  onAdd,
}: WorkshopDocumentTabsProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-border/40 pb-1">
      {drafts.map((draft) => {
        const save = tabSaveStates[draft.id] ?? { prose: 'idle', fields: 'idle' };
        const anchorTitle = draft.anchorEntityIds?.[0]
          ? anchorTitles[draft.anchorEntityIds[0]]
          : undefined;
        const label = workshopTabLabel(draft, anchorTitle, flatPages);
        const active = draft.id === activeDraftId;
        return (
          <div
            key={draft.id}
            className={`flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs ${
              active
                ? 'border-primary/40 bg-primary/10 text-foreground'
                : 'border-border/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <button type="button" onClick={() => onSelect(draft.id)} className="max-w-[10rem] truncate">
              {label}
            </button>
            <span className="font-mono text-[10px] text-muted-foreground" title="Prose / Fields save">
              {laneDot(save.prose, 'prose')}
              {laneDot(save.fields, 'fields')}
            </span>
            <button
              type="button"
              onClick={() => onClose(draft.id)}
              className="text-muted-foreground hover:text-foreground"
              aria-label={`Close ${label}`}
            >
              ×
            </button>
          </div>
        );
      })}
      <button
        type="button"
        onClick={onAdd}
        className="shrink-0 rounded-md border border-dashed border-border/60 px-2 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary"
      >
        +
      </button>
    </div>
  );
}
