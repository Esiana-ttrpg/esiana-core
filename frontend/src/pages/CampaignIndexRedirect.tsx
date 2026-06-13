import { useEffect, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { fetchEnsembleBundle } from '@/lib/ensembleApi';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/** Default entry is Campaign Home (`dashboard`); respects `ensembleConfig.landingSurface` for party. */
export function CampaignIndexRedirect() {
  const { campaignHandle = '' } = useParams<{ campaignHandle: string }>();
  const location = useLocation();
  const [target, setTarget] = useState<'party' | 'dashboard' | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const bundle = await fetchEnsembleBundle(campaignHandle);
        if (cancelled) return;
        const surface = bundle.config.landingSurface;
        if (surface === 'party') setTarget('party');
        else setTarget('dashboard');
      } catch {
        if (!cancelled) setTarget('dashboard');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campaignHandle]);

  if (!target) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return <Navigate to={`${target}${location.search}`} replace />;
}
