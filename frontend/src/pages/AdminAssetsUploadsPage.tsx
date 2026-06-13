import { Upload } from 'lucide-react';
import { AdminAssetsUploadsForm } from '@/components/admin/AdminAssetsUploadsForm';

export function AdminAssetsUploadsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <Upload className="size-7" strokeWidth={1.5} />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Assets & Uploads
          </h1>
        </div>
        <p className="text-sm text-muted">
          Upload limits, image validation, cartography processing, and URL import policy.
        </p>
      </header>
      <AdminAssetsUploadsForm />
    </div>
  );
}
