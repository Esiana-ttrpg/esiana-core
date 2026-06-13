import { Link } from 'react-router-dom';
import { MascotErrorPanel } from '@/components/errors/MascotErrorPanel';

export function NotFoundPage() {
  return (
    <MascotErrorPanel
      code={404}
      title="Page not found"
      description="This URL doesn't match anything in Esiana. The page may have moved or never existed."
      action={
        <Link to="/" className="text-sm text-primary hover:underline">
          Back to hub
        </Link>
      }
    />
  );
}
