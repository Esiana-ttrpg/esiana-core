import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { DowntimeHubLedgerPayload } from '@shared/downtimeHub';
import { patchLedgerSettings } from '@/lib/downtimeLedger';

const fieldClass =
  'mt-1 w-full rounded border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none transition-colors focus:border-primary/60';

interface LedgerSettingsModalProps {
  open: boolean;
  campaignHandle: string;
  treasury: DowntimeHubLedgerPayload['treasury'];
  onClose: () => void;
  onSaved: () => void;
}

export function LedgerSettingsModal({
  open,
  campaignHandle,
  treasury,
  onClose,
  onSaved,
}: LedgerSettingsModalProps) {
  const [currencyLabel, setCurrencyLabel] = useState(treasury.currencyLabel);
  const [currencySuffix, setCurrencySuffix] = useState(treasury.currencySuffix);
  const [openingBalance, setOpeningBalance] = useState(String(treasury.openingBalance));
  const [sharedTreasuryEnabled, setSharedTreasuryEnabled] = useState(
    treasury.sharedTreasuryEnabled,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCurrencyLabel(treasury.currencyLabel);
    setCurrencySuffix(treasury.currencySuffix);
    setOpeningBalance(String(treasury.openingBalance));
    setSharedTreasuryEnabled(treasury.sharedTreasuryEnabled);
    setError(null);
  }, [open, treasury]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const parsedOpening = Number.parseInt(openingBalance.trim(), 10);
    if (!currencyLabel.trim() || !currencySuffix.trim()) {
      setError('Currency label and suffix are required.');
      setSubmitting(false);
      return;
    }
    if (!Number.isFinite(parsedOpening)) {
      setError('Opening balance must be a whole number.');
      setSubmitting(false);
      return;
    }

    try {
      await patchLedgerSettings(campaignHandle, {
        currencyLabel: currencyLabel.trim(),
        currencySuffix: currencySuffix.trim(),
        openingBalance: parsedOpening,
        sharedTreasuryEnabled,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ledger-settings-modal-title"
        className="w-full max-w-md rounded-lg border border-border bg-background p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="ledger-settings-modal-title" className="text-lg font-semibold">
            Ledger settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground" htmlFor="ledger-currency-label">
              Currency name
            </label>
            <input
              id="ledger-currency-label"
              className={fieldClass}
              value={currencyLabel}
              onChange={(event) => setCurrencyLabel(event.target.value)}
              placeholder="gold"
              required
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground" htmlFor="ledger-currency-suffix">
              Currency suffix
            </label>
            <input
              id="ledger-currency-suffix"
              className={fieldClass}
              value={currencySuffix}
              onChange={(event) => setCurrencySuffix(event.target.value)}
              placeholder="g"
              required
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground" htmlFor="ledger-opening-balance">
              Opening balance
            </label>
            <input
              id="ledger-opening-balance"
              className={fieldClass}
              inputMode="numeric"
              value={openingBalance}
              onChange={(event) =>
                setOpeningBalance(event.target.value.replace(/[^\d-]/g, ''))
              }
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Starting treasury before any line items in the feed.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={sharedTreasuryEnabled}
              onChange={(event) => setSharedTreasuryEnabled(event.target.checked)}
            />
            Enable shared party treasury quick actions (contribute / withdraw / fund)
          </label>

          {error ? (
            <p className="rounded bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
