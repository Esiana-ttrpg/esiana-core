import { Navigate, useParams } from 'react-router-dom';
import { campaignDashboardPath } from '@/lib/campaignPaths';

/** Codex index route — campaign home is the default landing surface. */
export function WikiIndexRedirect() {
  const { campaignHandle = '' } = useParams<{ campaignHandle: string }>();

  return <Navigate to={campaignDashboardPath(campaignHandle)} replace />;
}
