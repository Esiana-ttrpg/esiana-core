import { GripVertical } from 'lucide-react';
import type { ReactNode } from 'react';
import { SURFACE_FLOAT_CLASS } from '@/lib/surfaceLayout';

interface DashboardWidgetShellProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  customizeMode?: boolean;
  onHide?: () => void;
  dragHandleClass?: string;
  loading?: boolean;
}

export function DashboardWidgetSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-10 rounded-lg bg-elevated/80" />
      ))}
    </div>
  );
}

export function DashboardWidgetShell({
  title,
  icon,
  children,
  customizeMode = false,
  onHide,
  dragHandleClass = 'dashboard-drag-handle',
  loading = false,
}: DashboardWidgetShellProps) {
  return (
    <div className={`${SURFACE_FLOAT_CLASS} flex h-full flex-col p-4`}>
      <header className="mb-3 flex items-center justify-between gap-2 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          {customizeMode && (
            <span
              className={`${dragHandleClass} cursor-grab text-muted hover:text-foreground active:cursor-grabbing`}
              title="Drag widget"
            >
              <GripVertical className="size-4" />
            </span>
          )}
          {icon}
          <h3 className="truncate text-sm font-semibold leading-tight text-foreground">
            {title}
          </h3>
        </div>
        {customizeMode && onHide && (
          <button
            type="button"
            onClick={onHide}
            className="shrink-0 rounded-md border border-border/40 px-2 py-0.5 text-xs text-muted hover:border-border hover:text-foreground"
          >
            Hide
          </button>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        {loading ? <DashboardWidgetSkeleton /> : children}
      </div>
    </div>
  );
}
