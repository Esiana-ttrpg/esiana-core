import assert from 'node:assert/strict';
import test from 'node:test';
import { htmlToMarkdown } from './htmlToMarkdown.js';

test('htmlToMarkdown converts basic Kanka HTML', () => {
  const html =
    '<p><strong>Kane</strong> rules <em>Steel Meridian</em>.</p><ul><li><p>First</p></li></ul>';
  const md = htmlToMarkdown(html);
  assert.match(md, /\*\*Kane\*\*/);
  assert.match(md, /\*Steel Meridian\*/);
  assert.match(md, /- First/);
});

test('htmlToMarkdown strips nested or malformed tags', () => {
  const md = htmlToMarkdown('<p><<script>alert(1)</script>></p>');
  assert.doesNotMatch(md, /</);
  assert.doesNotMatch(md, />/);
});
