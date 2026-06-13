import { FormEvent, useState } from 'react';
import { Mail } from 'lucide-react';

interface CampaignInviteEmailFormProps {
  disabled?: boolean;
  emailAvailable?: boolean;
  onSend: (email: string) => Promise<{ ok: boolean; error?: string; to?: string }>;
}

export function CampaignInviteEmailForm({
  disabled = false,
  emailAvailable = true,
  onSend,
}: CampaignInviteEmailFormProps) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    setError('');
    setSending(true);
    try {
      const result = await onSend(email.trim());
      if (result.ok) {
        setMessage(`Invite sent to ${result.to ?? email.trim()}.`);
        setEmail('');
      } else {
        setError(result.error ?? 'Failed to send invite email.');
      }
    } finally {
      setSending(false);
    }
  }

  const formDisabled = disabled || !emailAvailable;

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="mt-4 space-y-3">
      <label className="block text-sm text-muted">
        Email invite
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="player@example.com"
            required
            disabled={formDisabled || sending}
            className="min-h-10 flex-1 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary/60 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={formDisabled || sending || !email.trim()}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-elevated px-4 text-sm font-semibold text-foreground transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Mail className="h-4 w-4" />
            {sending ? 'Sending…' : 'Send invite'}
          </button>
        </div>
      </label>
      {!emailAvailable ? (
        <p className="text-xs text-muted">
          Email invites are disabled until an admin configures SMTP in system settings.
        </p>
      ) : null}
      {error && <p className="text-sm text-red-300">{error}</p>}
      {message && <p className="text-sm text-emerald-400">{message}</p>}
    </form>
  );
}
