import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatCampaignHeaderSubtitle } from './campaignHeaderSubtitle.js';

describe('formatCampaignHeaderSubtitle', () => {
  it('joins priority segments with middle dots', () => {
    const result = formatCampaignHeaderSubtitle({
      worldTimeLabel: 'Late Autumn',
      sessionLabel: 'Session 18',
      cadenceLabel: 'Biweekly',
      partyLabel: 'Party of 4',
      recruitmentLabel: 'Open seats',
    });
    assert.equal(result, 'Late Autumn · Session 18 · Biweekly');
  });

  it('caps at three segments', () => {
    const result = formatCampaignHeaderSubtitle({
      worldTimeLabel: 'One',
      sessionLabel: 'Two',
      cadenceLabel: 'Three',
      partyLabel: 'Four',
      recruitmentLabel: 'Five',
    });
    assert.equal(result, 'One · Two · Three');
  });

  it('excludes party and recruitment labels', () => {
    const result = formatCampaignHeaderSubtitle({
      worldTimeLabel: null,
      sessionLabel: null,
      cadenceLabel: null,
      partyLabel: 'Party of 4',
      recruitmentLabel: 'Open seats',
    });
    assert.equal(result, null);
  });

  it('returns null when no eligible segments exist', () => {
    const result = formatCampaignHeaderSubtitle({
      worldTimeLabel: '  ',
      sessionLabel: null,
      cadenceLabel: undefined as unknown as null,
      partyLabel: null,
      recruitmentLabel: null,
    });
    assert.equal(result, null);
  });
});
