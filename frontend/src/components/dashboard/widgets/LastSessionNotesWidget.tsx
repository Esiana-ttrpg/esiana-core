import { ScrollText } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DashboardLastSessionSummary } from '@/lib/dashboardSummary';
import { campaignNotePath } from '@/lib/campaignPaths';
import { DashboardWidgetShell } from '../DashboardWidgetShell';

interface LastSessionNotesWidgetProps {
  campaignHandle: string;
  lastSession: DashboardLastSessionSummary | null;
  customizeMode?: boolean;
  onHide?: () => void;
}

export function LastSessionNotesWidget({
  campaignHandle,
  lastSession,
  customizeMode,
  onHide,
}: LastSessionNotesWidgetProps) {
  return (
    <DashboardWidgetShell
      title="Last Session"
      icon={<ScrollText className="size-4 text-orange-300" />}
      customizeMode={customizeMode}
      onHide={onHide}
    >
      {!lastSession ? (
        <p className="text-sm text-muted">
          After your first session, a recap will anchor everyone here.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="font-semibold text-foreground">{lastSession.title}</p>
          {lastSession.snippet ? (
            <p className="text-sm leading-relaxed text-muted">{lastSession.snippet}</p>
          ) : (
            <p className="text-sm text-muted">Session notes are ready to read.</p>
          )}
          {!customizeMode ? (
            <Link
              to={campaignNotePath(campaignHandle, lastSession.timelinePointId)}
              className="text-xs text-primary hover:underline"
            >
              Read full notes
            </Link>
          ) : null}
        </div>
      )}
    </DashboardWidgetShell>
  );
}
