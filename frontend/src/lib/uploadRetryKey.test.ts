import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { getOrCreateUploadRetryKey, resumeStoredUpload } from './uploadRetryKey';
import { ApiError } from './api';

function uploadStorage(t: TestContext) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map([['upload', 'previous-id'], ['upload:create-key', 'previous-creation-key']]);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  } });
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  });
  return values;
}

for (const status of [404, 410]) {
  test(`a ${status} upload lookup clears both saved identifiers so creation gets a fresh key`, async (t) => {
    const values = uploadStorage(t);
    assert.equal(await resumeStoredUpload('upload', async () => { throw new ApiError('Gone', status); }), null);
    assert.equal(values.has('upload'), false);
    assert.equal(values.has('upload:create-key'), false);
    assert.notEqual(getOrCreateUploadRetryKey('upload:create-key'), 'previous-creation-key');
  });
}

test('transport and permission lookup failures retain both retry identifiers and propagate the error', async (t) => {
  const values = uploadStorage(t);
  for (const error of [new TypeError('Network failed'), new ApiError('Denied', 403), new ApiError('Unavailable', 503)]) {
    await assert.rejects(() => resumeStoredUpload('upload', async () => { throw error; }), (caught: unknown) => caught === error);
    assert.equal(values.get('upload'), 'previous-id');
    assert.equal(values.get('upload:create-key'), 'previous-creation-key');
  }
});

test('a successful upload lookup reuses its saved progress', async (t) => {
  const values = uploadStorage(t);
  const progress = { id: 'previous-id', offsetBytes: '8388608' };
  assert.equal(await resumeStoredUpload('upload', async (id) => { assert.equal(id, progress.id); return progress; }), progress);
  assert.equal(values.get('upload:create-key'), 'previous-creation-key');
});

for (const hasUuid of [true, false]) {
  test(`upload retry keys persist and survive retries ${hasUuid ? 'with randomUUID' : 'on HTTP without randomUUID'}`, (t) => {
    const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    t.after(() => {
      if (cryptoDescriptor) Object.defineProperty(globalThis, 'crypto', cryptoDescriptor);
      else Reflect.deleteProperty(globalThis, 'crypto');
      if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    });
    const values = new Map<string, string>();
    let generations = 0;
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    } });
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: {
      ...(hasUuid ? { randomUUID: () => { generations++; return 'uuid-fixture'; } } : {}),
      getRandomValues: (bytes: Uint8Array) => { generations++; bytes.set(Array.from({ length: 16 }, (_, index) => index)); return bytes; },
    } });
    values.set('already-stored', 'original-key');
    assert.equal(getOrCreateUploadRetryKey('already-stored'), 'original-key');
    assert.equal(generations, 0);
    const created = getOrCreateUploadRetryKey('backup-create-key');
    assert.equal(created, hasUuid ? 'uuid-fixture' : '000102030405060708090a0b0c0d0e0f');
    assert.match(created, /^[A-Za-z0-9._:-]{1,200}$/);
    assert.equal(values.get('backup-create-key'), created);
    assert.equal(getOrCreateUploadRetryKey('backup-create-key'), created);
    assert.equal(generations, 1);
  });
}
