import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { GlobalSearchFilterChips } from './GlobalSearchFilterChips.js';

describe('GlobalSearchFilterChips', () => {
  it('renders nothing when empty', () => {
    const html = renderToStaticMarkup(
      <GlobalSearchFilterChips chips={[]} onRemove={() => undefined} />,
    );
    assert.equal(html, '');
  });

  it('renders removable chip labels', () => {
    const html = renderToStaticMarkup(
      <GlobalSearchFilterChips
        chips={[
          { kind: 'type', value: 'character', label: 'Character' },
          { kind: 'from', value: 'Allison', label: 'From Allison' },
        ]}
        onRemove={() => undefined}
      />,
    );
    assert.match(html, /Character/);
    assert.match(html, /From Allison/);
    assert.match(html, /Remove filter Character/);
  });
});
