import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChronologyCategoryLabel } from './ChronologyCategoryLabel.js';

test('category presentation follows saved labels, colors and icons after a rename', () => {
  const html = renderToStaticMarkup(<ChronologyCategoryLabel category={{ id: 'discovery', campaignId: 'campaign', name: 'Archives', color: '#123456', icon: 'compass' }} />);
  assert.match(html, /Archives/);
  assert.match(html, /color:#123456/);
  assert.match(html, /lucide-compass/);
  assert.doesNotMatch(html, /Discovery/);
  assert.match(renderToStaticMarkup(<ChronologyCategoryLabel />), /Uncategorized/);
});

test('legacy saved Uncategorized remains distinct from the virtual fallback', () => {
  const html = renderToStaticMarkup(<ChronologyCategoryLabel category={{ id: 'legacy', campaignId: 'campaign', name: 'Uncategorized', color: '#123456', icon: 'tag' }} />);
  assert.match(html, /Uncategorized \(saved category\)/);
  assert.doesNotMatch(renderToStaticMarkup(<ChronologyCategoryLabel />), /saved category/);
});
