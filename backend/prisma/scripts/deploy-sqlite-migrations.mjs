#!/usr/bin/env node
/** Deploy normalized SQLite copies without modifying canonical Prisma sources. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  normalizeMigrationSqlForSqlite,
  normalizeSchemaPrismaForSqlite,
} from './sqliteSchema.mjs';

const defaultBackendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export { normalizeMigrationSqlForSqlite, normalizeSchemaPrismaForSqlite };

export function deploySqliteMigrations({
  backendRoot = defaultBackendRoot,
  reset = process.argv.includes('--reset') || process.env.SQLITE_DB_RESET === '1',
  generate = !process.argv.includes('--no-generate') && process.env.SQLITE_DB_GENERATE !== '0',
  databaseUrl = process.env.DATABASE_URL ?? 'file:./dev.db',
  runCommand = execFileSync,
} = {}) {
  const prismaRoot = path.join(backendRoot, 'prisma');
  const migrationsRoot = path.join(prismaRoot, 'migrations');
  const schemaPath = path.join(prismaRoot, 'schema.prisma');
  const dbUrl = databaseUrl.startsWith('file:') ? databaseUrl : 'file:./dev.db';
  if (dbUrl !== databaseUrl) {
    console.warn('SQLite deploy: ignoring non-file DATABASE_URL; using file:./dev.db');
  }
  // Keep reset aligned with the URL resolved by prisma.config.ts.
  let dbFile = dbUrl.slice('file:'.length);
  if (dbFile.startsWith('///')) dbFile = dbFile.slice(2);
  const dbPath = path.resolve(prismaRoot, dbFile);
  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Unique per invocation in the OS temp dir so production images can deploy
  // as a non-root user without writing into /app/backend.
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'esiana-sqlite-deploy-'));
  try {
    const stagedMigrations = path.join(workspace, 'migrations');
    fs.mkdirSync(stagedMigrations);
    fs.writeFileSync(path.join(stagedMigrations, 'migration_lock.toml'), 'provider = "sqlite"\n');
    const dirs = fs.readdirSync(migrationsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    for (const dir of dirs) {
      const destination = path.join(stagedMigrations, dir);
      fs.mkdirSync(destination);
      fs.writeFileSync(
        path.join(destination, 'migration.sql'),
        normalizeMigrationSqlForSqlite(fs.readFileSync(path.join(migrationsRoot, dir, 'migration.sql'), 'utf8')),
      );
    }

    // Generator outputs are relative to the schema, so preserve their original location.
    const sqliteSchema = normalizeSchemaPrismaForSqlite(schema).replace(
      /^(\s*output\s*=\s*)"([^"]+)"/gm,
      (_, prefix, output) => `${prefix}${JSON.stringify(path.resolve(prismaRoot, output).replaceAll('\\', '/'))}`,
    );
    const stagedSchema = path.join(workspace, 'schema.prisma');
    fs.writeFileSync(stagedSchema, sqliteSchema);
    const configPath = path.join(workspace, 'prisma.config.ts');
    fs.writeFileSync(configPath, [
      `import base from ${JSON.stringify(pathToFileURL(path.join(backendRoot, 'prisma.config.ts')).href)};`,
      `export default { ...base, schema: ${JSON.stringify(stagedSchema)}, migrations: { ...base.migrations, path: ${JSON.stringify(stagedMigrations)} } };`,
    ].join('\n'));

    // Only reset the requested database after staging has completed successfully.
    if (reset && fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    const require = createRequire(import.meta.url);
    const prismaCli = path.join(path.dirname(require.resolve('prisma/package.json')), 'build/index.js');
    const options = { cwd: backendRoot, stdio: 'inherit', env: { ...process.env, DATABASE_URL: dbUrl } };
    runCommand(process.execPath, [prismaCli, 'migrate', 'deploy', '--config', configPath], options);
    if (generate) {
      runCommand(process.execPath, [prismaCli, 'generate', '--config', configPath], options);
      console.log('Prisma Client generated for SQLite.');
    }
    console.log(`SQLite migrations applied to ${dbUrl}`);
  } finally {
    const tmp = fs.realpathSync(os.tmpdir());
    const resolvedWorkspace = fs.realpathSync(workspace);
    const prefix = tmp.endsWith(path.sep) ? tmp : tmp + path.sep;
    const inTmp = process.platform === 'win32'
      ? resolvedWorkspace.toLowerCase().startsWith(prefix.toLowerCase())
      : resolvedWorkspace.startsWith(prefix);
    if (!inTmp || !path.basename(resolvedWorkspace).startsWith('esiana-sqlite-deploy-')) {
      throw new Error('Refusing cleanup outside the SQLite deploy workspace');
    }
    fs.rmSync(workspace, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  deploySqliteMigrations();
}
