import { Settings2, Shield } from 'lucide-react';
import { AdminGeneralSettingsForm } from '@/components/admin/AdminGeneralSettingsForm';

export function AdminGeneralSettingsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <Shield className="size-7" strokeWidth={1.5} />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            General Settings
          </h1>
        </div>
        <p className="flex items-center gap-2 text-sm text-muted">
          <Settings2 className="size-4 shrink-0" />
          Registration, mail, and instance status controls.
        </p>
      </header>
      <AdminGeneralSettingsForm />
    </div>
  );
}
