import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';

export interface WorkspaceCreateAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface WorkspaceCreateMenu {
  label: string;
  actions: readonly WorkspaceCreateAction[];
}

export interface WorkspaceActionBarProps {
  /** Optional compact context for collection workspaces. */
  title?: ReactNode;
  audience?: ReactNode;
  resultHint?: string | null;
  refine?: ReactNode;
  sort?: ReactNode;
  view?: ReactNode;
  mode?: ReactNode;
  trailing?: ReactNode;
  create?: WorkspaceCreateAction | WorkspaceCreateMenu | ReactNode | null;
}

export const WORKSPACE_CREATE_BUTTON_CLASS =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-primary/30 bg-elevated/50 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:border-primary/50 hover:bg-primary/10';

function CreateMenu({ label, actions }: WorkspaceCreateMenu) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function dismissOutside(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }
    function dismissEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('keydown', dismissEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('keydown', dismissEscape);
    };
  }, [open]);

  if (!actions.length) return null;
  return (
    <div ref={root} className="relative shrink-0">
      <button ref={trigger} type="button" className={WORKSPACE_CREATE_BUTTON_CLASS}
        aria-expanded={open} onClick={() => setOpen(value => !value)}>
        <Plus className="size-4" aria-hidden />{label}
      </button>
      {open ? (
        <div role="group" aria-label={label}
          className="absolute right-0 z-50 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-elevated py-1 shadow-lg">
          {actions.map((action, index) => (
            <button key={`${action.label}-${index}`} type="button" disabled={action.disabled}
              className="block w-full px-4 py-2 text-left text-sm text-foreground hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => { setOpen(false); action.onClick(); }}>
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function renderCreateSlot(create: WorkspaceActionBarProps['create']): ReactNode {
  if (create === null || create === undefined) return null;
  if (typeof create === 'object' && 'label' in create && 'actions' in create && Array.isArray(create.actions)) {
    return create.actions.length ? <CreateMenu {...(create as WorkspaceCreateMenu)} /> : null;
  }
  if (typeof create === 'object' && create !== null && 'label' in create && 'onClick' in create) {
    const action = create as WorkspaceCreateAction;
    return (
      <button type="button" onClick={action.onClick} disabled={action.disabled} className={WORKSPACE_CREATE_BUTTON_CLASS}>
        <Plus className="size-4" aria-hidden />
        {action.label}
      </button>
    );
  }
  return create as ReactNode;
}

/** Collection action cluster; callers supply only controls supported by their workspace. */
export function WorkspaceActionBar({
  title,
  audience,
  resultHint,
  refine,
  sort,
  view,
  mode,
  trailing,
  create,
}: WorkspaceActionBarProps) {
  const createNode = renderCreateSlot(create);
  const hasCluster = title || audience || refine || sort || view || mode || trailing || createNode;

  if (!hasCluster && !resultHint) return null;

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
      {title ? <div className="mr-auto min-w-0 text-sm font-medium text-foreground">{title}</div> : null}
      {audience}
      {resultHint ? (
        <span className="mr-1 hidden text-xs text-muted sm:inline">{resultHint}</span>
      ) : null}
      {refine}
      {sort}
      {view}
      {mode}
      {trailing}
      {createNode}
    </div>
  );
}
