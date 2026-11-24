import assert from 'node:assert/strict';
import test from 'node:test';
import { hashApiToken } from '../apiToken.js';
import { generateReaderSecret, hashReaderSecret, parseReaderSecret } from './credentials.js';

test('reader credential digests are isolated from general API token authentication', () => {
  const secret = generateReaderSecret();
  assert.notEqual(hashReaderSecret(secret, 'key'), hashApiToken(secret));
  assert.notEqual(hashReaderSecret(secret, 'key'), hashApiToken(`esiana:opds:credential:v1\0${secret}`));
  assert.notEqual(hashReaderSecret(secret, 'key'), hashReaderSecret(secret, 'other-key'));
});

test('reader authentication parses Basic password and Bearer without accepting URL credentials', () => {
  assert.equal(parseReaderSecret(`Basic ${Buffer.from('reader:secret').toString('base64')}`), 'secret');
  assert.equal(parseReaderSecret('Bearer secret'), 'secret');
  assert.equal(parseReaderSecret(undefined), null);
  assert.equal(parseReaderSecret('Basic invalid!'), null);
  assert.equal(parseReaderSecret(`Basic ${Buffer.from('no-colon').toString('base64')}`), null);
});
