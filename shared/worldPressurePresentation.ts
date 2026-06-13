/**
 * GM-facing presentation labels for world pressure / event prompts.
 * Internal types and services keep technical names; UI imports from here.
 */
import type { WorldEventSuggestionKind } from './worldEventSuggestionMetadata.js';
import { formatWorldEventSuggestionKindLabel } from './worldEventSuggestionMetadata.js';

export const WORLD_OUTLOOK_LABEL = 'World outlook';

export const BREWING_CONFLICTS_LABEL = 'Brewing conflicts';

export const AGE_TRENDS_LABEL = 'Age trends';

export const NEAR_FUTURE_FORECAST_LABEL = 'Near-future forecast';

export const PROJECTED_BY_NEXT_SESSION_LABEL = 'Projected by next session';

export const WORLD_PRESSURE_PAUSED_MESSAGE =
  'World pressure forecasting is paused for this campaign.';

export const WORLD_PRESSURE_FORECAST_EMPTY_MESSAGE =
  'Assign era trajectories in Progression › Insights to shape forecasts.';

export const CAMPAIGN_PACING_PANEL_TITLE = 'Campaign pacing';

export const PAUSE_FORECASTING_LABEL = 'Pause world pressure forecasting';

export const PAUSE_FORECASTING_HINT =
  'Stops advisory forecasts and blocks new world event prompts on time advance. Pending prompts remain reviewable.';

export const PREVIEW_AT_EPOCH_LABEL = 'Preview at epoch';

export const PREVIEW_AT_EPOCH_DISCLAIMER =
  'Advisory only — uses current faction trajectories against the era active at this epoch.';

export const SIMULATION_RECEIPTS_LABEL = 'Simulation receipts';

export const SIMULATION_RECEIPTS_EMPTY_MESSAGE =
  'No time advances recorded yet. Advance the campaign clock or apply a world advance batch.';

export const SIMULATION_RECEIPTS_CHRONOLOGY_LINK = 'Full campaign history in Chronology';

export const WORLD_EVENT_PROMPTS_PANEL_TITLE = 'World event prompts';

export function formatAwaitingReviewCount(count: number): string {
  return `${count.toString()} awaiting review`;
}

export const WORLD_EVENT_PROMPTS_EMPTY_MESSAGE =
  'No developments awaiting review. Author trajectories in Progression › Insights to shape what emerges.';

export const WORLD_EVENT_CREATE_BUTTON = 'Create event';

export const WORLD_EVENT_IGNORE_BUTTON = 'Ignore';

export const WORLD_EVENT_EDIT_BUTTON = 'Edit';

export const WORLD_EVENT_CREATED_SUCCESS = 'Event created';

export const LOADING_WORLD_OUTLOOK_LABEL = 'Loading world outlook…';

export function formatSuggestionKindPresentation(kind: WorldEventSuggestionKind): string {
  return formatWorldEventSuggestionKindLabel(kind);
}
