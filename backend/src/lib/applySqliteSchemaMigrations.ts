import { spawn } from 'node:child_process';
import path from 'node:path';
import { env } from '../config/env.js';

function isSqliteUrl(url: string): boolean {
  return url.startsWith('file:');
}

/** Apply pending SQLite migrations without resetting the database or regenerating the client. */
export function shouldApplySqliteSchemaMigrations(input: {
  databaseProvider: string;
  databaseUrl: string;
  nodeEnv: string;
} = env): boolean {
  if (input.nodeEnv === 'test') return false;
  return input.databaseProvider === 'sqlite' || isSqliteUrl(input.databaseUrl);
}

export async function applySqliteSchemaMigrations(input: {
  backendRoot: string;
  databaseUrl: string;
  execPath?: string;
} = env): Promise<void> {
  const script = path.join(input.backendRoot, 'prisma/scripts/deploy-sqlite-migrations.mjs');
  await new Promise<void>((resolve, reject) => {
    const child = spawn(input.execPath ?? process.execPath, [script, '--no-generate'], {
      cwd: input.backendRoot,
      env: { ...process.env, DATABASE_URL: input.databaseUrl, SQLITE_DB_RESET: '0' },
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`SQLite migrate deploy failed (${code ?? 'unknown'})`));
    });
  });
}
