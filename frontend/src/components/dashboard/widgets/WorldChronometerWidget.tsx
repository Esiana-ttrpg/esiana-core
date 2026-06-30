import { META_SECTION_LABEL_CLASS, TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { Globe2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DashboardChronometerSummary } from '@/lib/dashboardSummary';
import { campaignChronologyPath } from '@/lib/campaignPaths';
import { DashboardWidgetShell } from '../DashboardWidgetShell';

interface WorldChronometerWidgetProps {
  campaignHandle: string;
  chronometer: DashboardChronometerSummary | null;
  customizeMode?: boolean;
  onHide?: () => void;
}

export function WorldChronometerWidget({
  campaignHandle,
  chronometer,
  customizeMode,
  onHide,
}: WorldChronometerWidgetProps) {
  return (
    <DashboardWidgetShell
      title="World Chronometer"
      icon={<Globe2 className="size-4 text-sky-400" />}
      customizeMode={customizeMode}
      onHide={onHide}
    >
      {!chronometer ? (
        <p className="text-sm text-muted">
          {customizeMode
            ? 'Chronometer appears when a fantasy calendar is configured.'
            : 'World time will appear once your DM sets up the campaign calendar.'}
        </p>
      ) : (
        <div className="space-y-3">
          {chronometer.season ? (
            <p className={META_SECTION_LABEL_CLASS}>
              {chronometer.season}
            </p>
          ) : null}
          <p className={TYPE_DISPLAY_CLASS}>{chronometer.label}</p>
          {chronometer.moonPhase ? (
            <p className="text-sm text-muted">{chronometer.moonPhase}</p>
          ) : null}
          {chronometer.upcomingEvents.length > 0 ? (
            <ul className="space-y-1 border-t border-border pt-2 text-sm text-muted">
              {chronometer.upcomingEvents.map((event) => (
                <li key={event.id}>{event.title}</li>
              ))}
            </ul>
          ) : null}
          {!customizeMode ? (
            <Link
              to={campaignChronologyPath(campaignHandle, 'calendar')}
              className="text-xs text-primary hover:underline"
            >
              Open chronology
            </Link>
          ) : null}
        </div>
      )}
    </DashboardWidgetShell>
  );
}
