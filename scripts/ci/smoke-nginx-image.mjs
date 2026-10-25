import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';

const packageName = execFileSync('apk', ['info', '-v', 'nginx'], { encoding: 'utf8' }).trim();
assert.match(packageName, /^nginx-\d/);
const version = packageName.slice('nginx-'.length);
const comparison = execFileSync('apk', ['version', '-t', version, '1.30.6-r0'], {
  encoding: 'utf8',
}).trim();
assert.ok(comparison === '=' || comparison === '>', `nginx ${version} is below 1.30.6-r0`);
console.log(`nginx package: ${version}`);
execFileSync('nginx', ['-t'], { stdio: 'inherit' });

const api = createServer((request, response) => {
  if (request.url === '/api/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end('{"status":"ok"}');
  } else if (request.url === '/uploads/smoke.txt') {
    response.writeHead(200, { 'Content-Type': 'text/plain' });
    response.end('upload-ok');
  } else {
    response.writeHead(404);
    response.end();
  }
});

await new Promise((resolve, reject) => {
  api.once('error', reject);
  api.listen(3001, '127.0.0.1', resolve);
});

const nginx = spawn('nginx', ['-g', 'daemon off;'], { stdio: 'inherit' });

try {
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (nginx.exitCode !== null) throw new Error(`nginx exited with code ${nginx.exitCode}`);
    try {
      const response = await fetch('http://127.0.0.1/', { signal: AbortSignal.timeout(1000) });
      ready = response.ok;
      if (ready) break;
    } catch {
      // nginx may still be starting.
    }
    await delay(100);
  }
  assert.ok(ready, 'nginx did not become ready on port 80');

  for (const path of ['/', '/campaign/smoke']) {
    const response = await fetch(`http://127.0.0.1${path}`);
    assert.equal(response.status, 200, `${path} should serve the SPA`);
    assert.match(response.headers.get('content-type') ?? '', /text\/html/);
    assert.match(await response.text(), /<html/i);
  }

  const health = await fetch('http://127.0.0.1/api/health');
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok' });

  const upload = await fetch('http://127.0.0.1/uploads/smoke.txt');
  assert.equal(upload.status, 200);
  assert.equal(await upload.text(), 'upload-ok');

  console.log('nginx SPA, API, and uploads smoke checks passed');
} finally {
  nginx.kill('SIGTERM');
  api.close();
}
