import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isCampaignScheduleConfigured } from './recruitmentReadiness.js';

describe('isCampaignScheduleConfigured', () => {
  it('returns false when any cadence field is blank', () => {
    assert.equal(
      isCampaignScheduleConfigured({
        scheduleFrequency: 'Weekly',
        scheduleDay: 'Saturday',
        scheduleTime: '',
      }),
      false,
    );
  });

  it('returns true when frequency, day, and time are set', () => {
    assert.equal(
      isCampaignScheduleConfigured({
        scheduleFrequency: 'Weekly',
        scheduleDay: 'Saturday',
        scheduleTime: '7:00 PM',
      }),
      true,
    );
  });
});
