import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCampaignInviteLink } from '@/hooks/useCampaignInviteLink';
import { CampaignDiscoverability } from '@shared/campaignPolicy/discoverability';
import type { CampaignSummary } from '@/types/campaign';
import {
  applyWizardScheduleBestEffort,
  type WizardScheduleOutcome,
} from '@/components/hub/newCampaignWizard/seedCampaignFoundation';

interface WizardCreatedPanelProps {
  campaign: CampaignSummary;
  onDone: () => void;
  scheduleWarning?: Extract<WizardScheduleOutcome, { ok: false }> | null;
}

export function WizardCreatedPanel({
  campaign,
  onDone,
  scheduleWarning = null,
}: WizardCreatedPanelProps) {
  const handle = campaign.handle;
  const isPrivate =
    campaign.discoverability !== CampaignDiscoverability.PUBLIC;
  const invite = useCampaignInviteLink(handle, { enabled: isPrivate && Boolean(handle) });
  const [warning, setWarning] = useState(scheduleWarning);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    setWarning(scheduleWarning);
  }, [scheduleWarning]);

  async function handleRetrySchedule() {
    if (!warning?.retry) return;
    setRetrying(true);
    try {
      const outcome = await applyWizardScheduleBestEffort(
        warning.retry.campaignId,
        warning.retry.campaignHandle,
        warning.retry.schedule,
        false,
      );
      setWarning(outcome.ok ? null : outcome);
    } finally {
      setRetrying(false);
    }
  }

  return (
    <section className="space-y-6 py-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 size-8 shrink-0 text-emerald-400" />
        <div>
          <h3 className="text-lg font-semibold text-foreground">Campaign created</h3>
          <p className="mt-1 text-sm text-muted">
            <span className="font-medium text-foreground">{campaign.name}</span> is ready.
          </p>
        </div>
      </div>

      {warning ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">First session not scheduled</p>
          <p className="text-xs text-muted">
            {warning.message ||
              'Your campaign was created, but the first session note was not created.'}
          </p>
          {warning.retry ? (
            <button
              type="button"
              disabled={retrying}
              onClick={() => void handleRetrySchedule()}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground hover:bg-elevated disabled:opacity-60"
            >
              {retrying ? 'Retrying…' : 'Retry scheduling first session'}
            </button>
          ) : null}
        </div>
      ) : null}

      {isPrivate ? (
        <div className="rounded-xl border border-border bg-background/50 p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Invite players to join this campaign</p>
          <p className="text-xs text-muted">This grants membership access only.</p>
          {invite.loading ? (
            <p className="text-xs text-muted">Loading invite link…</p>
          ) : invite.inviteUrl ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                readOnly
                value={invite.inviteUrl}
                className="min-w-0 flex-1 rounded-lg border border-border bg-elevated px-3 py-2 text-xs text-foreground"
              />
              <button
                type="button"
                onClick={() => void invite.copyInviteUrl()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-background hover:bg-primary-hover"
              >
                {invite.copiedInvite ? 'Copied' : 'Copy invite link'}
              </button>
            </div>
          ) : invite.error ? (
            <p className="text-xs text-red-300">{invite.error}</p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted">
          Your campaign is public on the Global Hub. Invite players from campaign settings when you
          are ready to add members.
        </p>
      )}

      <button
        type="button"
        onClick={onDone}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-background hover:bg-primary-hover"
      >
        Continue
      </button>
    </section>
  );
}
