import { ActiveStorageUnavailableError } from './storage/storageRegistry.js';

export function isActiveStorageUnavailableError(
  error: unknown,
): error is ActiveStorageUnavailableError {
  return error instanceof ActiveStorageUnavailableError;
}

export function storageUnavailableStatusPayload(error: unknown): {
  status: 503;
  body: { error: string; storageUnavailable: true };
} {
  const message =
    error instanceof ActiveStorageUnavailableError
      ? error.message
      : 'Storage provider is unavailable';
  return {
    status: 503,
    body: {
      error: message,
      storageUnavailable: true,
    },
  };
}
