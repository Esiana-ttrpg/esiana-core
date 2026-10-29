import { spawnSync } from 'node:child_process';
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.TSX_TSCONFIG_PATH = 'tsconfig.app.json';

// Include every frontend test while retaining the shared suites used by the frontend.
// Vitest suites need their own runner; importing them via node:test is unsupported.
const frontendTests = globSync('src/**/*.test.{ts,tsx}', { cwd: frontendRoot }).sort();
const nodeTests = [];
const vitestTests = [];
for (const file of frontendTests) {
  const source = readFileSync(path.join(frontendRoot, file), 'utf8');
  (/from\s+['"]vitest['"]/.test(source) ? vitestTests : nodeTests).push(file);
}

const options = { cwd: frontendRoot, stdio: 'inherit', env: process.env };
const nodeResult = spawnSync(process.execPath, [
  '--import', 'tsx', '--test',
  '../shared/recruitmentSeats.test.ts',
  '../shared/sessionAudio.test.ts',
  '../shared/mapWorkspace.test.ts',
  '../shared/creatableCodexPageTypes.test.ts',
  '../shared/globalSearchQuery.test.ts',
  ...nodeTests,
], options);

let failed = nodeResult.status !== 0;
if (nodeResult.error) console.error(nodeResult.error);
if (vitestTests.length > 0) {
  const vitestCli = fileURLToPath(new URL('./vitest.mjs', import.meta.resolve('vitest/package.json')));
  const vitestResult = spawnSync(process.execPath, [vitestCli, 'run', ...vitestTests], options);
  if (vitestResult.error) console.error(vitestResult.error);
  failed ||= vitestResult.status !== 0;
}

process.exit(failed ? 1 : 0);
