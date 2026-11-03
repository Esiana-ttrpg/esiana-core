import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthModal } from '@/components/auth/AuthModal';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { fetchAuthProviders } from '@/lib/federatedIdentity';
import {
  canCreateAccount,
  canOfferRegistrationAction,
} from '@/lib/instanceHome';
import { TYPE_DISPLAY_CLASS, TYPE_PROSE_CLASS } from '@/lib/surfaceLayout';

/**
 * Public introduction to Yearly Wrapped — fictional sample only.
 * Must work without authentication and never load personal statistics.
 */
export function WrappedIntroPage() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { allowRegistrations, userTableEmpty } = useBranding();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showRegister, setShowRegister] = useState(false);

  const registrationAvailable = canCreateAccount({
    allowRegistrations,
    userTableEmpty,
  });

  useEffect(() => {
    if (!registrationAvailable) {
      setShowRegister(false);
      return;
    }
    let cancelled = false;
    void fetchAuthProviders()
      .then((data) => {
        if (cancelled) return;
        setShowRegister(
          canOfferRegistrationAction({
            canCreateAccount: true,
            localLoginEnabled: data.localLoginEnabled !== false,
            hasOidcProviders: (data.providers ?? []).length > 0,
          }),
        );
      })
      .catch(() => {
        if (!cancelled) setShowRegister(true);
      });
    return () => {
      cancelled = true;
    };
  }, [registrationAvailable]);

  return (
    <div className="mx-auto max-w-2xl space-y-10 px-4 py-10">
      <header className="space-y-3 text-center">
        <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
          {t('profile.wrapped.intro.eyebrow')}
        </p>
        <h1 className={`${TYPE_DISPLAY_CLASS} text-4xl text-foreground`}>
          {t('profile.wrapped.intro.title')}
        </h1>
        <p className={`${TYPE_PROSE_CLASS} text-muted-foreground`}>
          {t('profile.wrapped.intro.lead')}
        </p>
      </header>

      <section
        aria-label={t('profile.wrapped.intro.sampleHeading')}
        className="space-y-4 rounded-2xl border border-border bg-card/60 p-6"
        style={{
          background:
            'linear-gradient(160deg, color-mix(in oklab, var(--color-card) 88%, var(--stats-writing) 12%), var(--color-card))',
        }}
      >
        <h2 className="text-lg font-semibold text-foreground">
          {t('profile.wrapped.intro.sampleHeading')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('profile.wrapped.intro.sampleDisclaimer')}
        </p>
        <ul className="space-y-3 text-sm text-foreground">
          <li>{t('profile.wrapped.intro.sampleWorlds')}</li>
          <li>{t('profile.wrapped.intro.sampleWords')}</li>
          <li>{t('profile.wrapped.intro.sampleSessions')}</li>
          <li>{t('profile.wrapped.intro.sampleArchetype')}</li>
        </ul>
      </section>

      <section className="space-y-4 text-center">
        <h2 className="text-lg font-semibold">{t('profile.wrapped.intro.ctaHeading')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('profile.wrapped.intro.ctaBody')}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {isAuthenticated && user ? (
            <Link
              to={`/users/${user.id}?tab=writing`}
              className="rounded-md border border-primary bg-primary/10 px-4 py-2 text-sm font-medium hover:bg-primary/15"
            >
              {t('profile.wrapped.intro.ctaStats')}
            </Link>
          ) : (
            <>
              <button
                type="button"
                className="rounded-md border border-primary bg-primary/10 px-4 py-2 text-sm font-medium hover:bg-primary/15"
                onClick={() => {
                  setAuthMode('login');
                  setAuthOpen(true);
                }}
              >
                {t('profile.wrapped.intro.ctaSignIn')}
              </button>
              {showRegister ? (
                <button
                  type="button"
                  className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted/40"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthOpen(true);
                  }}
                >
                  {t('profile.wrapped.intro.ctaRegister')}
                </button>
              ) : null}
            </>
          )}
        </div>
      </section>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode={authMode}
      />
    </div>
  );
}
