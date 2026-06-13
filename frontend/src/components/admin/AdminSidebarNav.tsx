import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Shield, X } from 'lucide-react';
import { productVersion } from '@/lib/productVersion';

export interface AdminNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

interface AdminSidebarNavProps {
  items: readonly AdminNavItem[];
  onNavigate?: () => void;
  onClose?: () => void;
  className?: string;
}

export function AdminSidebarNav({
  items,
  onNavigate,
  onClose,
  className = '',
}: AdminSidebarNavProps) {
  return (
    <aside
      className={`flex h-full w-64 max-w-[min(16rem,85vw)] shrink-0 flex-col border-r border-border bg-background ${className}`}
    >
      <div className="shrink-0 border-b border-border/80 px-4 pb-4 pt-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-primary">
            <Shield className="size-5" strokeWidth={1.5} />
            <p className="text-xs font-bold uppercase tracking-widest text-muted">
              System Config
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border p-2 text-muted hover:bg-elevated hover:text-foreground md:hidden"
              aria-label="Close admin menu"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      <nav
        className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-4 pr-4"
        aria-label="System Config"
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end
              onClick={onNavigate}
              className={({ isActive }) =>
                `block min-h-11 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-accent/50 bg-accent/10 text-accent'
                    : 'border-transparent text-muted hover:border-accent/30 hover:bg-elevated/60 hover:text-accent'
                }`
              }
            >
              <span className="flex items-center gap-2">
                <Icon className="size-4 shrink-0" strokeWidth={1.5} />
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto shrink-0 border-t border-border bg-background px-4 pb-4 pt-4">
        <div className="mb-4 rounded-lg border border-border/80 bg-surface/40 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
            Esiana v{productVersion}
          </p>
        </div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">
          RESOURCES
        </p>
        <a
          href="https://github.com/Esiana-ttrpg/esiana-core"
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:border-border hover:bg-elevated/60 hover:text-primary"
        >
          <span>GitHub</span>
          <span className="text-muted" aria-hidden="true">
            ↗
          </span>
        </a>
        <a
          href="https://github.com/Esiana-ttrpg/docs/wiki"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex min-h-11 items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:border-border hover:bg-elevated/60 hover:text-primary"
        >
          <span>Documentation</span>
          <span className="text-muted" aria-hidden="true">
            ↗
          </span>
        </a>
      </div>
    </aside>
  );
}
