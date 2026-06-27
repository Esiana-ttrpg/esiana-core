import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { useState } from 'react';
import { setCampaignArchived } from '@/lib/campaigns';

interface ArchiveCampaignModalProps {
  open: boolean;
  campaignId: string;
  campaignName: string;
  onClose: () => void;
  onArchived: () => void;
}

export function ArchiveCampaignModal({
  open,
  campaignId,
  campaignName,
  onClose,
  onArchived,
}: ArchiveCampaignModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      await setCampaignArchived(campaignId, true);
      onArchived();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive campaign');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-xl">
        <h2 className={TYPE_DISPLAY_CLASS}>Archive Campaign</h2>
        <p className="mt-2 text-sm text-muted">
          Archive <span className="font-semibold text-foreground">{campaignName}</span>?
          This removes it from the campaign hub and recruitment listings. You can still open it
          from Your Campaigns while archived.
        </p>
        {error ? (
          <p className="mt-3 rounded border border-red-700 bg-red-950/50 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleConfirm()}
            className="h-10 rounded border border-amber-700 bg-amber-700 px-5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {busy ? 'Archiving…' : 'Archive Campaign'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="h-10 rounded border border-border bg-elevated px-5 text-sm font-medium text-foreground hover:bg-elevated"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
