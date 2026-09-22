import assert from 'node:assert/strict';
import test from 'node:test';
import type { CampaignDetail } from '@/types/campaign';
import type { DashboardBundle } from './dashboardConfig';
import {
  campaignDashboardNavigationReducer,
  createCampaignDashboardNavigationState,
} from './campaignDashboardNavigationState';

function campaign(handle: string): CampaignDetail {
  return { handle, name: handle } as CampaignDetail;
}

function bundle(coverImageUrl: string | null): DashboardBundle {
  return {
    dashboardConfig: {
      hero: {
        coverImageUrl,
        summary: null,
        heroMode: 'standard',
        focalPointX: 0.5,
        focalPointY: 0.5,
        overlayStrength: 0.55,
      },
      widgets: [],
    },
  } as DashboardBundle;
}

test('client navigation shows the destination campaign hero and ignores the stale source response', () => {
  let state = createCampaignDashboardNavigationState('amber-court');
  state = campaignDashboardNavigationReducer(state, {
    type: 'load',
    campaignHandle: 'glass-isles',
  });

  const staleResult = campaignDashboardNavigationReducer(state, {
    type: 'success',
    campaignHandle: 'amber-court',
    campaign: campaign('amber-court'),
    bundle: bundle('/api/assets/amber-banner'),
  });
  assert.equal(staleResult, state);

  state = campaignDashboardNavigationReducer(state, {
    type: 'success',
    campaignHandle: 'glass-isles',
    campaign: campaign('glass-isles'),
    bundle: bundle('/api/assets/glass-banner'),
  });
  assert.equal(state.bundle?.dashboardConfig.hero.coverImageUrl, '/api/assets/glass-banner');
  assert.equal(state.campaign?.handle, 'glass-isles');
  assert.equal(state.loading, false);
});

test('client navigation supports a campaign without hero art', () => {
  let state = createCampaignDashboardNavigationState('quiet-archive');
  state = campaignDashboardNavigationReducer(state, {
    type: 'success',
    campaignHandle: 'quiet-archive',
    campaign: campaign('quiet-archive'),
    bundle: bundle(null),
  });

  assert.equal(state.bundle?.dashboardConfig.hero.coverImageUrl, null);
  assert.equal(state.error, null);
  assert.equal(state.loading, false);
});
