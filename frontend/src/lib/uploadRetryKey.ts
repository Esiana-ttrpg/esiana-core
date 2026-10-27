/** Persist before dispatch so a lost creation response can be retried safely. */
export function getOrCreateUploadRetryKey(storageKey: string): string {
  const stored = localStorage.getItem(storageKey);
  if (stored !== null) return stored;
  const key = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
  localStorage.setItem(storageKey, key);
  return key;
}
