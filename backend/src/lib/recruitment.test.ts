import assert from 'node:assert/strict';
import { it } from 'node:test';
import { sanitizeRecruitmentText } from './recruitment.js';

it('removes tags reconstructed by nested tag removal before truncation', () => {
  assert.equal(sanitizeRecruitmentText('<scr<script>ipt>Discover</scr</script>ipt>'), 'Discover');
  assert.equal(sanitizeRecruitmentText('<scr<script>ipt>Discover', 4), 'Disc');
});

it('preserves recruitment text validation and ordinary formatting removal', () => {
  assert.equal(sanitizeRecruitmentText(null), null);
  assert.equal(sanitizeRecruitmentText(42), null);
  assert.equal(sanitizeRecruitmentText('  '), null);
  assert.equal(sanitizeRecruitmentText('  <b>Discover</b> together  '), 'Discover together');
  assert.equal(sanitizeRecruitmentText('Meet at 7 < 9'), 'Meet at 7 < 9');
});
