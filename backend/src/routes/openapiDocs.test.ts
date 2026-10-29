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
  extractRouterRoutes,
  inventoryCoreRoutes,
  inventoryStaticAppMounts,
  inventorySpecOperations,
} from '../../scripts/openapi-route-inventory.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceSpecPath = path.resolve(__dirname, '../../openapi/openapi.yaml');

test('route extraction preserves methods, static literals, optional calls, and source lines', () => {
  const source = [
    '// router.get("/comment", handler);',
    'router.GET("/get", handler);',
    "router.post('/post', handler);",
    'router.put(`/put`, handler);',
    String.raw`router.patch('/escaped\u002fpath', handler);`,
    'router.delete("/delete", handler);',
    'router?.options("/options", handler);',
    'router.head?.("/head", handler);',
  ].join('\r\n');
  assert.deepEqual(extractRouterRoutes(source, 'router'), [
    ['get', '/get'], ['post', '/post'], ['put', '/put'], ['patch', '/escaped/path'],
    ['delete', '/delete'], ['options', '/options'], ['head', '/head'],
  ].map(([method, routePath], index) => ({ method, routePath, line: index + 2, middlewareSource: '' })));
});

test('route extraction ignores dynamic paths, indirect receivers, and source-like text', () => {
  const source = [
    'const text = "router.get(\'/text\', handler)";',
    'router.get(path, handler);',
    'router.get(`/dynamic/${id}`, handler);',
    'router.get("/" + id, handler);',
    'router.get(("/parenthesized"), handler);',
    'router.get("/asserted" as const, handler);',
    'other.get("/other", handler);',
    'container.router.get("/nested-receiver", handler);',
    '(router).get("/parenthesized-receiver", handler);',
    'router["get"]("/computed", handler);',
    'router.use("/middleware", handler);',
    'router.get();',
  ].join('\n');
  assert.deepEqual(extractRouterRoutes(source, 'router'), []);
});

test('route extraction traverses TypeScript containers and preserves original middleware text', () => {
  const source = [
    'namespace Routes {',
    '  export class Registration<T> {',
    '    static {',
    '      const register = (() => {',
    '        router.post<{ id: string }>(',
    '          "/typed/:id",',
    '          /* leading trivia */ (requireAuth),',
    '          policy<T>(/* retain this comment */ "write") satisfies Middleware,',
    '          async (req: Request<T>, res: Response): Promise<void> => {},',
    '        );',
    '      }) satisfies () => void;',
    '      router.get("/outer", wrap(() => { router.get("/inner", handler); }));',
    '    }',
    '  }',
    '}',
  ].join('\n');
  assert.deepEqual(extractRouterRoutes(source, 'router', 'typed-routes.ts'), [
    {
      method: 'post', routePath: '/typed/:id', line: 5,
      middlewareSource: '(requireAuth) policy<T>(/* retain this comment */ "write") satisfies Middleware',
    },
    { method: 'get', routePath: '/outer', line: 12, middlewareSource: '' },
    { method: 'get', routePath: '/inner', line: 12, middlewareSource: '' },
  ]);
});

test('static mount extraction preserves both mount forms, expressions, and file order', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'esiana-inventory-mounts-'));
  try {
    fs.mkdirSync(path.join(root, 'src'));
    fs.writeFileSync(path.join(root, 'src/mountRouters.ts'), [
      'app.use("/api/direct", /* leading trivia */ (createRouter<Context>(/* keep */ options)));',
      'const mounts = [{ path: `/api/list`, router: router } satisfies Mount];',
      'app.use(dynamicPath, router);',
      'app.use(`/api/${name}`, router);',
      'app.use("/outside-api", router);',
      'app.use("/api/missing");',
      'other.use("/api/other", router);',
      'app["use"]("/api/computed", router);',
      'const ignored = [{ "path": "/api/quoted" }, { [path]: "/api/computed" }, { path }];',
    ].join('\n'));
    fs.writeFileSync(path.join(root, 'src/app.ts'), 'app.use(`/api/inline`, inlineRouter);');
    assert.deepEqual(inventoryStaticAppMounts(root), [
      {
        path: '/api/direct', routerExpression: '(createRouter<Context>(/* keep */ options))',
        source: 'src/mountRouters.ts',
      },
      { path: '/api/list', routerExpression: 'listRouterMounts', source: 'src/mountRouters.ts' },
      { path: '/api/inline', routerExpression: 'inlineRouter', source: 'src/app.ts' },
    ]);
    fs.unlinkSync(path.join(root, 'src/app.ts'));
    assert.equal(inventoryStaticAppMounts(root).length, 2);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('invalid syntax throws instead of returning a partial route or mount inventory', () => {
  assert.throws(() => extractRouterRoutes('router.get("/valid", handler); const broken = ;', 'router'), SyntaxError);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'esiana-inventory-invalid-'));
  try {
    fs.mkdirSync(path.join(root, 'src'));
    fs.writeFileSync(path.join(root, 'src/app.ts'), 'app.use("/api/valid", router); const broken = ;');
    assert.throws(() => inventoryStaticAppMounts(root), SyntaxError);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

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

test('Wiki and integration operations retain distinct paths and authorization', () => {
  const spec = loadOpenApiSpec(sourceSpecPath) as OpenApiSpec;
  const wiki = spec.paths?.['/api/campaigns/{campaignHandle}/wiki/{pageId}/entity-fields']?.get as any;
  assert.deepEqual(wiki?.parameters?.map((parameter: { name?: string }) => parameter.name), [
    'campaignHandle',
    'pageId',
  ]);
  assert.ok(wiki?.['x-esiana-authorization']?.requires?.includes('Resource-level visibility and ownership checks performed by the controller/service'));
  assert.ok(!wiki?.['x-esiana-authorization']?.requires?.some((requirement: string) => requirement.includes('Campaign settings modification')));

  for (const [pathKey, method, parameter] of [
    ['/api/campaigns/{campaignHandle}/webhook-deliveries/{deliveryId}/redeliver', 'post', 'deliveryId'],
    ['/api/campaigns/{campaignHandle}/webhooks/{webhookId}', 'patch', 'webhookId'],
    ['/api/campaigns/{campaignHandle}/discord/{destinationId}/test', 'post', 'destinationId'],
  ] as const) {
    const operation = spec.paths?.[pathKey]?.[method] as any;
    assert.ok(operation, `${method.toUpperCase()} ${pathKey} is missing`);
    assert.ok(operation.parameters?.some((entry: { name?: string; in?: string }) => entry.name === parameter && entry.in === 'path'));
    assert.ok(operation['x-esiana-authorization']?.requires?.some((requirement: string) => requirement.includes('Campaign settings modification')));
    assert.deepEqual(operation.security, [{ cookieAuth: [] }, { bearerAuth: [] }]);
  }
});

test('Discord and webhook creation document their 201 responses', () => {
  const spec = loadOpenApiSpec(sourceSpecPath) as OpenApiSpec;
  for (const pathKey of [
    '/api/campaigns/{campaignHandle}/discord',
    '/api/campaigns/{campaignHandle}/webhooks',
  ]) {
    const responses = spec.paths?.[pathKey]?.post?.responses;
    assert.ok(responses?.['201'], `POST ${pathKey} does not document 201`);
    assert.equal(responses?.['200'], undefined);
  }
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

test('the route inventory includes every static API router mounted by the app', () => {
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
