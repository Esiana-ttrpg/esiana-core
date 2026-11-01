import { useEffect } from 'react';
import { Copy, RefreshCw } from 'lucide-react';
import { CampaignInviteEmailForm } from '@/components/campaign/CampaignInviteEmailForm';
import { PublicCampaignAccessCard } from '@/components/settings/PublicCampaignAccessCard';
import { ACCESS_INVITE_MEMBERS_HASH } from '@/lib/campaignSettingsNavigation';
import type { CampaignDiscoverabilityValue } from '@shared/campaignPolicy/discoverability';

interface AccessInviteLink {
  inviteUrl: string;
  inviteToken: string;
  loading: boolean;
  error: string;
  copiedInvite: boolean;
  emailAvailable: boolean;
  sendInviteEmail: (email: string) => Promise<{ ok: boolean; error?: string; to?: string }>;
}

interface AccessSharingInvitesProps {
  campaignHandle: string;
  discoverability: CampaignDiscoverabilityValue;
  canManageAccess: boolean;
  canEditPublicAccess: boolean;
  accessError: string;
  accessLoading: boolean;
  inviteLink: AccessInviteLink;
  rotatingInvite: boolean;
  onDiscoverabilityChanged: (next: CampaignDiscoverabilityValue) => void;
  onCopyInviteUrl: () => void;
  onRotateInvite: () => void;
}

export function AccessSharingInvites({
  campaignHandle,
  discoverability,
  canManageAccess,
  canEditPublicAccess,
  accessError,
  accessLoading,
  inviteLink,
  rotatingInvite,
  onDiscoverabilityChanged,
  onCopyInviteUrl,
  onRotateInvite,
}: AccessSharingInvitesProps) {
  useEffect(() => {
    if (window.location.hash.replace(/^#/, '') !== ACCESS_INVITE_MEMBERS_HASH) return;
    document.getElementById(ACCESS_INVITE_MEMBERS_HASH)?.scrollIntoView({ block: 'start' });
  }, []);

  return (
    <div className="space-y-5">
      <section
        id={ACCESS_INVITE_MEMBERS_HASH}
        className="rounded-lg border border-border bg-surface p-6"
      >
        <h2 className="text-lg font-semibold text-white">Invite members</h2>
        <p className="mt-1 text-sm text-muted">
          Email an invitation or share a reusable access link. These add members;
          they do not grant anonymous viewing.
        </p>

        {inviteLink.emailAvailable ? (
          <div className="mt-5">
            <h3 className="text-sm font-medium text-foreground">Email invitation</h3>
            <CampaignInviteEmailForm
              className="mt-2 space-y-3"
              disabled={!inviteLink.inviteUrl}
              emailAvailable
              onSend={inviteLink.sendInviteEmail}
            />
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted">
            Email invitations are unavailable until an administrator configures
            SMTP. Use the invite access link below.
          </p>
        )}

        <div className="mt-6 border-t border-border pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-foreground">Invite access link</h3>
              <p className="mt-1 text-sm text-muted">
                Share this URL to invite users into your campaign workspace.
              </p>
            </div>
            <div className="rounded-full border border-border bg-elevated px-3 py-1 text-xs font-medium text-foreground">
              Token:{' '}
              {inviteLink.inviteToken
                ? `${inviteLink.inviteToken.slice(0, 8)}...`
                : 'loading'}
            </div>
          </div>
          {accessError || inviteLink.error ? (
            <div className="mt-4 rounded border border-red-700 bg-red-950/50 p-3 text-sm text-red-200">
              {accessError || inviteLink.error}
            </div>
          ) : null}
          <div className="mt-4 overflow-hidden rounded-lg border border-border bg-background p-3">
            <code className="block break-all text-sm text-foreground">
              {inviteLink.inviteUrl ||
                (inviteLink.loading || accessLoading
                  ? 'Loading invite link...'
                  : 'Invite link unavailable')}
            </code>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void onCopyInviteUrl()}
              disabled={!inviteLink.inviteUrl}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-emerald-500/60 bg-emerald-500 px-4 text-sm font-semibold text-background transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Copy className="h-4 w-4" />
              {inviteLink.copiedInvite ? 'Copied!' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={() => void onRotateInvite()}
              disabled={!canManageAccess || rotatingInvite}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-elevated px-4 text-sm font-semibold text-foreground transition hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${rotatingInvite ? 'animate-spin' : ''}`} />
              {rotatingInvite ? 'Regenerating...' : 'Regenerate Link'}
            </button>
          </div>
        </div>
      </section>

      <PublicCampaignAccessCard
        campaignHandle={campaignHandle}
        discoverability={discoverability}
        canEdit={canEditPublicAccess}
        onChanged={onDiscoverabilityChanged}
      />
    </div>
  );
}
