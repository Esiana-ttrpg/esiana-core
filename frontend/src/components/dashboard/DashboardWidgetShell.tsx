import { GripVertical } from 'lucide-react';
import { createContext, useContext, type ReactNode } from 'react';
import type { DashboardVariant } from '@shared/dashboardPresentation';
import { SURFACE_FLOAT_CLASS, SURFACE_OPERATIONAL_CLASS } from '@/lib/surfaceLayout';

export const DashboardPresentationContext = createContext<{
  variant: DashboardVariant;
  autoHeight: boolean;
}>({ variant: 'standard', autoHeight: false });

export function useDashboardPreviewLimit(standard = 5) {
  const { variant } = useContext(DashboardPresentationContext);
  return variant === 'compact' ? Math.min(standard, 3) : standard;
}

interface DashboardWidgetShellProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  customizeMode?: boolean;
  onHide?: () => void;
  dragHandleClass?: string;
  loading?: boolean;
  description?: string;
  action?: ReactNode;
  error?: string | null;
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
  description,
  action,
  error,
}: DashboardWidgetShellProps) {
  const { variant, autoHeight } = useContext(DashboardPresentationContext);
  return (
    <div
      data-dashboard-variant={variant}
      className={`${customizeMode ? SURFACE_OPERATIONAL_CLASS : SURFACE_FLOAT_CLASS} ${variant === 'featured' ? 'region-depth-2' : 'region-depth-1'} dashboard-widget-shell flex min-w-0 flex-col rounded-xl ${autoHeight ? '' : 'h-full min-h-0'} ${variant === 'compact' ? 'p-3' : variant === 'featured' ? 'p-5 sm:p-6' : 'p-4'}`}
    >
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
          <h3 className="min-w-0 text-sm font-semibold leading-tight text-foreground">
            {title}
          </h3>
        </div>
        {action}
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
      {description ? <p className="mb-3 text-xs text-muted">{description}</p> : null}
      <div className={`min-h-0 min-w-0 flex-1 ${autoHeight ? '' : 'overflow-y-auto'}`}>
        {error ? <p role="alert" className="text-sm text-muted">{error}</p> : loading ? <DashboardWidgetSkeleton rows={variant === 'compact' ? 1 : 3} /> : children}
      </div>
    </div>
  );
}
