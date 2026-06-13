import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '../../config/env.js';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function resolveKey(): Buffer | null {
  const raw = env.authSecretsKey.trim();
  if (!raw) return null;
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) return null;
  return buf;
}

export function isSecretBoxConfigured(): boolean {
  return resolveKey() !== null;
}

/** Encrypt plaintext; returns base64(iv || tag || ciphertext). */
export function encryptSecret(plaintext: string): string {
  const key = resolveKey();
  if (!key) {
    throw new Error(
      'AUTH_SECRETS_KEY is not configured (requires 32-byte base64 key)',
    );
  }
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptSecret(ciphertextB64: string): string {
  const key = resolveKey();
  if (!key) {
    throw new Error(
      'AUTH_SECRETS_KEY is not configured (requires 32-byte base64 key)',
    );
  }
  const buf = Buffer.from(ciphertextB64, 'base64');
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error('Invalid encrypted secret payload');
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    'utf8',
  );
}

/** Dev-only: store plaintext when AUTH_SECRETS_KEY unset (local instances). */
export function encryptSecretOrDevStore(plaintext: string): string {
  if (isSecretBoxConfigured()) return encryptSecret(plaintext);
  if (env.nodeEnv === 'production') {
    throw new Error(
      'AUTH_SECRETS_KEY must be set in production to store identity provider secrets',
    );
  }
  return `dev:${plaintext}`;
}

export function decryptSecretOrDevStore(stored: string): string {
  if (stored.startsWith('dev:')) return stored.slice(4);
  return decryptSecret(stored);
}
