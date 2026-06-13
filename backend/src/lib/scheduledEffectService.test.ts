import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateScheduledEffectCreateFields } from './scheduledEffectService.js';

describe('validateScheduledEffectCreateFields', () => {
  it('requires amount for treasury schedules', () => {
    assert.throws(
      () =>
        validateScheduledEffectCreateFields({
          effectKind: 'ledger_upkeep',
          amount: null,
        }),
      /amount is required/i,
    );
  });

  it('rejects organization scope on treasury schedules', () => {
    assert.throws(
      () =>
        validateScheduledEffectCreateFields({
          effectKind: 'ledger_income',
          amount: 50,
          primaryOrgPageId: 'org-1',
        }),
      /organization scope is not allowed/i,
    );
  });

  it('rejects haven on world development prompts', () => {
    assert.throws(
      () =>
        validateScheduledEffectCreateFields({
          effectKind: 'world_development_prompt',
          havenWikiPageId: 'haven-1',
        }),
      /haven scope is not allowed/i,
    );
  });

  it('requires haven for haven threat prompts', () => {
    assert.throws(
      () =>
        validateScheduledEffectCreateFields({
          effectKind: 'haven_threat_prompt',
        }),
      /haven is required/i,
    );
  });

  it('rejects primary org on haven threat prompts', () => {
    assert.throws(
      () =>
        validateScheduledEffectCreateFields({
          effectKind: 'haven_threat_prompt',
          havenWikiPageId: 'haven-1',
          primaryOrgPageId: 'org-1',
        }),
      /organization scope is not allowed|not both/i,
    );
  });

  it('accepts valid narrative schedule fields', () => {
    const worldDev = validateScheduledEffectCreateFields({
      effectKind: 'world_development_prompt',
      primaryOrgPageId: 'org-1',
    });
    assert.equal(worldDev.amount, null);
    assert.deepEqual(worldDev.effectPayload, { primaryOrgPageId: 'org-1' });

    const threat = validateScheduledEffectCreateFields({
      effectKind: 'haven_threat_prompt',
      havenWikiPageId: 'haven-1',
    });
    assert.equal(threat.havenWikiPageId, 'haven-1');
    assert.equal(threat.effectPayload, null);
  });
});
