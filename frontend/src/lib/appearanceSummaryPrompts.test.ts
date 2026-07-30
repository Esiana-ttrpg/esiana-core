import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  APPEARANCE_MICRO_PROMPTS,
  APPEARANCE_WRITING_PROMPTS,
  pickAppearanceMicroPrompt,
} from './appearanceSummaryPrompts.ts';

describe('appearanceSummaryPrompts', () => {
  it('includes perception-oriented writing dimensions', () => {
    assert.ok(APPEARANCE_WRITING_PROMPTS.includes('gender presentation or expression'));
    assert.ok(APPEARANCE_WRITING_PROMPTS.includes('movement and body language'));
    assert.ok(APPEARANCE_WRITING_PROMPTS.includes('nonhuman or uncanny qualities'));
  });

  it('returns a micro-prompt from the curated list', () => {
    const prompt = pickAppearanceMicroPrompt();
    assert.ok(APPEARANCE_MICRO_PROMPTS.includes(prompt as (typeof APPEARANCE_MICRO_PROMPTS)[number]));
  });
});
