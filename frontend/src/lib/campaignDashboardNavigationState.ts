import type { CampaignDetail } from '@/types/campaign';
import type { DashboardBundle } from './dashboardConfig';

export interface CampaignDashboardNavigationState {
  campaignHandle: string;
  campaign: CampaignDetail | null;
  bundle: DashboardBundle | null;
  loading: boolean;
  error: string | null;
}

export type CampaignDashboardNavigationAction =
  | { type: 'load'; campaignHandle: string }
  | {
      type: 'success';
      campaignHandle: string;
      campaign: CampaignDetail;
      bundle: DashboardBundle;
    }
  | { type: 'failure'; campaignHandle: string; error: string }
  | { type: 'bundleChanged'; campaignHandle: string; bundle: DashboardBundle };

export function createCampaignDashboardNavigationState(
  campaignHandle: string,
): CampaignDashboardNavigationState {
  return {
    campaignHandle,
    campaign: null,
    bundle: null,
    loading: true,
    error: null,
  };
}

/**
 * Keeps route-owned dashboard data from being overwritten by a request that
 * completed after the user navigated to a different campaign.
 */
export function campaignDashboardNavigationReducer(
  state: CampaignDashboardNavigationState,
  action: CampaignDashboardNavigationAction,
): CampaignDashboardNavigationState {
  if (action.type === 'load') {
    return createCampaignDashboardNavigationState(action.campaignHandle);
  }

  if (action.campaignHandle !== state.campaignHandle) return state;

  if (action.type === 'success') {
    return {
      campaignHandle: action.campaignHandle,
      campaign: action.campaign,
      bundle: action.bundle,
      loading: false,
      error: null,
    };
  }

  if (action.type === 'failure') {
    return {
      ...state,
      campaign: null,
      bundle: null,
      loading: false,
      error: action.error,
    };
  }

  return { ...state, bundle: action.bundle };
}
