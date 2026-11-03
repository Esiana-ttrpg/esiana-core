import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { WrappedInviteAvailability } from '@shared/wrappedTypes';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { dismissHubAttention } from '@/lib/hub';

type SeasonalInvite = {
  version: 1;
  active: boolean;
  year: number | null;
  edition: 'preview' | 'completed' | null;
  availability: WrappedInviteAvailability | null;
  href: string | null;
  dismissKey: string | null;
  dismissed: boolean;
  timeZone: string;
  /** Account that owns this invite payload — used to reject stale responses. */
  accountId: string;
};

export function WrappedSeasonalInviteBanner() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [invite, setInvite] = useState<SeasonalInvite | null>(null);
  const [hidden, setHidden] = useState(false);
  const accountId = user?.id ?? null;

  // Reset local dismiss and clear prior-account invite when the signed-in
  // account changes; same-account refreshes keep the dismissal.
  useEffect(() => {
    setHidden(false);
    setInvite(null);
  }, [accountId]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setInvite(null);
      return;
    }
    const forAccountId = user.id;
    let cancelled = false;
    void apiFetch<Omit<SeasonalInvite, 'accountId'>>('/user/wrapped/seasonal-invite')
      .then((payload) => {
        // Reject stale responses that arrive after an account switch.
        if (cancelled || forAccountId !== accountId) return;
        setInvite({ ...payload, accountId: forAccountId });
      })
      .catch(() => {
        if (!cancelled) setInvite(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user, accountId]);

  if (
    !user ||
    !accountId ||
    !invite?.active ||
    invite.accountId !== accountId ||
    !invite.year ||
    !invite.dismissKey ||
    !invite.href ||
    !invite.availability ||
    hidden
  ) {
    return null;
  }

  const titleKey =
    invite.availability === 'unavailable'
      ? 'profile.wrapped.seasonal.titleDiscover'
      : invite.availability === 'limited'
        ? invite.edition === 'preview'
          ? 'profile.wrapped.seasonal.titleLimitedPreview'
          : 'profile.wrapped.seasonal.titleLimited'
        : invite.edition === 'preview'
          ? 'profile.wrapped.seasonal.titlePreview'
          : 'profile.wrapped.seasonal.title';

  const ctaKey =
    invite.availability === 'unavailable'
      ? 'profile.wrapped.seasonal.ctaDiscover'
      : 'profile.wrapped.seasonal.cta';

  const title = t(titleKey, { year: invite.year });

  return (
    <div
      role="region"
      aria-label={title}
      className="w-full border-b border-border bg-card px-4 py-2"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground">{title}</p>
        <div className="flex items-center gap-3">
          <Link
            to={invite.href}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {t(ctaKey)}
          </Link>
          <button
            type="button"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => {
              setHidden(true);
              void dismissHubAttention(invite.dismissKey!).catch(() => {
                setHidden(false);
              });
            }}
          >
            {t('profile.wrapped.seasonal.dismiss')}
          </button>
        </div>
      </div>
    </div>
  );
}
