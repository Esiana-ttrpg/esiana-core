import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { loadOpenApiSpec, resolveOpenApiSpecPath } from './openapiDocs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceSpecPath = path.resolve(__dirname, '../../openapi/openapi.yaml');

type OpenApiSpec = {
  openapi?: string;
  tags?: Array<{ name: string }>;
  paths?: Record<
    string,
    Record<string, { responses?: Record<string, { content?: Record<string, { example?: unknown }> }> }>
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

test('resolveOpenApiSpecPath finds source spec in dev layout', () => {
  const resolved = resolveOpenApiSpecPath();
  assert.ok(resolved.endsWith('openapi.yaml'));
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
