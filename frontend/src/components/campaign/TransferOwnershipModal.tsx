import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { campaignTransferOwnershipPath } from '@/lib/campaignPaths';
import { CampaignMemberRoles } from '@/types/domain';
import {
  fetchOwnershipTransferStatus,
  initiateOwnershipTransfer,
} from '@/lib/notifications';

interface TransferMember {
  userId: string;
  name: string;
  role: string;
}

interface TransferOwnershipModalProps {
  open: boolean;
  campaignHandle: string;
  campaignName: string;
  onClose: () => void;
}

export function TransferOwnershipModal({
  open,
  campaignHandle,
  campaignName,
  onClose,
}: TransferOwnershipModalProps) {
  const { token } = useAuth();
  const [members, setMembers] = useState<TransferMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingTransfer, setPendingTransfer] = useState(false);

  useEffect(() => {
    if (!open || !campaignHandle) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/campaigns/${campaignHandle}/members`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }).then(async (res) => {
        if (!res.ok) throw new Error('Failed to load members');
        const data = (await res.json()) as { members?: TransferMember[] };
        return data.members ?? [];
      }),
      fetchOwnershipTransferStatus(campaignHandle).then((data) => Boolean(data.transfer)),
    ])
      .then(([loadedMembers, hasPending]) => {
        if (cancelled) return;
        setMembers(
          loadedMembers.filter((member) => member.role === CampaignMemberRoles.WRITER),
        );
        setPendingTransfer(hasPending);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load members');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, campaignHandle, token]);

  if (!open) return null;

  async function handleOffer() {
    if (!selectedUserId) return;
    const member = members.find((m) => m.userId === selectedUserId);
    const confirmed = window.confirm(
      `Offer primary Game Master ownership of ${campaignName} to ${member?.name ?? 'this Writer'}? They must accept before roles change.`,
    );
    if (!confirmed) return;

    setBusy(true);
    setError(null);
    try {
      await initiateOwnershipTransfer(campaignHandle, selectedUserId);
      setPendingTransfer(true);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to offer ownership transfer',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-xl">
        <h2 className={TYPE_DISPLAY_CLASS}>Transfer Ownership</h2>
        <p className="mt-2 text-sm text-muted">
          Offer primary Game Master ownership of <span className="font-semibold">{campaignName}</span> to a
          Writer. They must accept the offer.
        </p>

        {pendingTransfer ? (
          <p className="mt-4 text-sm text-amber-200">
            A transfer is already pending.{' '}
            <Link
              to={campaignTransferOwnershipPath(campaignHandle)}
              className="font-medium text-primary underline"
            >
              View transfer offer
            </Link>
          </p>
        ) : null}

        {error ? (
          <p className="mt-3 rounded border border-red-700 bg-red-950/50 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="mt-4 text-sm text-muted">Loading Writers…</p>
        ) : (
          <div className="mt-4 space-y-2">
            {members.length === 0 ? (
              <p className="text-sm text-muted">
                No Writers on this campaign. Promote a member to Writer in Settings → Access first.
              </p>
            ) : (
              members.map((member) => (
                <label
                  key={member.userId}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface/60 px-3 py-2"
                >
                  <input
                    type="radio"
                    name="transfer-target"
                    checked={selectedUserId === member.userId}
                    onChange={() => setSelectedUserId(member.userId)}
                  />
                  <span className="text-sm text-foreground">{member.name}</span>
                </label>
              ))
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!selectedUserId || busy || pendingTransfer || members.length === 0}
            onClick={() => void handleOffer()}
            className="h-10 rounded border border-border bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {busy ? 'Sending offer…' : 'Send Offer'}
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
