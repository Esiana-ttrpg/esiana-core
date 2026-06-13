import test from 'node:test';
import assert from 'node:assert/strict';
import { consumePasswordResetToken } from './passwordReset.js';

test('consumePasswordResetToken rejects empty token', async () => {
  const result = await consumePasswordResetToken('', 'newpassword1');
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /invalid or expired/i);
  }
});

test('consumePasswordResetToken rejects short password', async () => {
  const result = await consumePasswordResetToken('some-token', 'short');
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /at least 8/i);
  }
});

test('consumePasswordResetToken rejects unknown token', async () => {
  const result = await consumePasswordResetToken(
    'totally-unknown-token-value',
    'validpass1',
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /invalid or expired/i);
  }
});
