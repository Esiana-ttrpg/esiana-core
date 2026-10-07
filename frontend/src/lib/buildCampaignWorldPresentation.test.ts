import assert from 'node:assert/strict';
import test from 'node:test';

import type { CampaignSummary } from '@/types/campaign';
import { buildCampaignWorldPresentation } from './buildCampaignWorldPresentation';

function campaign(overrides: Partial<CampaignSummary> = {}): CampaignSummary {
  return {
    id: 'campaign-1',
    handle: 'magical-girls',
    name: 'Magical Girls',
    description: null,
    discoverability: 'PUBLIC',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    role: null,
    isMember: true,
    ...overrides,
  };
}

for (const [label, heroImageUrl] of [
  ['image-backed', 'https://example.test/cover.jpg'],
  ['plain-color', null],
] as const) {
  test(`does not repeat the headline as supporting text on ${label} cards`, () => {
    const presentation = buildCampaignWorldPresentation(
      campaign({ heroImageUrl }),
      {
        currentArc: 'fightdsaf',
        tensionLine: '  FIGHTDSAF  ',
        continuityBullets: ['The observatory was edited recently'],
      },
    );

    assert.equal(presentation.arcTitle, 'fightdsaf');
    assert.equal(presentation.tensionLine, null);
    assert.deepEqual(presentation.continuityLines, ['The observatory was edited recently']);
  });
}

test('keeps distinct recent activity as supporting text', () => {
  const presentation = buildCampaignWorldPresentation(campaign(), {
    currentArc: 'fightdsaf',
    tensionLine: 'The Moon Court answered the signal.',
    continuityBullets: [],
  });

  assert.equal(presentation.tensionLine, 'The Moon Court answered the signal.');
});

test('cover overlay uses localized bottom readability, not a full-card mid wash', () => {
  const presentation = buildCampaignWorldPresentation(
    campaign({ heroImageUrl: 'https://example.test/cover.jpg' }),
  );
  const background = String(presentation.overlayStyle.background ?? '');

  assert.match(background, /transparent 100%/);
  assert.doesNotMatch(background, /rgba\(0,0,0,[0-9.]+\) 50%/);
  const vars = presentation.cardStyle as Record<string, string>;
  assert.equal(vars['--hub-art-fg'], 'rgb(245 240 232)');
  assert.ok(presentation.accentRgb.includes(','));
});

test('exposes artwork-safe foreground contract for on-cover type', () => {
  const presentation = buildCampaignWorldPresentation(campaign());
  const vars = presentation.cardStyle as Record<string, string>;
  assert.equal(vars['--hub-art-fg'], 'rgb(245 240 232)');
  assert.equal(vars['--hub-art-fg-muted'], 'rgb(245 240 232 / 0.78)');
});
