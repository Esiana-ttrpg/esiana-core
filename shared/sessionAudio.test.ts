import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateOffsets, fileAtPosition, normalizeSegments, parseTranscript } from './sessionAudio.js';
import { canReadRecording, evaluateProcessingPolicy } from './processingPolicy.js';

test('logical seeking assigns boundaries to the next file and allows the final endpoint', () => {
  const files = calculateOffsets([{ id: 'a', durationMs: 1000 }, { id: 'b', durationMs: 2000 }]);
  assert.deepEqual(fileAtPosition(files, 1000), { fileId: 'b', fileStartMs: 0 });
  assert.deepEqual(fileAtPosition(files, 3000), { fileId: 'b', fileStartMs: 2000 });
  assert.throws(() => fileAtPosition(files, 3001));
  assert.throws(() => calculateOffsets([{ durationMs: -1 }]));
});
test('plain text remains untimed; SRT and VTT preserve millisecond cue positions', () => {
  assert.deepEqual(parseTranscript('A discovery', 'txt'), [{ startMs: null, endMs: null, text: 'A discovery' }]);
  assert.deepEqual(parseTranscript('1\n00:00:01,250 --> 00:00:03,000\nNeris finds a letter.', 'srt'),
    [{ startMs: 1250, endMs: 3000, text: 'Neris finds a letter.' }]);
  assert.equal(parseTranscript('WEBVTT\n\n00:01.250 --> 00:03.000\nA letter', 'vtt')[0].startMs, 1250);
  assert.throws(() => normalizeSegments([{ startMs: 10, endMs: 30, text: 'invalid' }], 20));
  assert.throws(() => parseTranscript('{"text":"no array"}', 'json'));
});
test('provider administration cannot substitute for campaign content access', () => {
  const input = { member: false, sessionVisible: true, staff: false, manager: false, uploader: false, visibility: 'campaign' };
  assert.equal(canReadRecording(input), false);
  assert.equal(canReadRecording({ ...input, member: true, visibility: 'uploader_and_managers' }), false);
  assert.equal(canReadRecording({ ...input, member: true, manager: true, visibility: 'uploader_and_managers' }), true);
  assert.equal(canReadRecording({ ...input, member: true, manager: true, sessionVisible: false }), false);
});
test('every processing policy layer must authorize independently', () => {
  const input = { member: true, actorAllowed: true, globallyEnabled: true, connectionEnabled: true, modelEnabled: true,
    capabilitySupported: true, grantEnabled: true, featureEnabled: true, modelPermitted: true, quotaAvailable: true };
  assert.deepEqual(evaluateProcessingPolicy(input), { allowed: true });
  for (const key of Object.keys(input)) assert.equal(evaluateProcessingPolicy({ ...input, [key]: false }).allowed, false, key);
});
