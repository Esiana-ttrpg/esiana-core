import { useState } from 'react';
import {
  CampaignDiscoverability,
  type CampaignDiscoverabilityValue,
} from '@shared/campaignPolicy/discoverability';
import {
  publicCampaignAccessStatusMessage,
  resolvePublicCampaignAccessStatus,
} from '@shared/campaignPolicy/publicAccess';
import { updateCampaignSettings } from '@/lib/campaigns';
import { useBranding } from '@/contexts/BrandingContext';

interface PublicCampaignAccessCardProps {
  campaignHandle: string;
  discoverability: CampaignDiscoverabilityValue;
  canEdit: boolean;
  onChanged: (next: CampaignDiscoverabilityValue) => void;
}

export function PublicCampaignAccessCard({
  campaignHandle,
  discoverability,
  canEdit,
  onChanged,
}: PublicCampaignAccessCardProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { instanceRequiresLogin } = useBranding();
  const allowed = discoverability === CampaignDiscoverability.PUBLIC;
  const statusMessage = publicCampaignAccessStatusMessage(
    resolvePublicCampaignAccessStatus({ instanceRequiresLogin }),
  );

  const handleChange = async (checked: boolean) => {
    const next = checked
      ? CampaignDiscoverability.PUBLIC
      : CampaignDiscoverability.PRIVATE;
    setError('');
    setSaving(true);
    try {
      const campaign = await updateCampaignSettings(campaignHandle, {
        discoverability: next,
      });
      onChanged(campaign.discoverability);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update public campaign access.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h2 className="text-lg font-semibold text-white">Public campaign access</h2>
      <p className="mt-1 text-sm text-muted">
        Allow visitors to view campaign content using Observer permissions.
      </p>
      <label
        className={`mt-4 flex items-start gap-3 rounded-lg border px-3 py-3 ${
          canEdit ? 'cursor-pointer border-border bg-elevated' : 'cursor-not-allowed border-border/70 bg-elevated/60'
        }`}
      >
        <input
          type="checkbox"
          className="mt-1"
          checked={allowed}
          disabled={!canEdit || saving}
          onChange={(event) => void handleChange(event.target.checked)}
        />
        <span className="text-sm font-medium text-foreground">Allow public access</span>
      </label>
      {statusMessage ? (
        <p className="mt-3 text-xs text-muted">{statusMessage}</p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-red-200">{error}</p>
      ) : null}
    </div>
  );
}
