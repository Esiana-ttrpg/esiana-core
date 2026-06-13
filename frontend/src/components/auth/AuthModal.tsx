import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { requestPasswordReset } from '@/lib/authEmail';
import {
  fetchAuthProviders,
  federatedSignInUrl,
  type AuthProviderSummary,
} from '@/lib/federatedIdentity';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

type AuthMode = 'login' | 'register' | 'forgot';

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [providers, setProviders] = useState<AuthProviderSummary[]>([]);

  useEffect(() => {
    if (!open) return;
    fetchAuthProviders()
      .then(setProviders)
      .catch(() => setProviders([]));
  }, [open]);

  if (!open) return null;

  function resetMessages() {
    setError(null);
    setMessage(null);
  }

  function startFederated(providerId: string) {
    window.location.assign(federatedSignInUrl(providerId, { mode: 'login' }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    resetMessages();
    setSubmitting(true);
    try {
      if (mode === 'forgot') {
        await requestPasswordReset(email);
        setMessage(
          'If an account with that email exists and can use password sign-in, a reset link has been sent.',
        );
        return;
      }
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }
      onClose();
      setEmail('');
      setPassword('');
      setMode('login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  }

  const title =
    mode === 'login'
      ? 'Sign in'
      : mode === 'register'
        ? 'Create account'
        : 'Reset password';

  const showFederated = mode === 'login' && providers.length > 0;

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="auth-modal-title" className="text-lg font-semibold text-foreground">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-elevated hover:text-foreground"
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
          {message && (
            <p className="rounded-lg bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
              {message}
            </p>
          )}

          {showFederated && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Organization sign-in
              </p>
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => startFederated(provider.id)}
                  className="w-full rounded-lg border border-border bg-elevated/40 px-3 py-2.5 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-elevated"
                >
                  Continue with {provider.displayName}
                </button>
              ))}
              <p className="text-center text-xs text-muted">or use email and password</p>
            </div>
          )}

          <label className="block space-y-1">
            <span className="text-sm text-muted">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/60"
            />
          </label>
          {mode !== 'forgot' && (
            <label className="block space-y-1">
              <span className="text-sm text-muted">Password</span>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/60"
              />
            </label>
          )}
          {mode === 'login' && (
            <div className="text-right">
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => {
                  resetMessages();
                  setMode('forgot');
                }}
              >
                Forgot password?
              </button>
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-background hover:bg-primary-hover disabled:opacity-50"
          >
            {submitting
              ? 'Please wait…'
              : mode === 'login'
                ? 'Sign in'
                : mode === 'register'
                  ? 'Register'
                  : 'Send reset link'}
          </button>
          <p className="text-center text-sm text-muted">
            {mode === 'login' ? (
              <>
                No account?{' '}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => {
                    resetMessages();
                    setMode('register');
                  }}
                >
                  Register
                </button>
              </>
            ) : mode === 'register' ? (
              <>
                Have an account?{' '}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => {
                    resetMessages();
                    setMode('login');
                  }}
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Remember your password?{' '}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => {
                    resetMessages();
                    setMode('login');
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}
