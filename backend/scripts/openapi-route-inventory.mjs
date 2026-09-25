import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import YAML from 'yaml';

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);

export const CORE_ROUTER_MOUNTS = Object.freeze({
  healthRouter: ['/api/health', 'src/routes/health.ts'],
  publicDirectoryRouter: ['/api/public-directory', 'src/routes/publicDirectory.ts'],
  recruitmentRouter: ['/api/recruitment', 'src/routes/recruitment.ts'],
  gameSystemsRouter: ['/api/game-systems', 'src/routes/gameSystems.ts'],
  campaignThemesRouter: ['/api/campaign-themes', 'src/routes/campaignThemes.ts'],
  publicSystemRouter: ['/api/public/system', 'src/routes/publicSystem.ts'],
  usersPublicRouter: ['/api/users', 'src/routes/usersPublic.ts'],
  authRouter: ['/api/auth', 'src/routes/auth.ts'],
  userRouter: ['/api/user', 'src/routes/user.ts'],
  campaignsRouter: ['/api/campaigns', 'src/routes/campaigns.ts'],
  pluginConnectionsRouter: ['/api/plugin-connections', 'src/routes/pluginConnections.ts'],
  pluginConnectionFixturesRouter: ['/api/plugin-connection-fixtures', 'src/routes/pluginConnectionFixtures.ts'],
  campaignScopedRouter: ['/api/campaigns/:campaignHandle', 'src/routes/campaignScoped.ts'],
  assetsRouter: ['/api/assets', 'src/routes/assets.ts'],
  router: ['/api/plugins', 'src/routes/plugins.ts'],
  pluginAssetsRouter: ['/api/plugin-assets', 'src/routes/pluginAssets.ts'],
  adminRouter: ['/api/admin', 'src/routes/admin.ts'],
  sampleDataRouter: ['/api/sample-data', 'src/routes/sampleData.ts'],
  contentPacksRouter: ['/api/content-packs', 'src/routes/contentPacks.ts'],
  importProvidersRouter: ['/api/import-providers', 'src/routes/importProviders.ts'],
});

function literalText(node) {
  return ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)
    ? node.text
    : undefined;
}

function openApiPath(expressPath) {
  return expressPath
    .replace(/:([A-Za-z0-9_]+)/g, '{$1}')
    .replace(/\*([A-Za-z0-9_]+)/g, '{$1}');
}

export function extractRouterRoutes(source, routerName, filename = 'route.ts') {
  const sourceFile = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const routes = [];

  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const target = node.expression.expression;
      const method = node.expression.name.text.toLowerCase();
      if (ts.isIdentifier(target) && target.text === routerName && HTTP_METHODS.has(method)) {
        const routePath = literalText(node.arguments[0]);
        if (routePath !== undefined) routes.push({
          method,
          routePath,
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          middlewareSource: node.arguments.slice(1, -1).map((argument) => argument.getText(sourceFile)).join(' '),
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return routes;
}

export function inventoryCoreRoutes(backendRoot) {
  const routes = [{ method: 'get', path: '/uploads/{filename}', source: 'src/app.ts', line: 49 }];
  for (const [routerName, [mountPath, relativeFile]] of Object.entries(CORE_ROUTER_MOUNTS)) {
    const filename = path.join(backendRoot, relativeFile);
    const source = fs.readFileSync(filename, 'utf8');
    for (const route of extractRouterRoutes(source, routerName, filename)) {
      const suffix = route.routePath === '/' ? '' : route.routePath;
      routes.push({
        method: route.method,
        path: openApiPath(`${mountPath}${suffix}`),
        source: relativeFile,
        line: route.line,
        middlewareSource: route.middlewareSource,
      });
    }
  }
  return routes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}

export function inventoryStaticAppMounts(backendRoot) {
  const filename = path.join(backendRoot, 'src/app.ts');
  const source = fs.readFileSync(filename, 'utf8');
  const sourceFile = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const mounts = [];
  function visit(node) {
    if (ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && ts.isIdentifier(node.expression.expression)
      && node.expression.expression.text === 'app'
      && node.expression.name.text === 'use') {
      const mountPath = literalText(node.arguments[0]);
      if (mountPath?.startsWith('/api/') && node.arguments[1]) {
        mounts.push({ path: mountPath, routerExpression: node.arguments[1].getText(sourceFile) });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return mounts;
}

export function inventorySpecOperations(spec) {
  const operations = [];
  for (const [routePath, pathItem] of Object.entries(spec.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      if (pathItem?.[method]) operations.push({ method, path: routePath });
    }
  }
  return operations.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}

export function operationKey({ method, path: routePath }) {
  return `${method.toUpperCase()} ${routePath.replace(/\{[^}]+\}/g, '{}')}`;
}

export function compareRouteInventory(routes, specOperations) {
  const routeKeys = new Set(routes.map(operationKey));
  const specKeys = new Set(specOperations.map(operationKey));
  return {
    undocumented: routes.filter((route) => !specKeys.has(operationKey(route))),
    stale: specOperations.filter((operation) => !routeKeys.has(operationKey(operation))),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/(.:)/, '$1'))) {
  const backendRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, '$1')), '..');
  const spec = YAML.parse(fs.readFileSync(path.join(backendRoot, 'openapi/openapi.yaml'), 'utf8'));
  const routes = inventoryCoreRoutes(backendRoot);
  const operations = inventorySpecOperations(spec);
  const comparison = compareRouteInventory(routes, operations);
  console.log(JSON.stringify({ routeCount: routes.length, documentedCount: operations.length, ...comparison }, null, 2));
}
