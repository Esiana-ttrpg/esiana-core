import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import {
  assertDocumentFile,
  assertZipFile,
  resolveSafeUploadPath,
  UploadValidationError,
} from './uploadValidation.js';
import { env } from '../config/env.js';

test('assertDocumentFile rejects empty buffer', () => {
  assert.throws(
    () => assertDocumentFile(Buffer.alloc(0), '.txt'),
    UploadValidationError,
  );
});

test('assertDocumentFile rejects legacy .doc', () => {
  assert.throws(
    () => assertDocumentFile(Buffer.from('data'), '.doc'),
    (err: unknown) =>
      err instanceof UploadValidationError &&
      err.message.includes('.docx'),
  );
});

test('assertDocumentFile accepts .txt', () => {
  assert.doesNotThrow(() =>
    assertDocumentFile(Buffer.from('hello'), '.txt'),
  );
});

test('assertZipFile requires PK header', () => {
  assert.throws(() => assertZipFile(Buffer.from('not-a-zip')), UploadValidationError);
  const zipHead = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]);
  assert.doesNotThrow(() => assertZipFile(zipHead));
});

test('resolveSafeUploadPath confines reads to uploadsDir', () => {
  const inside = resolveSafeUploadPath(path.join(env.uploadsDir, 'abc.webp'));
  assert.equal(inside, path.resolve(env.uploadsDir, 'abc.webp'));

  assert.throws(
    () => resolveSafeUploadPath(path.join(env.uploadsDir, '..', 'secrets.txt')),
    UploadValidationError,
  );
  assert.throws(
    () => resolveSafeUploadPath('/etc/passwd'),
    UploadValidationError,
  );
});
