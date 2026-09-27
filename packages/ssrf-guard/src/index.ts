export {
  SsrfGuardError,
  assertAllowedImportProtocol,
  assertUrlSafeForImport,
  isUrlSafeForImportSync,
  resolveUrlSafeForRemoteFetch,
  resolveUrlAddressesForRemoteFetch,
} from './ssrfGuard.js';
export type { ValidatedRemoteAddress } from './ssrfGuard.js';
