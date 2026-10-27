import assert from 'node:assert/strict';
import test from 'node:test';
import { getOrCreateUploadRetryKey } from './uploadRetryKey';

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
