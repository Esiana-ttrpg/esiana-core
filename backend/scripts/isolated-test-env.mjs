// Preload before the test module graph: env.ts caches configuration after overriding .env.
// Restore the disposable connection before any Prisma client can be constructed.
const url = process.env.CHRONOLOGY_ERA_TEST_DATABASE_URL;
if (!url || !url.includes('/era_validation')) throw new Error('An isolated PostgreSQL fixture is required.');
const { env } = await import('../src/config/env.ts');
process.env.DATABASE_URL = url;
process.env.DATABASE_PROVIDER = 'postgresql';
process.env.NODE_ENV = 'test';
Object.assign(env, { databaseUrl: url, databaseProvider: 'postgresql', nodeEnv: 'test' });
