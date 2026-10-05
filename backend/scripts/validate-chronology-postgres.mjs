import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import EmbeddedPostgres from 'embedded-postgres';

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'esiana-era-pg-'));
const port = await new Promise(resolve => { const server = net.createServer(); server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); }); });
const cluster = new EmbeddedPostgres({ databaseDir: path.join(directory, 'cluster'), port, user: 'era_test', password: 'isolated-era-test', persistent: false, initdbFlags: ['--encoding=UTF8', '--locale=C'], postgresFlags: ['-h', '127.0.0.1'], onLog: () => {}, onError: message => { if (/FATAL|ERROR/.test(String(message))) console.error(message); } });
const url = `postgresql://era_test:isolated-era-test@127.0.0.1:${port}/era_validation`;
const fixtureEnv = { ...process.env, DATABASE_URL: url, DATABASE_PROVIDER: 'postgresql', NODE_ENV: 'test', CHRONOLOGY_ERA_TEST_DATABASE_URL: url };
function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: backend, stdio: 'inherit', env: fixtureEnv, windowsHide: true });
  if (result.status !== 0) throw new Error(`Validation subprocess failed (${result.status}): ${args[0]}`);
}
try {
  await cluster.initialise();
  await cluster.start();
  await cluster.createDatabase('era_validation');
  const cli = path.join(path.dirname(require.resolve('prisma/package.json')), 'build/index.js');
  run([cli, 'migrate', 'deploy']);
  run([cli, 'migrate', 'status']);
  run(['--import', 'tsx', '--test', 'src/lib/chronologyEraService.test.ts']);
  if (process.argv.includes('--backend-tests')) {
    const pkg = JSON.parse(fs.readFileSync(path.join(backend, 'package.json'), 'utf8'));
    const files = pkg.scripts.test.split(' ').filter(value => value.endsWith('.test.ts'));
    let failedGroups = 0;
    const logs = fs.mkdtempSync(path.join(os.tmpdir(), 'esiana-era-test-logs-'));
    console.log(`Backend test logs: ${logs}`);
    for (let start = 0; start < files.length; start += 12) {
      console.log(`Backend group ${Math.floor(start / 12) + 1}/${Math.ceil(files.length / 12)}`);
      const result = spawnSync(process.execPath, ['--import', 'tsx', '--import', './scripts/isolated-test-env.mjs', '--test', '--test-concurrency=1', ...files.slice(start, start + 12)], { cwd: backend, env: fixtureEnv, encoding: 'utf8', windowsHide: true, timeout: 180000, maxBuffer: 16 * 1024 * 1024 });
      const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
      fs.writeFileSync(path.join(logs, `group-${Math.floor(start / 12) + 1}.log`), output);
      console.log(output.split('\n').filter(line => /^(✖|ℹ (tests|pass|fail|skipped))/.test(line)).join('\n'));
      if (result.status !== 0) { failedGroups++; console.error(`Group failed: ${result.error?.message ?? result.status}`); }
    }
    if (failedGroups) throw new Error(`${failedGroups} backend test groups failed.`);
  }
  if (process.argv.includes('--browser')) run(['--import', 'tsx', 'scripts/era-browser-validation.ts']);
  console.log('Isolated PostgreSQL chronology validation passed. Working database was not used.');
} finally {
  await cluster.stop();
  // cluster.stop removes only the cluster created above; remove its empty fixture parent.
  fs.rmdirSync(directory);
}
