import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { EntitySubviewNav } from './EntitySubviewNav';

test('measures the same rendered tabs, including the padded DM badge', () => {
  const html = renderToStaticMarkup(<EntitySubviewNav
    subviews={[
      { id: 'overview', label: 'Overview', navPriority: 0 },
      { id: 'secrets', label: 'Secrets', navPriority: 1, dmOnly: true },
    ]}
    activeSubview="overview"
    onSubviewChange={() => {}}
    isDMUser
  />);
  const buttons = [...html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].map(([button]) => button);
  // Hidden measurement controls: Overview, Secrets + badge, More.
  // Visible controls initially: Overview, Secrets + badge.
  assert.equal(buttons.length, 5);
  assert.equal(buttons[0], buttons[3]);
  assert.equal(buttons[1], buttons[4]);
  assert.match(buttons[1], />DM<\/span>/);
  assert.match(buttons[2], /More/);
  assert.match(html, /aria-hidden="true" inert=""/);
});
