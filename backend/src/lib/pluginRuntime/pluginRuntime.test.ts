import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { applyCampaignJailToPayload } from './campaignJail.js';
import {
  clearInterceptorRegistry,
  getInterceptorsFor,
  getInterceptorHookCount,
  registerDataInterceptor,
} from './interceptorRegistry.js';
import { InterceptorPhases } from './types.js';
import { runDataInterceptors } from './runInterceptors.js';
import { runInterceptorInWorker } from './workerRunner.js';

test.afterEach(() => {
  clearInterceptorRegistry();
});

test('applyCampaignJailToPayload forces campaignId on payload', () => {
  const jailed = applyCampaignJailToPayload(
    { title: 'Test', campaignId: 'wrong-campaign' },
    'camp-real',
  );
  assert.equal(jailed.campaignId, 'camp-real');
  assert.equal(jailed.title, 'Test');
});

test('registerDataInterceptor enforces max hooks per plugin', () => {
  const pluginRoot = '/tmp/demo';
  for (let index = 0; index < 10; index += 1) {
    registerDataInterceptor('demo-plugin', pluginRoot, {
      entity: 'wikiPage',
      phase: InterceptorPhases.BEFORE_CREATE,
      scriptPath: `hooks/${index}.js`,
    });
  }

  assert.throws(
    () =>
      registerDataInterceptor('demo-plugin', pluginRoot, {
        entity: 'notebookArc',
        phase: InterceptorPhases.BEFORE_CREATE,
        scriptPath: 'hooks/overflow.js',
      }),
    /exceeded max data interceptors/,
  );
  assert.equal(getInterceptorHookCount('demo-plugin'), 10);
});

test('getInterceptorsFor returns registered hooks for entity phase', () => {
  registerDataInterceptor('alpha', '/plugins/alpha', {
    entity: 'wikiPage',
    phase: InterceptorPhases.BEFORE_CREATE,
    scriptPath: 'hooks/create.js',
  });

  const hooks = getInterceptorsFor('wikiPage', InterceptorPhases.BEFORE_CREATE);
  assert.equal(hooks.length, 1);
  assert.equal(hooks[0]?.pluginId, 'alpha');
  assert.equal(hooks[0]?.scriptPath, 'hooks/create.js');
});

test('runInterceptorInWorker executes hook script and returns modified payload', async () => {
  const pluginRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'esiana-hook-'));
  await fs.mkdir(path.join(pluginRoot, 'hooks'), { recursive: true });
  await fs.writeFile(
    path.join(pluginRoot, 'hooks', 'mutate.js'),
    `export default function mutate(payload, context) {
      return { ...payload, title: payload.title + '-hooked', campaignId: context.campaignId };
    }`,
  );

  const result = await runInterceptorInWorker({
    pluginRoot,
    scriptPath: 'hooks/mutate.js',
    exportName: 'default',
    payload: { title: 'Page', campaignId: 'ignored' },
    context: {
      pluginId: 'test-plugin',
      entity: 'wikiPage',
      phase: InterceptorPhases.BEFORE_CREATE,
      campaignId: 'camp-1',
    },
    timeoutMs: 2000,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.payload, { title: 'Page-hooked', campaignId: 'camp-1' });
});

test('runInterceptorInWorker times out slow hooks', async () => {
  const pluginRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'esiana-hook-'));
  await fs.mkdir(path.join(pluginRoot, 'hooks'), { recursive: true });
  await fs.writeFile(
    path.join(pluginRoot, 'hooks', 'slow.js'),
    `export default async function slow(payload) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return payload;
    }`,
  );

  const result = await runInterceptorInWorker({
    pluginRoot,
    scriptPath: 'hooks/slow.js',
    exportName: 'default',
    payload: { title: 'Slow' },
    context: {
      pluginId: 'slow-plugin',
      entity: 'wikiPage',
      phase: InterceptorPhases.BEFORE_CREATE,
      campaignId: 'camp-1',
    },
    timeoutMs: 50,
  });

  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /timed out/i);
});

test('runDataInterceptors chains hooks and jails campaignId', async () => {
  const pluginRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'esiana-hook-'));
  await fs.mkdir(path.join(pluginRoot, 'hooks'), { recursive: true });
  await fs.writeFile(
    path.join(pluginRoot, 'hooks', 'prefix.js'),
    `export default function prefix(payload) {
      const title = typeof payload.title === 'string' ? payload.title : '';
      return { ...payload, title: 'prefix:' + title };
    }`,
  );

  registerDataInterceptor('chain-plugin', pluginRoot, {
    entity: 'wikiPage',
    phase: InterceptorPhases.BEFORE_CREATE,
    scriptPath: 'hooks/prefix.js',
  });

  const result = await runDataInterceptors({
    entity: 'wikiPage',
    phase: InterceptorPhases.BEFORE_CREATE,
    campaignId: 'camp-jail',
    payload: { title: 'Arc', campaignId: 'escape' },
  });

  assert.equal(result.title, 'prefix:Arc');
  assert.equal(result.campaignId, 'camp-jail');
});

test('runDataInterceptors fail-open keeps payload when hook errors', async () => {
  const pluginRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'esiana-hook-'));
  await fs.mkdir(path.join(pluginRoot, 'hooks'), { recursive: true });
  await fs.writeFile(
    path.join(pluginRoot, 'hooks', 'broken.js'),
    `export default function broken() {
      throw new Error('hook exploded');
    }`,
  );

  registerDataInterceptor('broken-plugin', pluginRoot, {
    entity: 'wikiPage',
    phase: InterceptorPhases.BEFORE_UPDATE,
    scriptPath: 'hooks/broken.js',
  });

  const result = await runDataInterceptors({
    entity: 'wikiPage',
    phase: InterceptorPhases.BEFORE_UPDATE,
    campaignId: 'camp-safe',
    payload: { id: 'page-1', title: 'Safe title' },
  });

  assert.equal(result.title, 'Safe title');
  assert.equal(result.campaignId, 'camp-safe');
  assert.equal(getInterceptorHookCount('broken-plugin'), 1);
});
