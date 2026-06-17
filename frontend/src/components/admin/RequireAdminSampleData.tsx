import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAdminSampleDataEnabled } from '@/hooks/useAdminSampleDataEnabled';

export function RequireAdminSampleData({ children }: { children: ReactNode }) {
  const { enabled, loading } = useAdminSampleDataEnabled();

  if (loading) {
    return <LoadingSpinner label="Loading sample data tools…" />;
  }

  if (!enabled) {
    return <Navigate to="/admin/settings/general" replace />;
  }

  return children;
}
