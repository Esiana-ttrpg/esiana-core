import { useState } from 'react';
import { HavenAssetIdField } from '@/components/downtime/HavenAssetIdField';
import { uploadCampaignImage } from '@/lib/campaigns';
import { mapAssetImageUrl } from '@/lib/maps';

interface OrganizationEmblemFieldProps {
  campaignHandle: string;
  value: string | null;
  onChange: (assetId: string | null) => void;
  disabled?: boolean;
}

export function OrganizationEmblemField({
  campaignHandle,
  value,
  onChange,
  disabled = false,
}: OrganizationEmblemFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const result = await uploadCampaignImage(campaignHandle, file);
      onChange(result.asset.id);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload crest');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        Crest / shield / logo
      </span>
      <div className="flex flex-wrap items-start gap-3">
        {value ? (
          <img
            src={mapAssetImageUrl(value, 'thumb')}
            alt=""
            className="size-16 shrink-0 rounded-lg border border-border object-cover"
          />
        ) : (
          <div
            className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-surface/40 text-[10px] text-muted"
            aria-hidden
          >
            No crest
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1 text-[10px] font-medium text-foreground hover:border-primary/70 hover:text-primary">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              disabled={disabled || uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload(file);
                event.currentTarget.value = '';
              }}
            />
            {uploading ? 'Uploading…' : 'Upload image'}
          </label>
          <HavenAssetIdField
            campaignHandle={campaignHandle}
            label="Or choose existing asset"
            value={value}
            onChange={onChange}
          />
          <p className="text-[10px] text-muted">
            Uploaded crest overrides the symbol preset on the hero and hub cards.
          </p>
        </div>
      </div>
      {uploadError ? (
        <p className="text-[10px] text-red-400" role="alert">
          {uploadError}
        </p>
      ) : null}
    </div>
  );
}
