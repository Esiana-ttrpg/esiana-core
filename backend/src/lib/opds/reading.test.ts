import assert from 'node:assert/strict';
import test from 'node:test';
import { renderReadingPage } from './reading.js';

test('preserves prose formatting and strips executable and embedded content', () => {
  const html = renderReadingPage({ title: '<Elara>', blocks: [{ type: 'text-tiptap', content: {
    markdown: '## Lore\n\n**Scholar**\n\n- First\n- Second\n\n<script>alert(1)</script>\n\n<a href="javascript:alert(1)" onclick="bad()">link</a>\n\n![image](https://example.com/private.png)',
  } }] }, '/c/test');
  assert.match(html, /<h2>Lore<\/h2>/);
  assert.match(html, /<strong>Scholar<\/strong>/);
  assert.match(html, /<li>First<\/li>/);
  assert.match(html, /&lt;Elara&gt;/);
  assert.doesNotMatch(html, /<script|javascript:|onclick|<img/i);
});
