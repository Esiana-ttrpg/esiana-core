import { ChevronDown, CornerUpLeft, Save } from 'lucide-react';
import type { WorkshopFormalizeTarget } from '@shared/workshopDocument';
import { WORKSHOP_FORMALIZE_UI_GROUPS } from '@shared/workshopFormalize';
import { WORKSHOP_CREATE_TARGETS } from '@/lib/authoringEligibility';

const CREATE_GROUP_LABELS: Record<string, string> = {
  world: 'World',
  narrative: 'Narrative',
  reference: 'Reference',
  general: 'General',
};

interface WorkshopPageToolbarProps {
  canApply: boolean;
  canReturn: boolean;
  returnLabel?: string;
  onReturn: () => void;
  onApply: () => void;
  onCreate: (target: WorkshopFormalizeTarget | 'blank') => void;
  onFormalize?: () => void;
  busy?: boolean;
}

export function WorkshopPageToolbar({
  canApply,
  canReturn,
  returnLabel = 'Return to page',
  onReturn,
  onApply,
  onCreate,
  onFormalize,
  busy = false,
}: WorkshopPageToolbarProps) {
  const groupedCreate = [
    ...WORKSHOP_FORMALIZE_UI_GROUPS.map((group) => ({
      id: group.id,
      label: group.label,
      items: WORKSHOP_CREATE_TARGETS.filter((item) => item.group === group.id),
    })),
    {
      id: 'general' as const,
      label: CREATE_GROUP_LABELS.general!,
      items: WORKSHOP_CREATE_TARGETS.filter((item) => item.group === 'general'),
    },
  ].filter((section) => section.items.length > 0);

  return (
    <div
      className="flex flex-wrap items-center justify-end gap-1 border-b border-border/30 pb-2"
      role="toolbar"
      aria-label="Workshop tools"
    >
      {canReturn ? (
        <button
          type="button"
          onClick={onReturn}
          disabled={busy}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-transparent px-2 text-xs font-medium text-muted hover:bg-surface/60 hover:text-foreground"
        >
          <CornerUpLeft className="size-3.5" aria-hidden />
          <span>{returnLabel}</span>
        </button>
      ) : null}

      {canApply ? (
        <button
          type="button"
          onClick={onApply}
          disabled={busy}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-transparent px-2 text-xs font-medium text-muted hover:bg-surface/60 hover:text-foreground disabled:opacity-50"
        >
          <Save className="size-3.5" aria-hidden />
          <span>Save</span>
        </button>
      ) : null}

      <div className="relative group">
        <button
          type="button"
          disabled={busy}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-transparent px-2 text-xs font-medium text-muted hover:bg-surface/60 hover:text-foreground"
        >
          Create
          <ChevronDown className="size-3" aria-hidden />
        </button>
        <div className="absolute right-0 top-full z-20 hidden max-h-[min(24rem,70vh)] min-w-[12rem] overflow-y-auto rounded-lg border border-border bg-surface py-1 text-xs shadow-lg group-focus-within:block group-hover:block">
          {groupedCreate.map((section) => (
            <div key={section.id}>
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {section.label}
              </div>
              {section.items.map((item) => (
                <button
                  key={item.target}
                  type="button"
                  className="block w-full px-3 py-1.5 text-left hover:bg-elevated/60"
                  onClick={() => onCreate(item.target)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {onFormalize ? (
        <button
          type="button"
          onClick={onFormalize}
          disabled={busy}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2 text-xs font-medium hover:border-primary/50"
        >
          Save As
        </button>
      ) : null}
    </div>
  );
}
