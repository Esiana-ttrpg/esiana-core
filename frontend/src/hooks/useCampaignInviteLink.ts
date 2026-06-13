import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sendCampaignInviteEmail as sendCampaignInviteEmailApi } from '@/lib/authEmail';

function appBaseUrl(): string {
  return import.meta.env.VITE_APP_BASE_URL?.trim() || window.location.origin;
}

export interface UseCampaignInviteLinkOptions {
  enabled?: boolean;
}

export function useCampaignInviteLink(
  campaignHandle: string,
  options: UseCampaignInviteLinkOptions = {},
) {
  const { token } = useAuth();
  const enabled = options.enabled !== false && Boolean(campaignHandle);
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const campaignShareUrl = `${appBaseUrl().replace(/\/+$/, '')}/campaigns/${campaignHandle}`;

  const reload = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);
    setError('');

    void (async () => {
      try {
        const response = await fetch(`/api/campaigns/${campaignHandle}/invite`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || `Failed to load invite (HTTP ${response.status})`);
        }
        const data = (await response.json()) as {
          handle?: string;
          slug?: string;
          inviteToken: string;
          emailAvailable?: boolean;
        };
        if (cancelled) return;
        const resolvedSlug = data.handle || data.slug || campaignHandle;
        const nextInviteUrl = `${appBaseUrl().replace(/\/+$/, '')}/campaigns/${resolvedSlug}?invite=${data.inviteToken}`;
        setInviteUrl(nextInviteUrl);
        setInviteToken(data.inviteToken);
        setEmailAvailable(data.emailAvailable === true);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load invite link');
          setInviteUrl('');
          setInviteToken('');
          setEmailAvailable(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [campaignHandle, enabled, reloadKey, token]);

  const copyInviteUrl = useCallback(async () => {
    if (!inviteUrl) return false;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 1800);
      return true;
    } catch {
      setError('Could not copy invite link.');
      return false;
    }
  }, [inviteUrl]);

  const copyCampaignShareUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(campaignShareUrl);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 1800);
      return true;
    } catch {
      setError('Could not copy campaign link.');
      return false;
    }
  }, [campaignShareUrl]);

  const sendInviteEmail = useCallback(
    async (email: string) => {
      if (!campaignHandle) return { ok: false as const, error: 'Campaign not loaded.' };
      setError('');
      try {
        const result = await sendCampaignInviteEmailApi(campaignHandle, email);
        return { ok: true as const, to: result.to };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to send invite email.';
        setError(message);
        return { ok: false as const, error: message };
      }
    },
    [campaignHandle],
  );

  return {
    inviteUrl,
    inviteToken,
    campaignShareUrl,
    loading,
    error,
    copiedInvite,
    copiedShare,
    copyInviteUrl,
    copyCampaignShareUrl,
    sendInviteEmail,
    emailAvailable,
    reload,
  };
}
