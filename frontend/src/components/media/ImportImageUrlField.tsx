import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  importCampaignImageFromUrl,
  uploadCampaignImage,
  resolveAssetDeliveryUrl,
} from '@/lib/campaigns';
import { isAssetReferenceUrl } from '@shared/assetReferenceValidation';
import { controlClasses } from '@/components/admin/adminFormStyles';

interface ImportImageUrlFieldProps {
  campaignHandle: string;
  value: string;
  onChange: (url: string) => void;
  onImported?: (referenceUrl: string) => void | Promise<void>;
  label?: string;
  placeholder?: string;
  uploadType?: string;
  disabled?: boolean;
  inputClassName?: string;
}

export function ImportImageUrlField({
  campaignHandle,
  value,
  onChange,
  onImported,
  label = 'Import Image URL',
  placeholder = 'https://…',
  uploadType = 'generic',
  disabled = false,
  inputClassName = controlClasses,
}: ImportImageUrlFieldProps) {
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    const trimmed = importUrl.trim();
    if (!trimmed) return;
    setImporting(true);
    setError(null);
    try {
      const result = await importCampaignImageFromUrl(
        campaignHandle,
        trimmed,
        uploadType,
      );
      const referenceUrl = resolveAssetDeliveryUrl(result);
      onChange(referenceUrl);
      setImportUrl('');
      await onImported?.(referenceUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const result = await uploadCampaignImage(campaignHandle, file, uploadType);
      const referenceUrl = resolveAssetDeliveryUrl(result);
      onChange(referenceUrl);
      await onImported?.(referenceUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  const busy = importing || uploading;

  return (
    <div className="space-y-2">
      {value && isAssetReferenceUrl(value) ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <img src={value} alt="" className="max-h-32 w-full object-cover" />
        </div>
      ) : null}

      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted">{label}</span>
        <div className="flex gap-2">
          <input
            type="url"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleImport();
              }
            }}
            placeholder={placeholder}
            disabled={disabled || busy}
            className={inputClassName}
          />
          <button
            type="button"
            onClick={() => void handleImport()}
            disabled={disabled || busy || !importUrl.trim()}
            className="shrink-0 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:border-primary/50 disabled:opacity-50"
          >
            {importing ? <Loader2 className="size-4 animate-spin" /> : 'Import'}
          </button>
        </div>
      </label>

      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/70">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          disabled={disabled || busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.currentTarget.value = '';
          }}
        />
        {uploading ? 'Uploading…' : 'Upload file'}
      </label>

      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
