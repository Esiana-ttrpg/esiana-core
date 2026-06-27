import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { completePasswordReset } from '@/lib/authEmail';
import { controlClasses } from '@/components/ui/formStyles';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get('token')?.trim() ?? '', [searchParams]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!token) {
      setError('This reset link is missing a token. Request a new link from the sign-in screen.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await completePasswordReset(token, password);
      setMessage('Password updated. You can sign in with your new password.');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageContainer className="py-10">
      <div className="mx-auto w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-lg">
        <h1 className={TYPE_DISPLAY_CLASS}>Choose a new password</h1>
        <p className="mt-2 text-sm text-muted">
          Enter a new password for your account. Reset links expire after one hour.
        </p>

        <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-4">
          {error && (
            <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>
          )}
          {message && (
            <p className="rounded-lg bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
              {message}
            </p>
          )}

          <label className="block space-y-1">
            <span className="text-sm text-muted">New password</span>
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={controlClasses}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm text-muted">Confirm new password</span>
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={controlClasses}
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-background hover:bg-primary-hover disabled:opacity-50"
          >
            {submitting ? 'Updating…' : 'Update password'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          <Link to="/" className="text-primary hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </PageContainer>
  );
}
