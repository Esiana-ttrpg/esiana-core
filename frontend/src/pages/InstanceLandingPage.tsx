import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { EsianaLogo } from '@/components/brand/EsianaLogo';
import { AuthModal } from '@/components/auth/AuthModal';
import { useBranding } from '@/contexts/BrandingContext';
import { TYPE_DISPLAY_CLASS, TYPE_PROSE_CLASS } from '@/lib/surfaceLayout';
import { footerNavLinksForAudience } from '@/lib/footerConfig';
import { docsLinks } from '@/lib/docsLinks';
import { externalLinks } from '@shared/externalLinks';

export function InstanceLandingPage() {
  const { globalTitle, globalLogoUrl, footer, allowRegistrations } = useBranding();
  const [logoError, setLogoError] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const instanceName = globalTitle.trim() || 'Esiana';
  const instanceNote = footer.customText.trim();
  const instanceLinks = footerNavLinksForAudience(footer, false);

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          {logoError ? (
            <BookOpen className="size-14 text-primary" strokeWidth={1.5} aria-hidden />
          ) : globalLogoUrl ? (
            <img
              src={globalLogoUrl}
              alt=""
              className="size-14 object-contain"
              onError={() => setLogoError(true)}
            />
          ) : (
            <EsianaLogo className="size-14 text-primary" />
          )}
        </div>
        <h1 className={`${TYPE_DISPLAY_CLASS} text-3xl text-foreground`}>
          Welcome to {instanceName}.
        </h1>
        <p className={`${TYPE_PROSE_CLASS} mt-3 text-sm text-muted`}>
          Sign in to access campaigns and content on this instance.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => openAuth('login')}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-background hover:bg-primary-hover"
          >
            Sign In
          </button>
          {allowRegistrations ? (
            <button
              type="button"
              onClick={() => openAuth('register')}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground hover:bg-elevated"
            >
              Create Account
            </button>
          ) : null}
        </div>
        <div className="mt-10 space-y-3 text-xs text-muted">
          <p>This instance is independently managed.</p>
          {instanceNote ? <p>{instanceNote}</p> : null}
          {instanceLinks.length > 0 ? (
            <nav
              aria-label="Instance links"
              className="flex flex-wrap justify-center gap-x-4 gap-y-2"
            >
              {instanceLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-4 hover:text-foreground hover:underline"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          ) : null}
          <p>
            For account access, invitations, campaign membership, or server
            administration, contact the people who run this instance.
          </p>
          <details className="text-left">
            <summary className="cursor-pointer text-center text-muted hover:text-foreground">
              About Esiana
            </summary>
            <div className="mt-3 space-y-2 rounded-lg border border-border/60 bg-surface/40 px-3 py-3">
              <p>
                Esiana is the software that powers this instance. Use these
                project links for software bugs, documentation, development, and
                community discussion — not for this server&apos;s accounts or
                campaigns.
              </p>
              <nav aria-label="Esiana project links" className="flex flex-wrap gap-x-4 gap-y-2">
                <a
                  href={docsLinks.home}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-4 hover:text-foreground hover:underline"
                >
                  Documentation
                </a>
                <a
                  href={externalLinks.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-4 hover:text-foreground hover:underline"
                >
                  GitHub
                </a>
                <a
                  href={externalLinks.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-4 hover:text-foreground hover:underline"
                >
                  Discord
                </a>
                <a
                  href={externalLinks.reddit}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-4 hover:text-foreground hover:underline"
                >
                  Reddit
                </a>
              </nav>
            </div>
          </details>
        </div>
      </div>
      <AuthModal
        open={authOpen}
        initialMode={authMode}
        onClose={() => setAuthOpen(false)}
      />
    </div>
  );
}
