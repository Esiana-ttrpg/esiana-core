import { useState, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { createCampaign } from '@/lib/campaigns';
import { getCampaignNameHandleError } from '@shared/campaignHandle';
import type { CampaignSummary, CampaignDiscoverabilityValue } from '@/types/campaign';
import {
  CampaignDiscoverability,
  normalizeDiscoverability,
} from '@shared/campaignPolicy/discoverability';

interface CreateCampaignModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (campaign: CampaignSummary) => void;
}

export function CreateCampaignModal({
  open,
  onClose,
  onCreated,
}: CreateCampaignModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [discoverability, setDiscoverability] = useState<CampaignDiscoverabilityValue>(
    CampaignDiscoverability.PRIVATE,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const titleHandleError = name.trim() ? getCampaignNameHandleError(name) : null;

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (titleHandleError) {
      setError(titleHandleError);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const campaign = await createCampaign({
        name: name.trim(),
        description: description.trim() || undefined,
        discoverability,
      });
      onCreated(campaign);
      setName('');
      setDescription('');
      setDiscoverability(CampaignDiscoverability.PRIVATE);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-campaign-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2
            id="create-campaign-title"
            className="flex items-center gap-2 text-lg font-semibold text-foreground"
          >
            <Plus className="size-5 text-primary" />
            Create New Campaign
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-elevated"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && (
            <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
          <label className="block space-y-1">
            <span className="text-sm text-muted">Campaign name *</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/60"
              placeholder="Curse of the Hollow King"
            />
            {titleHandleError && (
              <span className="text-xs text-red-300">{titleHandleError}</span>
            )}
          </label>
          <label className="block space-y-1">
            <span className="text-sm text-muted">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/60"
              placeholder="A gothic horror campaign in the misty highlands…"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm text-muted">Discoverability</span>
            <select
              value={discoverability}
              onChange={(e) =>
                setDiscoverability(
                  normalizeDiscoverability(e.target.value),
                )
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/60"
            >
              <option value={CampaignDiscoverability.PRIVATE}>Private</option>
              <option value={CampaignDiscoverability.UNLISTED}>
                Unlisted (anonymous codex via link)
              </option>
              <option value={CampaignDiscoverability.PUBLIC}>
                Public (Global Hub)
              </option>
            </select>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-elevated"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim() || Boolean(titleHandleError)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-background hover:bg-primary-hover disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
