import { FolderPlus } from 'lucide-react';

type Props = {
  menuItem?: boolean;
  characterName: string;
  busy: boolean;
  onAdd: () => void;
};

/** Explicit clone: campaign character → independent portfolio character. */
export function AddToPortfolioButton({ characterName, busy, onAdd, menuItem = false }: Props) {
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        role={menuItem ? 'menuitem' : undefined}
        disabled={busy}
        onClick={onAdd}
        className={menuItem ? "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-foreground hover:bg-surface/80 disabled:opacity-50" : "rounded-md border border-border/60 px-2.5 py-1.5 text-xs text-muted hover:bg-elevated hover:text-foreground disabled:opacity-50"}
        title={`Clone ${characterName} into your Character Portfolio`}
      >
        {menuItem ? <FolderPlus className="size-3.5" /> : null}
        {busy ? 'Adding…' : 'Add to Portfolio'}
      </button>
    </div>
  );
}
