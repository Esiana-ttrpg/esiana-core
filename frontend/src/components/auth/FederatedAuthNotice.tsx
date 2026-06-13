import { useSearchParams } from 'react-router-dom';
import { AUTH_ERROR_MESSAGES } from '@/lib/federatedIdentity';

export function FederatedAuthNotice() {
  const [searchParams, setSearchParams] = useSearchParams();
  const code = searchParams.get('authError');
  if (!code) return null;

  const message =
    AUTH_ERROR_MESSAGES[code] ??
    'Something went wrong during organization sign-in.';

  function dismiss() {
    const next = new URLSearchParams(searchParams);
    next.delete('authError');
    setSearchParams(next, { replace: true });
  }

  return (
    <div
      role="alert"
      className="mb-4 rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200"
    >
      <p>{message}</p>
      <button
        type="button"
        onClick={dismiss}
        className="mt-2 text-xs font-medium text-red-300 underline hover:text-red-100"
      >
        Dismiss
      </button>
    </div>
  );
}
