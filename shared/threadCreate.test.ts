import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildThreadBodyMarkdown,
  suggestThreadKindFromContext,
  THREAD_KIND_CREATE_COPY,
} from './threadCreate.js';

describe('buildThreadBodyMarkdown', () => {
  it('seeds mystery prompts', () => {
    const md = buildThreadBodyMarkdown('mystery');
    assert.ok(md.includes('What is unknown'));
  });

  it('seeds theory prompts', () => {
    const md = buildThreadBodyMarkdown('theory');
    assert.ok(md.includes('Who proposed'));
  });
});

describe('suggestThreadKindFromContext', () => {
  it('suggests foreshadowing for quests', () => {
    assert.equal(suggestThreadKindFromContext('quest'), 'foreshadowing');
  });

  it('defaults to mystery', () => {
    assert.equal(suggestThreadKindFromContext(null), 'mystery');
  });
});

describe('THREAD_KIND_CREATE_COPY', () => {
  it('covers all five kinds', () => {
    assert.equal(Object.keys(THREAD_KIND_CREATE_COPY).length, 5);
  });
});
