import type { DashboardWidgetId } from '@/lib/dashboardConfig';
import { i18n } from '@/i18n/initI18n';

const WIDGET_LABEL_KEYS: Record<DashboardWidgetId, string> = {
  sessionSchedule: 'campaign.dashboard.widgetSessionSchedule',
  worldChronometer: 'campaign.dashboard.widgetWorldChronometer',
  campaignBulletin: 'campaign.dashboard.widgetCampaignBulletin',
  recentLore: 'campaign.dashboard.widgetRecentLore',
  questLedger: 'campaign.dashboard.widgetQuestLedger',
  livingThreads: 'campaign.dashboard.widgetLivingThreads',
  party: 'campaign.dashboard.widgetParty',
  campaignPulse: 'campaign.dashboard.widgetCampaignPulse',
  lastSessionNotes: 'campaign.dashboard.widgetLastSessionNotes',
  quickUtilityNav: 'campaign.dashboard.widgetQuickUtilityNav',
  continueWhereYouLeftOff: 'campaign.dashboard.widgetContinueWhereYouLeftOff',
  pinnedItems: 'campaign.dashboard.widgetPinnedItems',
  fantasyCalendar: 'campaign.dashboard.widgetFantasyCalendar',
  worldPressureForecast: 'campaign.dashboard.widgetWorldPressureForecast',
  worldSnapshot: 'campaign.dashboard.widgetWorldSnapshot',
  sessionClock: 'campaign.dashboard.widgetSessionSchedule',
  worldClock: 'campaign.dashboard.widgetWorldChronometer',
  announcements: 'campaign.dashboard.widgetCampaignBulletin',
  activityLoop: 'campaign.dashboard.widgetRecentLore',
};

export function translateDashboardWidgetLabel(
  widgetId: DashboardWidgetId | string,
  fallback: string,
): string {
  const key = WIDGET_LABEL_KEYS[widgetId as DashboardWidgetId];
  if (key && i18n.exists(key)) return i18n.t(key);
  return fallback;
}
