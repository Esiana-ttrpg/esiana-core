import assert from 'node:assert/strict';
import test from 'node:test';
import YAML from 'yaml';
import { syncOpdsOpenApi } from './sync-opds-openapi.mjs';

test('merges generated methods into existing path items and remains idempotent', () => {
  const path = '/api/user/opds/credentials';
  const input = YAML.stringify({ paths: { [path]: { summary: 'Keep path metadata', put: { summary: 'Existing method' } } },
    components: { securitySchemes: {} }, tags: [] });
  const routes = ['get', 'post'].map(method => ({ path, method }));
  const output = syncOpdsOpenApi(input, routes);
  const document = YAML.parseDocument(output);
  assert.deepEqual(document.errors, []);
  const spec = document.toJS();
  assert.equal(spec.paths[path].summary, 'Keep path metadata');
  assert.equal(spec.paths[path].put.summary, 'Existing method');
  assert.ok(spec.paths[path].get);
  assert.ok(spec.paths[path].post);
  assert.equal(syncOpdsOpenApi(output, routes), output);
});

test('creation exposes typed one-time secret and credential ID while listing stays separate', () => {
  const creationPath = '/api/user/opds/credentials';
  const globalPath = '/api/admin/opds/credentials';
  const personalPath = '/opds/me';
  const input = YAML.stringify({ paths: {}, components: { securitySchemes: {} }, tags: [] });
  const routes = [{ path: creationPath, method: 'post' }, { path: creationPath, method: 'get' },
    { path: globalPath, method: 'delete' }, { path: personalPath, method: 'get' }];
  const spec = YAML.parse(syncOpdsOpenApi(input, routes));
  const create = spec.paths[creationPath].post;
  const schema = create.responses['201'].content['application/json'].schema;
  assert.equal(schema.properties.secret.type, 'string');
  assert.equal(schema.properties.credential.properties.id.type, 'string');
  assert.deepEqual(schema.required, ['secret', 'credential']);
  assert.ok(schema.properties.credential.required.includes('id'));
  assert.doesNotMatch(JSON.stringify(spec.paths[creationPath].get.responses['200']), /secret/i);
  assert.equal(create.responses['401'].description, 'Session authentication required');
  assert.match(spec.paths[personalPath].get.responses['401'].description, /reader credential/i);
  for (const operation of [create, spec.paths[globalPath].delete]) {
    assert.equal(operation.requestBody.content['application/json'].schema.additionalProperties, false);
  }
});
