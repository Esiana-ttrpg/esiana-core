import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { buildRateLimitEnv } from './rateLimitEnv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '../..');
const repoRoot = path.resolve(backendRoot, '..');

dotenv.config({ path: path.join(backendRoot, '.env') });

function resolvePath(relative: string, base: string): string {
  return path.isAbsolute(relative) ? relative : path.resolve(base, relative);
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3001),
  databaseProvider: process.env.DATABASE_PROVIDER ?? 'postgresql',
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://esiana:esiana@localhost:5432/esiana',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  /** AES-256-GCM key (base64, 32 bytes) for IdentityProvider client secrets. */
  authSecretsKey: process.env.AUTH_SECRETS_KEY ?? '',
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  backendPublicOrigin:
    process.env.BACKEND_PUBLIC_ORIGIN ??
    process.env.API_PUBLIC_ORIGIN ??
    `http://localhost:${process.env.PORT ?? 3001}`,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  cookieName: process.env.COOKIE_NAME ?? 'esiana_token',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  cookieSameSite:
    (process.env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none') ?? 'lax',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  uploadsDir: resolvePath(
    process.env.UPLOADS_DIR ?? '../uploads',
    backendRoot,
  ),
  /** Active storage provider id (registered via StorageRegistry). */
  storageProvider: process.env.STORAGE_PROVIDER ?? 'filesystem',
  /** Prefer redirect delivery for reads above this size when the driver supports it. */
  storageRedirectThresholdBytes: Number(
    process.env.STORAGE_REDIRECT_THRESHOLD_BYTES ?? 5 * 1024 * 1024,
  ),
  /** Product version — used for plugin engine constraints. */
  coreVersion: process.env.ESIANA_CORE_VERSION ?? '0.9.0',
  pluginsDir: resolvePath(
    process.env.PLUGINS_DIR ?? '../plugins',
    backendRoot,
  ),
  repoRoot,
  backendRoot,
  mapPreserveFullRes: process.env.MAP_PRESERVE_FULL_RES === 'true',
  /** Upload-time only — never used for layout after Asset row is created. */
  mapDisplayMaxEdge: Number(process.env.MAP_DISPLAY_MAX_EDGE ?? 8192),
  mapThumbMaxEdge: Number(process.env.MAP_THUMB_MAX_EDGE ?? 2048),
  rateLimit: buildRateLimitEnv(),
  trustProxy: process.env.TRUST_PROXY === 'true',
  pluginInterceptorTimeoutMs: Number(process.env.PLUGIN_INTERCEPTOR_TIMEOUT_MS ?? 200),
  pluginMaxHooksPerPlugin: Number(process.env.PLUGIN_MAX_HOOKS_PER_PLUGIN ?? 10),
  pluginMaxConcurrentInterceptors: Number(
    process.env.PLUGIN_MAX_CONCURRENT_INTERCEPTORS ?? 4,
  ),
  pluginWorkerMaxOldGenerationMb: Number(
    process.env.PLUGIN_WORKER_MAX_OLD_GENERATION_MB ?? 32,
  ),
  /** When true, campaign generators may create seeded demo login accounts. */
  enableDemoUsers: process.env.ENABLE_DEMO_USERS === 'true',
  /** When true, core Sample Data profiles are available (dev fixtures). Does not affect Content Packs. */
  enableSampleData: process.env.ENABLE_SAMPLE_DATA === 'true',
  /** Optional instance UI locale for guests and users on browser auto (BCP 47, e.g. fr). */
  defaultUiLocale: process.env.ESIANA_DEFAULT_LOCALE?.trim() ?? '',
};

export function canCreateSeededDemoUsers(): boolean {
  return env.enableDemoUsers;
}

export function isSampleDataEnabled(): boolean {
  return process.env.ENABLE_SAMPLE_DATA === 'true';
}
