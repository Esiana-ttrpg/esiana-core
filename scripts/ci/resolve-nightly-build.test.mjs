import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import {
  resolveNightlyBuild,
  writeGithubOutput,
  parseForce,
} from './resolve-nightly-build.mjs';

const HEAD = 'abcdef0123456789abcdef0123456789abcdef01';
const OTHER = '1111111111111111111111111111111111111111';
const SCRIPT = fileURLToPath(new URL('./resolve-nightly-build.mjs', import.meta.url));
const WORKFLOW = fileURLToPath(
  new URL('../../.github/workflows/nightly.yml', import.meta.url),
);

test('parseForce accepts true/1/yes case-insensitively', () => {
  assert.equal(parseForce('true'), true);
  assert.equal(parseForce('TRUE'), true);
  assert.equal(parseForce('1'), true);
  assert.equal(parseForce('yes'), true);
  assert.equal(parseForce('false'), false);
  assert.equal(parseForce(''), false);
  assert.equal(parseForce(undefined), false);
});

test('no change: nightly == HEAD and force false → skip, no version', () => {
  const result = resolveNightlyBuild({
    headSha: HEAD,
    nightlySha: HEAD,
    force: false,
    buildDate: '20260929',
  });
  assert.equal(result.shouldBuild, false);
  assert.equal(result.version, undefined);
  assert.equal(result.sha, HEAD);
  assert.equal(result.shortSha, 'abcd');
  assert.match(result.reason, /skipping/i);
});

test('force rebuild when nightly == HEAD', () => {
  const result = resolveNightlyBuild({
    headSha: HEAD,
    nightlySha: HEAD,
    force: true,
    buildDate: '20260929',
  });
  assert.equal(result.shouldBuild, true);
  assert.equal(result.version, 'nightly-20260929-abcd');
  assert.match(result.reason, /force/i);
});

test('changed commit builds with nightly-YYYYMMDD-xxxx version', () => {
  const result = resolveNightlyBuild({
    headSha: HEAD,
    nightlySha: OTHER,
    force: false,
    buildDate: '20260115',
  });
  assert.equal(result.shouldBuild, true);
  assert.equal(result.shortSha, 'abcd');
  assert.equal(result.version, 'nightly-20260115-abcd');
  assert.match(result.version, /^nightly-\d{8}-[0-9a-f]{4}$/);
  assert.equal(result.version.startsWith('v'), false);
});

test('absent nightly tag builds', () => {
  const result = resolveNightlyBuild({
    headSha: HEAD,
    nightlySha: '',
    force: false,
    buildDate: '20260929',
  });
  assert.equal(result.shouldBuild, true);
  assert.equal(result.version, 'nightly-20260929-abcd');
  assert.match(result.reason, /absent/i);
});

test('invalid HEAD_SHA throws', () => {
  assert.throws(
    () => resolveNightlyBuild({ headSha: 'notasha', force: false }),
    /HEAD_SHA/,
  );
  assert.throws(
    () => resolveNightlyBuild({ headSha: '', force: false }),
    /HEAD_SHA/,
  );
});

test('invalid NIGHTLY_SHA throws', () => {
  assert.throws(
    () =>
      resolveNightlyBuild({
        headSha: HEAD,
        nightlySha: 'short',
        force: false,
      }),
    /NIGHTLY_SHA/,
  );
});

test('invalid BUILD_DATE throws', () => {
  assert.throws(
    () =>
      resolveNightlyBuild({
        headSha: HEAD,
        nightlySha: '',
        force: false,
        buildDate: '2026-09-29',
      }),
    /BUILD_DATE/,
  );
});

test('writeGithubOutput appends key=value pairs and omits version on skip', () => {
  const dir = mkdtempSync(join(tmpdir(), 'nightly-out-'));
  const out = join(dir, 'github_output');
  writeFileSync(out, '');

  const skip = resolveNightlyBuild({
    headSha: HEAD,
    nightlySha: HEAD,
    force: false,
    buildDate: '20260929',
  });
  writeGithubOutput(skip, out);
  const skipText = readFileSync(out, 'utf8');
  assert.match(skipText, /should_build=false/);
  assert.doesNotMatch(skipText, /^version=/m);

  const build = resolveNightlyBuild({
    headSha: HEAD,
    nightlySha: OTHER,
    force: false,
    buildDate: '20260929',
  });
  writeGithubOutput(build, out);
  const buildText = readFileSync(out, 'utf8');
  assert.match(buildText, /should_build=true/);
  assert.match(buildText, /version=nightly-20260929-abcd/);
  assert.match(buildText, /short_sha=abcd/);
});

test('CLI exits non-zero on missing HEAD_SHA', () => {
  const result = spawnSync(process.execPath, [SCRIPT], {
    env: { ...process.env, HEAD_SHA: '', NIGHTLY_SHA: '', FORCE: 'false' },
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /HEAD_SHA/);
});

test('CLI writes should_build=false for no-change run', () => {
  const result = spawnSync(process.execPath, [SCRIPT], {
    env: {
      ...process.env,
      HEAD_SHA: HEAD,
      NIGHTLY_SHA: HEAD,
      FORCE: 'false',
      BUILD_DATE: '20260929',
      GITHUB_OUTPUT: '',
    },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /should_build=false/);
  assert.doesNotMatch(result.stdout, /^version=/m);
});

test('nightly.yml structural gating and isolation from semver releases', () => {
  const yaml = readFileSync(WORKFLOW, 'utf8');

  assert.match(yaml, /\bschedule\s*:/);
  assert.match(yaml, /\bworkflow_dispatch\s*:/);
  assert.match(yaml, /inputs:\s*\n\s+force:/);

  // Every job except detect-changes must gate on should_build.
  const jobBlocks = yaml.split(/\n(?=  [a-z0-9-]+:)/);
  const gatedJobs = [];
  for (const block of jobBlocks) {
    const nameMatch = block.match(/^  ([a-z0-9-]+):/);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    if (name === 'detect-changes') continue;
    // Skip non-job top-level keys that somehow matched (defensive).
    if (!/\n    runs-on:/.test(block) && !/\n    needs:/.test(block)) continue;
    gatedJobs.push(name);
    assert.match(
      block,
      /if:\s*needs\.detect-changes\.outputs\.should_build\s*==\s*'true'/,
      `job ${name} must gate on should_build`,
    );
  }
  assert.ok(gatedJobs.includes('build'), 'expected build job');
  assert.ok(gatedJobs.includes('publish-images'), 'expected publish-images job');
  assert.ok(gatedJobs.includes('update-nightly-tag'), 'expected update-nightly-tag job');

  const updateBlock = jobBlocks.find((b) => /^  update-nightly-tag:/.test(b));
  assert.ok(updateBlock, 'update-nightly-tag job missing');
  assert.match(updateBlock, /needs:[\s\S]*publish-images/);
  assert.match(updateBlock, /needs:[\s\S]*build/);
  assert.match(updateBlock, /needs:[\s\S]*test-sqlite/);
  assert.match(updateBlock, /needs:[\s\S]*test-postgres/);

  // Only force-push of the moving nightly tag — never v* tags or :latest.
  const pushLines = yaml.split('\n').filter((l) => /git push/.test(l));
  assert.ok(pushLines.length >= 1, 'expected at least one git push');
  for (const line of pushLines) {
    assert.match(line, /refs\/tags\/nightly/);
  }
  assert.doesNotMatch(yaml, /refs\/tags\/v/);
  assert.doesNotMatch(yaml, /:latest\b/);
  assert.doesNotMatch(yaml, /softprops\/action-gh-release/);
});
