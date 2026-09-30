import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyOperatorSuggestion,
  buildOperatorSuggestions,
  detectOperatorContext,
  reduceSuggestionKeyboard,
  type OperatorSuggestState,
} from './globalSearchOperatorSuggest.js';
import type { CampaignMemberIdentity } from '@/lib/campaignMemberIdentity';

describe('globalSearchOperatorSuggest', () => {
  it('detects type: context at caret', () => {
    const draft = 'Besaid type:ch';
    const ctx = detectOperatorContext(draft, draft.length);
    assert.ok(ctx);
    assert.equal(ctx!.operator, 'type');
    assert.equal(ctx!.partial, 'ch');
  });

  it('detects from: with quoted partial', () => {
    const draft = 'from:"All';
    const ctx = detectOperatorContext(draft, draft.length);
    assert.ok(ctx);
    assert.equal(ctx!.operator, 'from');
    assert.equal(ctx!.partial, 'All');
  });

  it('returns null when not completing an operator', () => {
    assert.equal(detectOperatorContext('Besaid', 6), null);
  });

  it('suggests type and in aliases', () => {
    const typeCtx = detectOperatorContext('type:', 5)!;
    const types = buildOperatorSuggestions(typeCtx);
    assert.ok(types.some((s) => s.insertValue === 'character'));

    const inCtx = detectOperatorContext('in:ses', 6)!;
    const scopes = buildOperatorSuggestions(inCtx);
    assert.ok(scopes.some((s) => s.insertValue === 'sessions'));
  });

  it('suggests members for from: and disambiguates duplicates without inserting ids', () => {
    const members: CampaignMemberIdentity[] = [
      {
        userId: 'u1',
        name: 'Allison',
        displayName: 'Allison',
        role: 'GAMEMASTER',
        identityPageId: null,
        playerContext: 'GM',
      },
      {
        userId: 'u2',
        name: 'Allison',
        displayName: 'Allison',
        role: 'PARTICIPANT',
        identityPageId: null,
        playerContext: 'Yuna',
      },
    ];
    const ctx = detectOperatorContext('from:', 5)!;
    const suggestions = buildOperatorSuggestions(ctx, { members });
    assert.equal(suggestions.length, 2);
    assert.ok(suggestions.every((s) => s.insertValue === 'Allison'));
    assert.ok(suggestions.every((s) => s.detail && !s.detail.includes('u1')));
    assert.ok(suggestions.every((s) => !s.insertValue.includes('u1')));
  });

  it('applies suggestion into draft', () => {
    const draft = 'Besaid type:ch';
    const ctx = detectOperatorContext(draft, draft.length)!;
    const { draft: next } = applyOperatorSuggestion(draft, ctx, {
      insertValue: 'character',
      label: 'Character',
    });
    assert.equal(next, 'Besaid type:character ');
  });

  it('keyboard navigates and accepts suggestions', () => {
    const base: OperatorSuggestState = {
      open: true,
      activeIndex: 0,
      suggestions: [
        { insertValue: 'character', label: 'Character' },
        { insertValue: 'location', label: 'Location' },
      ],
      context: detectOperatorContext('type:', 5),
    };
    const down = reduceSuggestionKeyboard(base, { type: 'ArrowDown' });
    assert.equal(down.state.activeIndex, 1);
    const enter = reduceSuggestionKeyboard(down.state, { type: 'Enter' });
    assert.equal(enter.effect.type, 'accept');
    if (enter.effect.type === 'accept') {
      assert.equal(enter.effect.suggestion.insertValue, 'location');
    }
    const esc = reduceSuggestionKeyboard(base, { type: 'Escape' });
    assert.equal(esc.effect.type, 'close');
    assert.equal(esc.state.open, false);
  });
});
