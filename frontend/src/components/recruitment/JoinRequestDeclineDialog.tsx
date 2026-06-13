import { FormEvent, useState } from 'react';
import {
  JOIN_REQUEST_DECLINE_REASONS,
  declineReasonRequiresMessage,
} from '@shared/joinRequestDeclineReasons';
import { controlClasses } from '@/components/ui/formStyles';

interface JoinRequestDeclineDialogProps {
  applicantLabel: string;
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onConfirm: (payload: { declineReasonCode: string; declineMessage: string }) => void;
}

export function JoinRequestDeclineDialog({
  applicantLabel,
  open,
  saving,
  onClose,
  onConfirm,
}: JoinRequestDeclineDialogProps) {
  const [reasonCode, setReasonCode] = useState(JOIN_REQUEST_DECLINE_REASONS[0]?.code ?? '');
  const [message, setMessage] = useState('');

  if (!open) return null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!reasonCode) return;
    if (declineReasonRequiresMessage(reasonCode) && !message.trim()) return;
    onConfirm({
      declineReasonCode: reasonCode,
      declineMessage: message.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="decline-dialog-title"
        className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl"
      >
        <h3 id="decline-dialog-title" className="text-lg font-semibold text-foreground">
          Decline application
        </h3>
        <p className="mt-1 text-sm text-muted">
          Let {applicantLabel} know why this table is not the right fit. Optional messages help
          players feel respected.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs text-muted">Reason</label>
            <select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              className={controlClasses}
            >
              {JOIN_REQUEST_DECLINE_REASONS.map((reason) => (
                <option key={reason.code} value={reason.code}>
                  {reason.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">
              {declineReasonRequiresMessage(reasonCode)
                ? 'Message (required)'
                : 'Optional message to applicant'}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full rounded border border-border bg-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary"
              placeholder="A brief, kind note goes a long way."
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-border px-3 py-2 text-sm text-foreground hover:bg-elevated"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-red-700/90 px-3 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              {saving ? 'Sending…' : 'Send decline'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
