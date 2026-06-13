import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertDocumentFile,
  assertZipFile,
  UploadValidationError,
} from './uploadValidation.js';

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
