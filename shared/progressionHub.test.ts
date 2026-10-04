import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_PROGRESSION_SECTION,
  PROGRESSION_SECTIONS,
  resolveLegacyProgressionRedirect,
} from './progressionHub.js';

test('PROGRESSION_SECTIONS no longer includes scenes or sessionPrep', () => {
  const ids = PROGRESSION_SECTIONS.map((section) => section.id);
  assert.ok(!ids.includes('scenes' as never));
  assert.ok(!ids.includes('sessionPrep' as never));
  assert.equal(DEFAULT_PROGRESSION_SECTION, 'insights');
});

test('legacy scenes outline redirects to Adventure Scenes', () => {
  assert.deepEqual(resolveLegacyProgressionRedirect('scenes'), {
    destination: 'adventure',
    view: 'scenes',
  });
  assert.deepEqual(resolveLegacyProgressionRedirect('scenes', 'outline'), {
    destination: 'adventure',
    view: 'scenes',
  });
});

test('legacy scenes board/sequence redirect to Adventure Storyboard', () => {
  assert.deepEqual(resolveLegacyProgressionRedirect('scenes', 'board'), {
    destination: 'adventure',
    view: 'storyboard',
    storyboardLens: 'board',
  });
  assert.deepEqual(resolveLegacyProgressionRedirect('scenes', 'sequence'), {
    destination: 'adventure',
    view: 'storyboard',
    storyboardLens: 'sequence',
  });
  assert.deepEqual(resolveLegacyProgressionRedirect('storyboard'), {
    destination: 'adventure',
    view: 'storyboard',
    storyboardLens: 'board',
  });
  assert.deepEqual(resolveLegacyProgressionRedirect('sessionPrep'), {
    destination: 'adventure',
    view: 'storyboard',
  });
});

test('canonical progression sections still resolve in-place', () => {
  assert.deepEqual(resolveLegacyProgressionRedirect('developments'), {
    destination: 'progression',
    section: 'developments',
  });
});
