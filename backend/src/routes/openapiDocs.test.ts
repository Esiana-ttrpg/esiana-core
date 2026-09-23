import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import express from 'express';
import {
  createOpenApiDocsRouter,
  loadOpenApiSpec,
  resolveOpenApiSpecPath,
} from './openapiDocs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceSpecPath = path.resolve(__dirname, '../../openapi/openapi.yaml');

type OpenApiSpec = {
  openapi?: string;
  tags?: Array<{ name: string }>;
  paths?: Record<
    string,
    Record<string, { security?: Array<Record<string, unknown>>; responses?: Record<string, { content?: Record<string, { example?: unknown }> }> }>
  >;
};

function responseExample(
  spec: OpenApiSpec,
  pathKey: string,
  method: string,
  status: string,
): unknown {
  const operation = spec.paths?.[pathKey]?.[method];
  return operation?.responses?.[status]?.content?.['application/json']?.example;
}

test('OpenAPI spec loads from source path', () => {
  const spec = loadOpenApiSpec(sourceSpecPath) as OpenApiSpec;
  assert.equal(spec.openapi, '3.1.0');
});

test('asset reads advertise anonymous, session, and bearer authentication', () => {
  const spec = loadOpenApiSpec(sourceSpecPath) as OpenApiSpec;
  assert.deepEqual(spec.paths?.['/api/assets/{assetId}']?.get?.security, [
    {},
    { cookieAuth: [] },
    { bearerAuth: [] },
  ]);
});

test('resolveOpenApiSpecPath finds source spec in dev layout', () => {
  const resolved = resolveOpenApiSpecPath();
  assert.ok(resolved.endsWith('openapi.yaml'));
});

test('production layout resolves the spec copied by copy-openapi.mjs', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'esiana-openapi-'));
  try {
    const routesDirectory = path.join(root, 'dist/backend/src/routes');
    const copiedSpecPath = path.join(root, 'dist/backend/openapi/openapi.yaml');
    fs.mkdirSync(routesDirectory, { recursive: true });
    fs.mkdirSync(path.dirname(copiedSpecPath), { recursive: true });
    fs.copyFileSync(sourceSpecPath, copiedSpecPath);

    assert.equal(resolveOpenApiSpecPath(routesDirectory), copiedSpecPath);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('public docs and raw OpenAPI endpoints respond in production layout', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'esiana-openapi-http-'));
  const routesDirectory = path.join(root, 'dist/backend/src/routes');
  const copiedSpecPath = path.join(root, 'dist/backend/openapi/openapi.yaml');
  fs.mkdirSync(routesDirectory, { recursive: true });
  fs.mkdirSync(path.dirname(copiedSpecPath), { recursive: true });
  fs.copyFileSync(sourceSpecPath, copiedSpecPath);

  const app = express();
  app.use(
    '/api/docs',
    createOpenApiDocsRouter(resolveOpenApiSpecPath(routesDirectory)),
  );
  const server = createServer(app);

  try {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const docsResponse = await fetch(`${baseUrl}/api/docs`);
    assert.equal(docsResponse.status, 200);
    assert.match(await docsResponse.text(), /id="swagger-ui"/);

    const rawResponse = await fetch(`${baseUrl}/api/docs/openapi.yaml`);
    assert.equal(rawResponse.status, 200);
    assert.match(rawResponse.headers.get('content-type') ?? '', /yaml/);
    assert.match(await rawResponse.text(), /^openapi: 3\.1\.0/m);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('RC tag groups are present', () => {
  const spec = loadOpenApiSpec(sourceSpecPath) as OpenApiSpec;
  const tagNames = new Set((spec.tags ?? []).map((t) => t.name));
  for (const required of ['Auth', 'Campaigns', 'Wiki', 'Backup', 'Import']) {
    assert.ok(tagNames.has(required), `missing tag ${required}`);
  }
});

test('RC paths have success response examples', () => {
  const spec = loadOpenApiSpec(sourceSpecPath) as OpenApiSpec;

  assert.ok(responseExample(spec, '/api/auth/login', 'post', '200'));
  assert.ok(responseExample(spec, '/api/campaigns', 'get', '200'));
  assert.ok(responseExample(spec, '/api/campaigns', 'post', '201'));
  assert.ok(
    responseExample(spec, '/api/campaigns/{campaignHandle}/wiki', 'post', '201'),
  );
  assert.ok(
    responseExample(
      spec,
      '/api/campaigns/{campaignHandle}/backup/restore',
      'post',
      '202',
    ),
  );

  const importExample = responseExample(spec, '/api/import-providers', 'get', '200') as
    | Record<string, unknown>
    | undefined;
  assert.ok(importExample);
  assert.ok(Array.isArray(importExample.core));
  assert.ok(Array.isArray(importExample.plugins));
  assert.equal('providers' in importExample, false);
});

test('RC domains have primary error examples', () => {
  const spec = loadOpenApiSpec(sourceSpecPath) as OpenApiSpec;

  assert.ok(responseExample(spec, '/api/auth/login', 'post', '401'));
  assert.ok(responseExample(spec, '/api/auth/register', 'post', '409'));
  assert.ok(responseExample(spec, '/api/campaigns', 'post', '400'));
  assert.ok(
    responseExample(spec, '/api/campaigns/{campaignHandle}/wiki', 'post', '400'),
  );
  assert.ok(
    responseExample(
      spec,
      '/api/campaigns/{campaignHandle}/backup/restore',
      'post',
      '400',
    ),
  );
});
