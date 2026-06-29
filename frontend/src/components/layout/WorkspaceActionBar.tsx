import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';

export interface WorkspaceCreateAction {
  label: string;
  onClick: () => void;
}

interface WorkspaceActionBarProps {
  resultHint?: string | null;
  refine?: ReactNode;
  sort?: ReactNode;
  view?: ReactNode;
  mode?: ReactNode;
  trailing?: ReactNode;
  create?: WorkspaceCreateAction | ReactNode | null;
}

export const WORKSPACE_CREATE_BUTTON_CLASS =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-primary/30 bg-elevated/50 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:border-primary/50 hover:bg-primary/10';

function renderCreateSlot(create: WorkspaceActionBarProps['create']): ReactNode {
  if (create === null || create === undefined) return null;
  if (typeof create === 'object' && create !== null && 'label' in create && 'onClick' in create) {
    const action = create as WorkspaceCreateAction;
    return (
      <button type="button" onClick={action.onClick} className={WORKSPACE_CREATE_BUTTON_CLASS}>
        <Plus className="size-4" aria-hidden />
        {action.label}
      </button>
    );
  }
  return create;
}

/** Fixed-slot action cluster — Refine · Sort · View · Mode · trailing · Create */
export function WorkspaceActionBar({
  resultHint,
  refine,
  sort,
  view,
  mode,
  trailing,
  create,
}: WorkspaceActionBarProps) {
  const createNode = renderCreateSlot(create);
  const hasCluster = refine || sort || view || mode || trailing || createNode;

  if (!hasCluster && !resultHint) return null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
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
