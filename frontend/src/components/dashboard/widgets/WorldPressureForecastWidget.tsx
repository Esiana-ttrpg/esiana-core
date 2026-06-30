import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import {
  BREWING_CONFLICTS_LABEL,
  WORLD_PRESSURE_FORECAST_EMPTY_MESSAGE,
} from '@shared/worldPressurePresentation';
import type { DashboardSummary } from '@/lib/dashboardSummary';
import { campaignProgressionPath, campaignWikiPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import { DashboardWidgetShell } from '@/components/dashboard/DashboardWidgetShell';
import { WorldPressureForecastContent } from '@/components/dashboard/WorldPressureForecastContent';

interface WorldPressureForecastWidgetProps {
  campaignHandle: string;
  preview: DashboardSummary['worldPressurePreview'];
  nextSession: DashboardSummary['nextSession'];
  nextSessionInDays: number | null;
  customizeMode?: boolean;
  onHide?: () => void;
}

export function WorldPressureForecastWidget({
  campaignHandle,
  preview,
  nextSession,
  nextSessionInDays,
  customizeMode,
  onHide,
}: WorldPressureForecastWidgetProps) {
  const { flatPages } = useWiki();

  return (
    <DashboardWidgetShell
      title="World Pressure Forecast"
      icon={<TrendingUp className="size-4 text-primary" />}
      customizeMode={customizeMode}
      onHide={onHide}
    >
      {!preview ? (
        <div className="space-y-3 text-sm text-muted">
          <p>{WORLD_PRESSURE_FORECAST_EMPTY_MESSAGE}</p>
          <Link
            to={campaignProgressionPath(campaignHandle, 'insights')}
            className="font-medium text-primary hover:underline"
          >
            Open Progression insights
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <WorldPressureForecastContent
            campaignHandle={campaignHandle}
            preview={preview}
            nextSession={nextSession}
            nextSessionInDays={nextSessionInDays}
            tone="widget"
          />

          {!preview.paused && preview.risingTensions.length > 0 ? (
            <section className="space-y-2">
              <h4 className={META_SECTION_LABEL_CLASS}>
                {BREWING_CONFLICTS_LABEL}
              </h4>
              <ul className="space-y-1.5">
                {preview.risingTensions.map((line) => (
                  <li key={line.orgPageId} className="text-sm">
                    <Link
                      to={campaignWikiPath(campaignHandle, line.orgPageId, flatPages)}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {line.orgTitle}
                    </Link>
                    <span className="text-muted"> — {line.momentumLabel}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </DashboardWidgetShell>
  );
}
