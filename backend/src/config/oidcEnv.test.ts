import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AuthEnvValidationError,
  loadOidcEnvConfig,
  parseOidcManagementMode,
  parseStrictBoolEnv,
  resetOidcEnvConfigCache,
  validateAuthEnvContract,
} from './oidcEnv.js';

function withEnv(
  vars: Record<string, string | undefined>,
  fn: () => void,
): void {
  const prior = { ...process.env };
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  resetOidcEnvConfigCache();
  try {
    fn();
  } finally {
    process.env = prior;
    resetOidcEnvConfigCache();
  }
}

test('parseOidcManagementMode tri-state', () => {
  assert.equal(parseOidcManagementMode(undefined), 'admin-managed');
  assert.equal(parseOidcManagementMode(''), 'admin-managed');
  assert.equal(parseOidcManagementMode('true'), 'env-managed');
  assert.equal(parseOidcManagementMode('false'), 'force-disabled');
});

test('parseStrictBoolEnv', () => {
  assert.equal(parseStrictBoolEnv(undefined), null);
  assert.equal(parseStrictBoolEnv('true'), true);
  assert.equal(parseStrictBoolEnv('false'), false);
});

test('loadOidcEnvConfig defaults', () => {
  withEnv(
    {
      OIDC_ENABLED: undefined,
      LOCAL_LOGIN_ENABLED: undefined,
      OIDC_PROVIDER_NAME: undefined,
    },
    () => {
      const cfg = loadOidcEnvConfig();
      assert.equal(cfg.managementMode, 'admin-managed');
      assert.equal(cfg.localLoginEnabled, true);
      assert.equal(cfg.providerDisplayName, 'OpenID Connect');
      assert.equal(cfg.oidcAutoRedirect, false);
    },
  );
});

test('validateAuthEnvContract rejects env-managed without issuer', () => {
  withEnv(
    {
      OIDC_ENABLED: 'true',
      OIDC_ISSUER_URL: '',
      OIDC_CLIENT_ID: 'client',
      OIDC_CLIENT_SECRET: 'secret',
      NODE_ENV: 'development',
    },
    () => {
      assert.throws(
        () => validateAuthEnvContract({ enabledOidcProviderCount: 0 }),
        AuthEnvValidationError,
      );
    },
  );
});

test('validateAuthEnvContract rejects no auth methods', () => {
  withEnv(
    {
      OIDC_ENABLED: 'false',
      LOCAL_LOGIN_ENABLED: 'false',
    },
    () => {
      assert.throws(
        () => validateAuthEnvContract({ enabledOidcProviderCount: 0 }),
        (err: unknown) =>
          err instanceof AuthEnvValidationError &&
          err.problems.some((p) => p.includes('sign-in method')),
      );
    },
  );
});

test('validateAuthEnvContract accepts local-only', () => {
  withEnv(
    {
      OIDC_ENABLED: 'false',
      LOCAL_LOGIN_ENABLED: 'true',
    },
    () => {
      assert.doesNotThrow(() =>
        validateAuthEnvContract({ enabledOidcProviderCount: 0 }),
      );
    },
  );
});
