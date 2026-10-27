import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import test from 'node:test';
import { normalizeProviderResult, transcribeHttp } from './transcriptionHttp.js';
import type { ProcessingConnection } from './prismaClient.js';
test('Whisper response profiles normalize seconds and millisecond offsets', () => {
  assert.deepEqual(normalizeProviderResult({ language: 'en', segments: [{ start: 0.1, end: 1.25, text: 'A map' }] }).segments[0],
    { startMs: 100, endMs: 1250, text: 'A map', speaker: null });
  assert.equal(normalizeProviderResult({ transcription: [{ offsets: { from: 100, to: 1250 }, text: 'A map' }] }).segments[0].endMs, 1250);
  assert.throws(() => normalizeProviderResult({ text: 'No timestamps' }));
  assert.throws(() => normalizeProviderResult({ segments: [{ start: 10, end: 2, text: 'Bad times' }] }));
});
test('both HTTP profiles stream multipart media and request timestamped results', async () => {
  const requests: { path: string; body: string }[] = [];
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(chunk);
    requests.push({ path: req.url!, body: Buffer.concat(chunks).toString() });
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(req.url === '/inference' ? { transcription: [{ offsets: { from: 0, to: 1000 }, text: 'A discovery' }] } :
      { segments: [{ start: 0, end: 1, text: 'A discovery' }] }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  try {
    for (const protocol of ['whisper_cpp', 'openai_transcription']) {
      const connection = { protocol, endpoint: `http://127.0.0.1:${port}/${protocol === 'whisper_cpp' ? 'inference' : 'v1/audio/transcriptions'}`,
        allowPrivateNetwork: true, encryptedCredential: null, timeoutSeconds: 10 } as ProcessingConnection;
      const result = await transcribeHttp({ connection, modelKey: protocol === 'openai_transcription' ? 'whisper-model' : undefined,
        stream: Readable.from([Buffer.from('audio-fixture')]), sizeBytes: 13, mimeType: 'audio/wav', format: 'wav',
        signal: new AbortController().signal, maxResultBytes: 10000 });
      assert.equal(result.segments[0].text, 'A discovery');
    }
    assert.equal(requests.length, 2); assert.match(requests[0].body, /verbose_json/); assert.match(requests[0].body, /audio-fixture/);
    assert.match(requests[1].body, /timestamp_granularities/); assert.match(requests[1].body, /whisper-model/);
  } finally { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); }
});
