import { Brush, Shield } from 'lucide-react';
import { AdminAppearanceTab } from '@/components/admin/AdminBrandingTab';

export function AdminAppearancePage() {
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <Shield className="size-7" strokeWidth={1.5} />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Appearance
          </h1>
        </div>
        <p className="flex items-center gap-2 text-sm text-muted">
          <Brush className="size-4 shrink-0" />
          Platform title, logos, global theme preset, and global palette.
        </p>
      </header>
      <AdminAppearanceTab />
    </div>
  );
}
