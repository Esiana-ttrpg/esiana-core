import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { MascotErrorPanel } from '@/components/errors/MascotErrorPanel';
import { resolveErrorTitle } from '@/components/errors/errorCopy';

export function RouteErrorPage() {
  const error = useRouteError();

  let code: number | undefined;
  let description: string | undefined;

  if (isRouteErrorResponse(error)) {
    code = error.status;
    if (typeof error.data === 'string' && error.data.trim()) {
      description = error.data;
    } else if (
      error.data &&
      typeof error.data === 'object' &&
      'message' in error.data &&
      typeof error.data.message === 'string'
    ) {
      description = error.data.message;
    } else if (error.statusText && error.statusText !== resolveErrorTitle(code)) {
      description = error.statusText;
    }
  } else if (error instanceof Error) {
    code = 500;
    description = error.message;
  } else {
    code = 500;
  }

  const title = resolveErrorTitle(code);

  if (!description) {
    description =
      code === 403
        ? 'You do not have permission to view this.'
        : code === 404
          ? 'This URL does not match anything in Esiana.'
          : 'An unexpected error occurred. Try going back or return to the hub.';
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-12">
      <MascotErrorPanel
        code={code}
        title={title}
        description={description}
        action={
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
            <Link to="/" className="text-primary hover:underline">
              Go to hub
            </Link>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="text-muted hover:text-foreground hover:underline"
            >
              Go back
            </button>
          </div>
        }
      />
    </div>
  );
}
