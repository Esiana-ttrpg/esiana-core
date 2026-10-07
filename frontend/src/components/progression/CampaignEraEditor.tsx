import { Link } from 'react-router-dom';
import { useWiki } from '@/contexts/WikiContext';
import type { CampaignEra, CampaignMomentumState } from '@shared/factionMomentumMetadata';

/** Compatibility entry point; Chronology is the sole era editor. */
export function CampaignEraEditor(_props: { state: CampaignMomentumState; saving: boolean; onSave: (eras: CampaignEra[]) => Promise<void> }) {
  const { campaignHandle } = useWiki();
  return <Link className="text-primary underline" to={`/campaigns/${campaignHandle}/chronology?view=eras`}>Manage eras in Chronology</Link>;
}
