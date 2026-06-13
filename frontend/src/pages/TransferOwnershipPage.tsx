import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  acceptOwnershipTransfer,
  declineOwnershipTransfer,
  fetchOwnershipTransferStatus,
} from '@/lib/notifications';
import { campaignDashboardPath } from '@/lib/campaignPaths';
import { useAuth } from '@/contexts/AuthContext';

export function TransferOwnershipPage() {
  const { campaignHandle = '' } = useParams<{ campaignHandle: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transfer, setTransfer] = useState<Awaited<
    ReturnType<typeof fetchOwnershipTransferStatus>
  >['transfer']>(null);

  useEffect(() => {
    if (!campaignHandle) return;
    void fetchOwnershipTransferStatus(campaignHandle)
      .then((data) => setTransfer(data.transfer))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Unable to load transfer offer.'),
      )
      .finally(() => setLoading(false));
  }, [campaignHandle]);

  async function handleAccept() {
    if (!campaignHandle) return;
    setBusy(true);
    setError(null);
    try {
      await acceptOwnershipTransfer(campaignHandle);
      navigate(campaignDashboardPath(campaignHandle));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to accept transfer.');
      setBusy(false);
    }
  }

  async function handleDecline() {
    if (!campaignHandle) return;
    setBusy(true);
    setError(null);
    try {
      await declineOwnershipTransfer(campaignHandle);
      navigate(campaignDashboardPath(campaignHandle));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to decline transfer.');
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      </PageContainer>
    );
  }

  if (!transfer) {
    return (
      <PageContainer>
        <div className="rounded-xl border border-border bg-surface p-6">
          <h1 className="text-xl font-semibold">No pending transfer</h1>
          <p className="mt-2 text-sm text-muted">
            There is no active ownership transfer offer for this campaign.
          </p>
        </div>
      </PageContainer>
    );
  }

  const isTarget = user?.id === transfer.toUser?.id;

  return (
    <PageContainer>
      <div className="mx-auto max-w-xl rounded-xl border border-amber-500/40 bg-surface p-6">
        <div className="mb-4 flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-6 shrink-0 text-amber-500" />
          <div>
            <h1 className="text-xl font-semibold">Campaign ownership transfer</h1>
            <p className="mt-1 text-sm text-muted">{transfer.campaignName}</p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <p>
            <strong>{transfer.fromUser?.label ?? 'Current Game Master'}</strong> offered to transfer
            primary Game Master ownership to{' '}
            <strong>{transfer.toUser?.label ?? 'a Writer'}</strong>.
          </p>
          <p className="text-muted">
            If you accept, you become the primary Game Master and the current Game Master becomes
            Writer. This affects operational control for the entire campaign.
          </p>
          <p className="text-xs text-muted">
            Offer expires {new Date(transfer.expiresAt).toLocaleString()}.
          </p>
        </div>

        {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}

        {isTarget ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleAccept()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-background hover:bg-primary/90 disabled:opacity-50"
            >
              Accept ownership
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDecline()}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-elevated disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted">
            Only the offered Writer can accept or decline this transfer.
          </p>
        )}
      </div>
    </PageContainer>
  );
}
