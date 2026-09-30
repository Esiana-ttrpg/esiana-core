#!/usr/bin/env node
/**
 * Decide whether a nightly build should run and compute the nightly version.
 *
 * Env inputs:
 *   HEAD_SHA      — required, 40-char hex commit SHA of develop HEAD
 *   NIGHTLY_SHA   — optional, SHA currently pointed at by the `nightly` tag (empty if absent)
 *   FORCE         — "true" to build even when NIGHTLY_SHA === HEAD_SHA
 *   BUILD_DATE    — optional YYYYMMDD (UTC); defaults to today's UTC date
 *   GITHUB_OUTPUT — optional path; when set, key=value pairs are appended
 *
 * Outputs (printed and optionally written to GITHUB_OUTPUT):
 *   should_build, reason, sha, short_sha, version (version only when should_build)
 */

import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SHA_RE = /^[0-9a-f]{40}$/i;
const DATE_RE = /^\d{8}$/;
const VERSION_RE = /^nightly-\d{8}-[0-9a-f]{4}$/;

/**
 * @param {{ headSha: string, nightlySha?: string, force?: boolean, buildDate?: string }} input
 * @returns {{ shouldBuild: boolean, reason: string, sha: string, shortSha: string, version?: string }}
 */
export function resolveNightlyBuild(input) {
  const headSha = (input.headSha || '').trim().toLowerCase();
  if (!SHA_RE.test(headSha)) {
    throw new Error(
      `HEAD_SHA must be a 40-character hex commit SHA, got: ${JSON.stringify(input.headSha)}`,
    );
  }

  const nightlySha = (input.nightlySha || '').trim().toLowerCase();
  if (nightlySha && !SHA_RE.test(nightlySha)) {
    throw new Error(
      `NIGHTLY_SHA must be empty or a 40-character hex commit SHA, got: ${JSON.stringify(input.nightlySha)}`,
    );
  }

  const force = Boolean(input.force);
  const shortSha = headSha.slice(0, 4);

  let buildDate = (input.buildDate || '').trim();
  if (!buildDate) {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    buildDate = `${y}${m}${d}`;
  }
  if (!DATE_RE.test(buildDate)) {
    throw new Error(`BUILD_DATE must be YYYYMMDD, got: ${JSON.stringify(input.buildDate)}`);
  }

  const unchanged = nightlySha !== '' && nightlySha === headSha;
  const shouldBuild = force || !unchanged;

  let reason;
  if (!nightlySha) {
    reason = 'nightly tag absent; building develop HEAD';
  } else if (unchanged && force) {
    reason = 'nightly already at develop HEAD; force=true, building anyway';
  } else if (unchanged) {
    reason = 'nightly already points at develop HEAD; skipping build';
  } else {
    reason = `develop advanced past nightly (${nightlySha.slice(0, 8)} → ${shortSha}…)`;
  }

  /** @type {{ shouldBuild: boolean, reason: string, sha: string, shortSha: string, version?: string }} */
  const result = {
    shouldBuild,
    reason,
    sha: headSha,
    shortSha,
  };

  if (shouldBuild) {
    const version = `nightly-${buildDate}-${shortSha}`;
    if (!VERSION_RE.test(version) || version.startsWith('v')) {
      throw new Error(`Refusing invalid nightly version: ${version}`);
    }
    result.version = version;
  }

  return result;
}

/**
 * @param {{ shouldBuild: boolean, reason: string, sha: string, shortSha: string, version?: string }} result
 * @param {string | undefined} outputPath
 */
export function writeGithubOutput(result, outputPath) {
  const lines = [
    `should_build=${result.shouldBuild ? 'true' : 'false'}`,
    `reason=${result.reason}`,
    `sha=${result.sha}`,
    `short_sha=${result.shortSha}`,
  ];
  if (result.version) {
    lines.push(`version=${result.version}`);
  }

  const text = `${lines.join('\n')}\n`;
  process.stdout.write(text);

  if (outputPath) {
    appendFileSync(outputPath, text);
  }
}

export function parseForce(raw) {
  const v = String(raw || '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function main() {
  const result = resolveNightlyBuild({
    headSha: process.env.HEAD_SHA || '',
    nightlySha: process.env.NIGHTLY_SHA || '',
    force: parseForce(process.env.FORCE),
    buildDate: process.env.BUILD_DATE || '',
  });
  writeGithubOutput(result, process.env.GITHUB_OUTPUT);
}

const isDirectRun =
  Boolean(process.argv[1]) && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  try {
    main();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
