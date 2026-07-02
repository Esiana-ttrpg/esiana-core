import { Link } from 'react-router-dom';
import { Compass, ScrollText } from 'lucide-react';

interface HubShelfHorizonProps {
  variant?: 'member' | 'guest';
}

export function HubShelfHorizon({ variant = 'member' }: HubShelfHorizonProps) {
  if (variant === 'guest') {
    return (
      <footer className="hub-horizon">
        <div className="hub-horizon__content">
          <p className="text-sm text-muted">
            <Link to="/recruitment" className="hub-horizon__link font-medium">
              Find a table →
            </Link>
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="hub-horizon">
      <div className="hub-horizon__content flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <ScrollText className="mt-0.5 size-4 shrink-0 text-[var(--hub-section-library)] opacity-70" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-medium text-foreground/90">Your campaigns</p>
            <p className="text-sm text-muted">
              Manage memberships on{' '}
              <Link to="/campaigns" className="hub-horizon__link font-medium">
                Your Campaigns
              </Link>
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Compass className="mt-0.5 size-4 shrink-0 text-[var(--hub-accent)] opacity-70" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-medium text-foreground/90">Horizon</p>
            <Link to="/recruitment" className="hub-horizon__link text-sm font-medium">
              Discover Worlds — browse public tables and open stories
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
