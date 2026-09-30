import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseOverlayMode } from './overlayMode.js';

describe('parseOverlayMode', () => {
  it('returns search mode when draft does not start with >', () => {
    assert.deepEqual(parseOverlayMode(''), { mode: 'search' });
    assert.deepEqual(parseOverlayMode('yuna'), { mode: 'search' });
    assert.deepEqual(parseOverlayMode(' type:'), { mode: 'search' });
  });

  it('enters command mode on leading >', () => {
    assert.deepEqual(parseOverlayMode('>'), { mode: 'command', query: '' });
    assert.deepEqual(parseOverlayMode('>create'), {
      mode: 'command',
      query: 'create',
    });
    assert.deepEqual(parseOverlayMode('> Create Character'), {
      mode: 'command',
      query: 'Create Character',
    });
  });

  it('strips only leading whitespace after >', () => {
    assert.deepEqual(parseOverlayMode('>  edit'), {
      mode: 'command',
      query: 'edit',
    });
  });
});
