import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchMapScene } from './mapScene.js';

test('scene requests preserve omitted, empty, and selected layer IDs on the wire', async () => {
  const original = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = async input => {
    urls.push(String(input));
    return new Response(JSON.stringify({ scene: {} }), { status: 200 });
  };
  try {
    await fetchMapScene('campaign', 'first');
    await fetchMapScene('campaign', 'first', { layerIds: [] });
    await fetchMapScene('campaign', 'first', { layerIds: ['a', 'b'] });
    await fetchMapScene('campaign', 'second');
    const params = urls.map(url => new URL(url, 'https://example.test').searchParams);
    assert.equal(params[0].has('layerIds'), false);
    assert.equal(params[1].get('layerIds'), '');
    assert.equal(params[2].get('layerIds'), 'a,b');
    assert.equal(params[3].has('layerIds'), false);
  } finally { globalThis.fetch = original; }
});
