import assert from 'node:assert/strict';
import test from 'node:test';
import { extractSummaryFromMarkdown } from './workshopFormalize.ts';

test('extractSummaryFromMarkdown returns first paragraph', () => {
  const body = 'First paragraph here.\n\nSecond paragraph.';
  assert.equal(extractSummaryFromMarkdown(body), 'First paragraph here.');
});

test('extractSummaryFromMarkdown truncates long paragraphs', () => {
  const long = 'a'.repeat(400);
  const result = extractSummaryFromMarkdown(long, 100);
  assert.equal(result.length, 100);
  assert.ok(result.endsWith('…'));
});

test('extractSummaryFromMarkdown handles empty body', () => {
  assert.equal(extractSummaryFromMarkdown(''), '');
  assert.equal(extractSummaryFromMarkdown('   \n\n  '), '');
});
