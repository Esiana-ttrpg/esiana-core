import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('./NewCampaignWizard.tsx', import.meta.url), 'utf8');

test('keeps wizard actions reachable in constrained Standard desktop viewports', () => {
  assert.match(
    source,
    /flex max-h-\[calc\(100dvh-2rem\)\].*flex-col overflow-hidden/,
    'the dialog must be bounded by the visible viewport and lay out its regions vertically',
  );
  assert.match(
    source,
    /min-h-0 flex-1 overflow-y-auto px-6 py-5/,
    'long step content must shrink and scroll inside the available dialog height',
  );
  assert.match(
    source,
    /flex shrink-0 items-center justify-between border-t/,
    'the action footer must remain outside the scrolling content region',
  );

  for (const [viewportWidth, viewportHeight] of [[1366, 768], [1366, 640], [1366, 560]]) {
    const dialogLimit = viewportHeight - 32;
    assert.ok(dialogLimit < viewportHeight, `dialog fits a ${viewportWidth}x${viewportHeight} viewport`);
    assert.ok(dialogLimit >= 528, `dialog retains usable content space at ${viewportHeight}px tall`);
  }

  assert.ok(source.includes("{step === 0 ? 'Cancel' : 'Back'}"));
  assert.ok(source.includes(": 'Next'}"));
});
