import assert from 'node:assert/strict';
import test from 'node:test';
import { UploadValidationError } from './uploadValidation.js';
import { assertTagIconUploadMeta, sanitizeTagIconSvg } from './tagIconSvg.js';

test('sanitizeTagIconSvg rejects empty SVG', () => {
  assert.throws(
    () => sanitizeTagIconSvg(Buffer.from('   ')),
    UploadValidationError,
  );
});

test('sanitizeTagIconSvg strips script from SVG', () => {
  const dirty = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle cx="1" cy="1" r="1"/></svg>',
  );
  const clean = sanitizeTagIconSvg(dirty).toString('utf8');
  assert.ok(clean.includes('<svg'));
  assert.equal(clean.includes('<script'), false);
  assert.ok(clean.includes('circle'));
});

test('sanitizeTagIconSvg keeps a valid svg', () => {
  const raw = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3"/></svg>',
  );
  const clean = sanitizeTagIconSvg(raw).toString('utf8');
  assert.ok(clean.includes('<svg'));
  assert.ok(clean.includes('circle'));
});

test('assertTagIconUploadMeta rejects non-svg names', () => {
  assert.throws(
    () => assertTagIconUploadMeta('image/png', 'icon.png', 12),
    UploadValidationError,
  );
});
