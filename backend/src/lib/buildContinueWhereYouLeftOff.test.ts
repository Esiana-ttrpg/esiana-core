import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('buildContinueWhereYouLeftOff does not include page shortcut pins', () => {
  const source = readFileSync(
    new URL('./buildContinueWhereYouLeftOff.ts', import.meta.url),
    'utf8',
  );
  const fnStart = source.indexOf('export async function buildContinueWhereYouLeftOff');
  const fnEnd = source.indexOf('export async function buildPersonalPinned');
  assert.ok(fnStart >= 0 && fnEnd > fnStart);
  const fnBody = source.slice(fnStart, fnEnd);

  assert.ok(!fnBody.includes('pageShortcut'), 'continue feed should not query page shortcuts');
  assert.ok(!fnBody.includes('Pinned by you'), 'continue feed should not surface pin reasons');
});
