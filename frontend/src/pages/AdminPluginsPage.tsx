import { Puzzle, Shield } from 'lucide-react';
import { AdminPluginsTab } from '@/components/admin/AdminPluginsTab';

export function AdminPluginsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <Shield className="size-7" strokeWidth={1.5} />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Plugins & Integrations
          </h1>
        </div>
        <p className="flex items-center gap-2 text-sm text-muted">
          <Puzzle className="size-4 shrink-0" />
          Registry discovery and remote manifest installation.
        </p>
      </header>
      <AdminPluginsTab />
    </div>
  );
}
