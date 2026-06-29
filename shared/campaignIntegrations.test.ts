import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  deriveExternalToolLabels,
  deriveIntegrationProviders,
  resolveExternalToolLabels,
  sanitizeCampaignIntegrations,
  validateIntegrationUrl,
} from './campaignIntegrations.js';

describe('campaignIntegrations', () => {
  it('validates http and https URLs', () => {
    assert.equal(validateIntegrationUrl('https://discord.gg/abc').ok, true);
    assert.equal(validateIntegrationUrl('http://foundry.lan/game').ok, true);
    assert.equal(validateIntegrationUrl('http://foundry.lan/game').warnHttp, true);
  });

  it('rejects dangerous and invalid URLs', () => {
    assert.equal(validateIntegrationUrl('javascript:alert(1)').ok, false);
    assert.equal(validateIntegrationUrl('not-a-url').ok, false);
    assert.equal(validateIntegrationUrl('').ok, false);
  });

  it('sanitizes integrations per slot provider enums', () => {
    const result = sanitizeCampaignIntegrations({
      chat: { provider: 'discord', url: 'https://discord.gg/test' },
      tabletop: { provider: 'foundry', url: 'https://foundry.example.com' },
    });
    assert.deepEqual(result, {
      chat: { provider: 'discord', url: 'https://discord.gg/test' },
      tabletop: { provider: 'foundry', url: 'https://foundry.example.com' },
    });
  });

  it('rejects tabletop provider in chat slot', () => {
    assert.throws(() =>
      sanitizeCampaignIntegrations({
        chat: { provider: 'foundry', url: 'https://foundry.example.com' },
      }),
    );
  });

  it('derives external tool labels in slot order', () => {
    const labels = deriveExternalToolLabels({
      tabletop: { provider: 'roll20', url: 'https://app.roll20.net/join/1' },
      chat: { provider: 'slack', url: 'https://slack.com/app' },
    });
    assert.deepEqual(labels, ['Slack', 'Roll20']);
  });

  it('derives integration providers only when URL is configured', () => {
    assert.deepEqual(
      deriveIntegrationProviders({
        chat: { provider: 'discord', url: 'https://discord.gg/test' },
        tabletop: { provider: 'foundry', url: '' },
      }),
      ['discord'],
    );
    assert.deepEqual(deriveIntegrationProviders(null), []);
  });

  it('derives providers in slot order', () => {
    assert.deepEqual(
      deriveIntegrationProviders({
        tabletop: { provider: 'roll20', url: 'https://app.roll20.net/join/1' },
        chat: { provider: 'slack', url: 'https://slack.com/app' },
      }),
      ['slack', 'roll20'],
    );
  });

  it('falls back to legacy external tools when integrations empty', () => {
    const labels = resolveExternalToolLabels(null, ['Discord', 'Foundry VTT']);
    assert.deepEqual(labels, ['Discord', 'Foundry VTT']);
  });

  it('prefers integrations over legacy external tools', () => {
    const labels = resolveExternalToolLabels(
      { chat: { provider: 'telegram', url: 'https://t.me/group' } },
      ['Discord'],
    );
    assert.deepEqual(labels, ['Telegram']);
  });
});
