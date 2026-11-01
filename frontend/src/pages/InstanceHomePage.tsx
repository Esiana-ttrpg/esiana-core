import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { resolveInstanceHomeSurface } from '@/lib/instanceHome';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { GlobalHubPage } from '@/pages/GlobalHubPage';
import { InstanceLandingPage } from '@/pages/InstanceLandingPage';

export function InstanceHomePage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { brandingReady, instanceRequiresLogin } = useBranding();
  const surface = resolveInstanceHomeSurface({
    authLoading,
    brandingReady,
    isAuthenticated,
    instanceRequiresLogin,
  });

  if (surface === 'loading') {
    return <LoadingSpinner label="Loading…" />;
  }
  if (surface === 'landing') {
    return <InstanceLandingPage />;
  }
  return <GlobalHubPage />;
}
