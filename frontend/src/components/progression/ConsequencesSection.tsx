import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { Link } from 'react-router-dom';
import { campaignPath } from '@/lib/campaignPaths';

interface ConsequencesSectionProps {
  campaignHandle: string;
}

export function ConsequencesSection({ campaignHandle }: ConsequencesSectionProps) {
  return (
    <div className="space-y-4">
      <header>
        <h2 className={TYPE_DISPLAY_CLASS}>Consequences</h2>
        <p className="text-sm text-muted-foreground">
          Review and apply event consequences from chronology entries.
        </p>
      </header>
      <p className="text-sm text-muted-foreground">
        Open the{' '}
        <Link to={campaignPath(campaignHandle, 'chronology')} className="text-primary hover:underline">
          Chronology feed
        </Link>{' '}
        and select an event to author or apply consequences from its lore page.
      </p>
    </div>
  );
}
