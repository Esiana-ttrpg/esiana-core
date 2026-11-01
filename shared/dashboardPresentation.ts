/** Presentation metadata only: no data access or permission decisions. Plugin IDs
 * deliberately use a conservative fallback until they declare their own sizing. */
export type DashboardVariant = 'compact' | 'standard' | 'featured';
export type DashboardWidgetCategory = 'Story' | 'Sessions' | 'World' | 'Party' | 'Activity' | 'Custom';
export interface DashboardPresentation {
  category: DashboardWidgetCategory;
  description: string;
  variants: readonly DashboardVariant[];
  preferredSpan: number;
  minW: number;
  minH: number;
  contentRequirements: string;
  contentAware?: boolean;
}
const definition = (category: DashboardWidgetCategory, description: string, contentRequirements: string, preferredSpan = 6, variants: readonly DashboardVariant[] = ['compact', 'standard']): DashboardPresentation => ({
  category, description, contentRequirements, preferredSpan, variants, minW: 2, minH: 1, contentAware: true,
});
export const DASHBOARD_PRESENTATIONS: Record<string, DashboardPresentation> = {
  currentStory: definition('Story', 'The ongoing story, active quest, and a way to continue.', 'Visible story or quest; otherwise discovery navigation', 7, ['standard', 'featured']),
  continueWhereYouLeftOff: definition('Story', 'Return to pages you recently worked on.', 'Personal recent pages'),
  questLedger: definition('Story', 'Quest status, summaries, and checklist progress.', 'Visible quest pages'),
  livingThreads: definition('Story', 'Unresolved threads and recent resolutions.', 'Visible thread pages'),
  sessionSchedule: definition('Sessions', 'The next session, its date, and scheduling details.', 'Published upcoming or ongoing session', 5, ['compact', 'standard', 'featured']),
  lastSessionNotes: definition('Sessions', 'Add your notes and discover party contributions and session media.', 'Visible completed session', 6, ['compact', 'standard', 'featured']),
  worldChronometer: definition('World', 'The in-world date and calendar context.', 'Campaign calendar', 4),
  worldSnapshot: definition('World', 'Current location and world context.', 'Visible campaign world state'),
  campaignAtAGlance: definition('World', 'World date, next session, party, and location.', 'Authorized narrative snapshot', 12),
  fantasyCalendar: definition('World', 'Explore dated entries on the campaign calendar.', 'Campaign calendar'),
  worldEvents: definition('World', 'Upcoming and recent in-world developments.', 'Visible world events'),
  worldPressureForecast: definition('World', 'Approaching developments and world pressure.', 'Authorized pressure preview'),
  factionsAtWar: definition('World', 'Faction relationships and active conflicts.', 'Visible faction relationships'),
  havenDowntime: definition('World', 'Havens, activities, and downtime state.', 'Authorized downtime hub'),
  partyRoster: definition('Party', 'Compact portraits and details of active characters.', 'Visible active party characters', 5),
  recentActivity: definition('Activity', 'Recent record edits, separate from world chronology.', 'Authorized recent changes', 7),
  recentLore: definition('Activity', 'Recently changed lore across the campaign.', 'Authorized lore feed'),
  recentEntities: definition('Activity', 'Entity previews filtered by category.', 'Authorized entity feed'),
  campaignPulse: definition('Activity', 'Recent editing activity and session timing.', 'Authorized campaign summary', 4),
  explore: definition('Custom', 'Navigate the world and discover campaign content.', 'Campaign navigation', 4),
  quickUtilityNav: definition('Custom', 'Choose shortcuts to campaign destinations.', 'Configured links', 4),
  pinnedItems: definition('Custom', 'Quick access to your pinned pages.', 'Personal pinned pages'),
  description: definition('Custom', 'The campaign description.', 'Campaign description', 6, ['compact', 'standard', 'featured']),
  text: definition('Custom', 'Your own title and formatted text.', 'Custom text', 6, ['compact', 'standard', 'featured']),
};
export function dashboardPresentation(id: string): DashboardPresentation {
  return DASHBOARD_PRESENTATIONS[id] ?? { ...definition('Custom', 'An extension-provided campaign widget.', 'Provided by the registered extension'), contentAware: false };
}
export function normalizeDashboardVariant(value: unknown): DashboardVariant | undefined {
  return value === 'compact' || value === 'standard' || value === 'featured' ? value : undefined;
}
