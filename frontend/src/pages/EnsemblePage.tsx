import { useParams } from 'react-router-dom';
import { EnsembleSurfaceView } from '@/components/ensemble/EnsembleSurfaceView';

export function EnsemblePage() {
  const { campaignHandle = '' } = useParams<{ campaignHandle: string }>();
  return <EnsembleSurfaceView campaignHandle={campaignHandle} />;
}
