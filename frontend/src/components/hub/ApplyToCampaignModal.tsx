import { FormEvent, useEffect, useState } from 'react';
import { applyToCampaignRecruitment } from '@/lib/campaigns';

interface ApplyToCampaignModalProps {
  campaignId: string | null;
  campaignName: string;
  open: boolean;
  defaultPitch?: string | null;
  onClose: () => void;
  onApplied: () => void;
}

export function ApplyToCampaignModal({
  campaignId,
  campaignName,
  open,
  defaultPitch,
  onClose,
  onApplied,
}: ApplyToCampaignModalProps) {
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const pitchTemplate = defaultPitch?.trim() ?? '';

  useEffect(() => {
    if (open) {
      setMessage(pitchTemplate);
      setError(null);
      setSuccess(false);
    }
  }, [open, pitchTemplate]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!campaignId) return;
    setSaving(true);
    setError(null);
    try {
      await applyToCampaignRecruitment(campaignId, message.trim());
      setSuccess(true);
      setMessage('');
      onApplied();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit application.');
    } finally {
      setSaving(false);
    }
  }

  if (!open || !campaignId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-foreground">Introduce yourself</h2>
        <p className="mt-1 text-sm text-muted">
          {campaignName} — tell the DM what drew you to this table.
        </p>

        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-foreground">
            Tell the DM what interests you about this campaign
          </label>
          <p className="text-xs text-muted">
            Share what drew you to the story, your experience, or what you are hoping for at the
            table.
          </p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={4}
            maxLength={2000}
            placeholder={
              pitchTemplate ||
              'I was excited by the premise because… I have played similar games… I am free on... Character ideas....'
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60"
          />

          {error && <p className="text-sm text-red-300">{error}</p>}
          {success && (
            <p className="text-sm text-emerald-400">Sent to the DM!</p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !message.trim()}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-background disabled:opacity-50"
            >
              {saving ? 'Sending…' : 'Send to DM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
