import { describe, expect, it } from 'vitest';
import {
  formatMapViewingLabel,
  isViewingCampaignPresent,
} from './mapViewingChronology';

describe('mapViewingChronology', () => {
  it('treats null view epoch as campaign present', () => {
    expect(isViewingCampaignPresent(null, '1000')).toBe(true);
    expect(formatMapViewingLabel(null, '1000', null)).toBe('Campaign present');
  });

  it('detects historical viewing', () => {
    expect(isViewingCampaignPresent('500', '1000')).toBe(false);
  });
});
