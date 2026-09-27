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
import {
  compareRouteInventory,
  CORE_ROUTER_MOUNTS,
  inventoryCoreRoutes,
  inventoryStaticAppMounts,
  inventorySpecOperations,
} from '../../scripts/openapi-route-inventory.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceSpecPath = path.resolve(__dirname, '../../openapi/openapi.yaml');

type OpenApiSpec = {
  info?: Record<string, unknown>;
  openapi?: string;
  tags?: Array<{ name: string }>;
  paths?: Record<
    string,
    Record<string, {
      summary?: string;
      description?: string;
      tags?: string[];
      parameters?: Array<{ name?: string; in?: string }>;
      security?: Array<Record<string, unknown>>;
      responses?: Record<string, { content?: Record<string, { example?: unknown; schema?: unknown }> }>;
    }>
  >;
};

function resolveJsonPointer(document: unknown, reference: string): unknown {
  assert.match(reference, /^#\//, `external reference is not version-locked: ${reference}`);
  return reference.slice(2).split('/').reduce<unknown>((value, segment) => {
    assert.ok(value && typeof value === 'object');
    return (value as Record<string, unknown>)[segment.replace(/~1/g, '/').replace(/~0/g, '~')];
  }, document);
}

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
  assert.deepEqual(spec.paths?.['/uploads/{filename}']?.get?.security, [
    {},
    { cookieAuth: [] },
    { bearerAuth: [] },
  ]);
});

test('campaign events retain their server-sent event contract', () => {
  const spec = loadOpenApiSpec(sourceSpecPath) as OpenApiSpec;
  const operation = spec.paths?.['/api/campaigns/{campaignHandle}/events']?.get;
  assert.equal(operation?.summary, 'Stream campaign domain events');
  assert.match(String(operation?.description), /transient invalidation signals/);
  assert.deepEqual(operation?.responses?.['200']?.content?.['text/event-stream']?.schema, {
    type: 'string',
  });
});

test('only anonymous development fixture operations advertise anonymous access', () => {
  const spec = loadOpenApiSpec(sourceSpecPath) as OpenApiSpec;
  for (const [pathKey, method] of [
    ['/api/plugin-connection-fixtures/oauth/authorize', 'get'],
    ['/api/plugin-connection-fixtures/oauth/token', 'post'],
    ['/api/plugin-connection-fixtures/oauth/revoke', 'post'],
  ] as const) {
    assert.deepEqual(spec.paths?.[pathKey]?.[method]?.security, [{}]);
  }
  assert.notDeepEqual(spec.paths?.['/api/plugin-connection-fixtures/oauth/library']?.get?.security, [{}]);
  assert.notDeepEqual(spec.paths?.['/api/plugin-connection-fixtures/api-key/library']?.get?.security, [{}]);
});

test('OpenAPI document is structurally valid and all local references resolve', () => {
  const spec = loadOpenApiSpec(sourceSpecPath) as OpenApiSpec & Record<string, unknown>;
  assert.equal(spec.openapi, '3.1.0');
  assert.ok(spec.info && typeof spec.info === 'object');
  assert.ok(spec.paths && typeof spec.paths === 'object');

  const declaredTags = new Set((spec.tags ?? []).map((tag) => tag.name));
  const references = new Set<string>();
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    if ('$ref' in value && typeof (value as { $ref?: unknown }).$ref === 'string') {
      references.add((value as { $ref: string }).$ref);
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(spec);
  for (const reference of references) assert.ok(resolveJsonPointer(spec, reference), `unresolved ${reference}`);

  for (const [pathKey, pathItem] of Object.entries(spec.paths ?? {})) {
    assert.match(pathKey, /^\//);
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].includes(method)) continue;
      assert.ok(operation.responses && Object.keys(operation.responses).length > 0, `${method.toUpperCase()} ${pathKey} has no responses`);
      assert.ok(operation.tags?.length, `${method.toUpperCase()} ${pathKey} has no tags`);
      for (const tag of operation.tags ?? []) assert.ok(declaredTags.has(tag), `undeclared tag ${tag}`);
      for (const name of [...pathKey.matchAll(/\{([^}]+)\}/g)].map((match) => match[1])) {
        const parameters = operation.parameters ?? [];
        assert.ok(parameters.some((parameter: { name?: string; in?: string; $ref?: string }) => {
          const resolved = parameter.$ref ? resolveJsonPointer(spec, parameter.$ref) as { name?: string; in?: string } : parameter;
          return resolved?.name === name && resolved?.in === 'path';
        }), `${method.toUpperCase()} ${pathKey} does not declare {${name}}`);
      }
    }
  }
});

test('every statically mounted core API operation is in OpenAPI', () => {
  const backendRoot = path.resolve(__dirname, '../..');
  const routes = inventoryCoreRoutes(backendRoot);
  const spec = loadOpenApiSpec(sourceSpecPath) as OpenApiSpec;
  const comparison = compareRouteInventory(routes, inventorySpecOperations(spec));
  assert.deepEqual(comparison.undocumented, []);
  assert.deepEqual(comparison.stale, []);
});

test('the route inventory includes every static API router mounted by app.ts', () => {
  const backendRoot = path.resolve(__dirname, '../..');
  const inventoried = new Set(Object.values(CORE_ROUTER_MOUNTS).map(([mountPath]) => mountPath));
  const mounted = inventoryStaticAppMounts(backendRoot)
    .map((mount) => mount.path)
    .filter((mountPath) => mountPath !== '/api/docs');
  assert.deepEqual([...new Set(mounted)].sort(), [...inventoried].sort());
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

test('primary domain tag groups are present', () => {
  const spec = loadOpenApiSpec(sourceSpecPath) as OpenApiSpec;
  const tagNames = new Set((spec.tags ?? []).map((t) => t.name));
  for (const required of ['Authentication', 'Campaigns', 'Wiki', 'Backup', 'Import']) {
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
