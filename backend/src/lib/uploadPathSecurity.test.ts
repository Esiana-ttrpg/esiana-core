import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { prisma } from './prisma.js';
import { importFromUpload } from './assetImport.js';
import { AssetTypes } from '../types/domain.js';
import {
  resolveUploadedFilePath,
  UploadValidationError,
  validateWizardUploadFile,
} from './uploadValidation.js';
import {
  enforceSystemUploadLimit,
  enforceWizardUploadLimits,
} from '../middleware/uploadLimit.js';

function upload(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    filename: 'upload.zip',
    originalname: 'archive.zip',
    fieldname: 'backupZipFile',
    mimetype: 'application/zip',
    size: 2 * 1024 * 1024,
    ...overrides,
  } as Express.Multer.File;
}

const outside = path.resolve(env.uploadsDir, '..', 'outside-upload.zip');

test('upload metadata paths stay inside the upload root', () => {
  assert.equal(resolveUploadedFilePath(upload()), path.resolve(env.uploadsDir, 'upload.zip'));
  const inside = path.resolve(env.uploadsDir, 'stored.zip');
  assert.equal(resolveUploadedFilePath(upload({ path: inside })), inside);
  for (const filename of ['../outside-upload.zip', outside, '.', '', 'bad\0.zip']) {
    assert.throws(() => resolveUploadedFilePath(upload({ filename })), UploadValidationError);
  }
  // An invalid explicit path must not fall back to a harmless-looking filename.
  assert.throws(() => resolveUploadedFilePath(upload({ path: outside })), UploadValidationError);
});

test('wizard and asset import reject escapes before probing or reading disk', async (t) => {
  const exists = t.mock.method(fs, 'existsSync', () => { throw new Error('Unexpected disk probe'); });
  const read = t.mock.method(fs.promises, 'readFile', async () => { throw new Error('Unexpected read'); });
  for (const file of [upload({ path: outside }), upload({ filename: '../outside-upload.zip' })]) {
    await assert.rejects(validateWizardUploadFile(file), UploadValidationError);
    await assert.rejects(importFromUpload({ campaignId: 'campaign', file, type: AssetTypes.GENERIC }), UploadValidationError);
  }
  assert.equal(exists.mock.callCount(), 0);
  assert.equal(read.mock.callCount(), 0);
});

test('wizard ZIP validation reads a confined disk upload', async (t) => {
  t.mock.method(fs, 'existsSync', () => true);
  const read = t.mock.method(fs.promises, 'readFile', async () => Buffer.from('PK\x03\x04'));
  await validateWizardUploadFile(upload());
  assert.equal(read.mock.calls[0].arguments[0], path.resolve(env.uploadsDir, 'upload.zip'));
});

test('both size limit middlewares reject oversized uploads without deleting outside files', async (t) => {
  const originalUpsert = prisma.systemSetting.upsert;
  prisma.systemSetting.upsert = (async () => ({ maxUploadSizeMb: 1 })) as typeof originalUpsert;
  t.after(() => { prisma.systemSetting.upsert = originalUpsert; });
  const unlink = t.mock.method(fs, 'unlink', (() => {}) as typeof fs.unlink);
  for (const middleware of [enforceSystemUploadLimit, enforceWizardUploadLimits]) {
    for (const diskPath of [outside, '../outside-upload.zip', env.uploadsDir, path.resolve(env.uploadsDir, 'upload.zip'), undefined]) {
      const file = upload({ path: diskPath });
      const req = { file, files: { backupZipFile: [file] }, body: {} } as unknown as Request;
      let status = 0;
      const res = {
        status(value: number) { status = value; return this; },
        json() { return this; },
      } as unknown as Response;
      const before = unlink.mock.callCount();
      await middleware(req, res, () => assert.fail('Oversized upload accepted'));
      assert.equal(status, 400);
      const validDiskPath = diskPath === path.resolve(env.uploadsDir, 'upload.zip');
      assert.equal(unlink.mock.callCount() - before, validDiskPath ? 1 : 0);
      if (validDiskPath) assert.equal(unlink.mock.calls.at(-1)!.arguments[0], diskPath);
    }
  }
});
