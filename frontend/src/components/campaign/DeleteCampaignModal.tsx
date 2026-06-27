import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { controlClasses } from '@/components/ui/formStyles';
import { deleteCampaign } from '@/lib/campaigns';

interface DeleteCampaignModalProps {
  open: boolean;
  campaignName: string;
  campaignId: string;
  onClose: () => void;
  onDeleted?: () => void;
}

export function DeleteCampaignModal({
  open,
  campaignName,
  campaignId,
  onClose,
  onDeleted,
}: DeleteCampaignModalProps) {
  const navigate = useNavigate();
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function handleConfirm() {
    if (confirmation !== 'DELETE') return;
    setBusy(true);
    setError(null);
    try {
      await deleteCampaign(campaignId);
      onDeleted?.();
      onClose();
      setConfirmation('');
      navigate('/campaigns', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete campaign');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-xl">
        <h2 className={TYPE_DISPLAY_CLASS}>Delete Campaign</h2>
        <p className="mt-2 text-sm text-muted">
          Permanently delete <span className="font-semibold text-foreground">{campaignName}</span>.
          Type <span className="font-semibold text-foreground">DELETE</span> to confirm.
        </p>
        {error ? (
          <p className="mt-3 rounded border border-red-700 bg-red-950/50 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}
        <input
          type="text"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder="DELETE"
          className={`${controlClasses} mt-4`}
        />
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={confirmation !== 'DELETE' || busy}
            onClick={() => void handleConfirm()}
            className="h-10 rounded border border-red-700 bg-red-600 px-5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? 'Deleting…' : 'Confirm Delete'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setConfirmation('');
              setError(null);
              onClose();
            }}
            className="h-10 rounded border border-border bg-elevated px-5 text-sm font-medium text-foreground hover:bg-elevated"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
