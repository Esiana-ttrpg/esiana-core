import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import YAML from 'yaml';

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);

export const CORE_ROUTER_MOUNTS = Object.freeze({
  safetyPrivacyRouter: ['/api/safety-privacy', 'src/routes/safetyPrivacy.ts'],
  healthRouter: ['/api/health', 'src/routes/health.ts'],
  publicDirectoryRouter: ['/api/public-directory', 'src/routes/publicDirectory.ts'],
  recruitmentRouter: ['/api/recruitment', 'src/routes/recruitment.ts'],
  gameSystemsRouter: ['/api/game-systems', 'src/routes/gameSystems.ts'],
  campaignThemesRouter: ['/api/campaign-themes', 'src/routes/campaignThemes.ts'],
  publicSystemRouter: ['/api/public/system', 'src/routes/publicSystem.ts'],
  usersPublicRouter: ['/api/users', 'src/routes/usersPublic.ts'],
  authRouter: ['/api/auth', 'src/routes/auth.ts'],
  userRouter: ['/api/user', 'src/routes/user.ts'],
  calendarRouter: ['/api/calendar', 'src/routes/calendar.ts'],
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

/** Campaign/admin subrouters inherit their parent's authentication and rate policies. */
const NESTED_ROUTER_MOUNTS = Object.freeze({
  processingAdminRouter: ['/api/admin/providers', 'src/routes/processingProviders.ts'],
  audioAdminRouter: ['/api/admin/audio', 'src/routes/audioSettings.ts'],
  campaignAudioRouter: ['/api/campaigns/:campaignHandle/audio', 'src/routes/audioSettings.ts'],
  sessionRecordingsRouter: ['/api/campaigns/:campaignHandle/audio', 'src/routes/sessionRecordings.ts'],
  audioUploadsRouter: ['/api/campaigns/:campaignHandle/asset-uploads', 'src/routes/audioUploads.ts'],
});

function literalText(node) {
  if (node?.type === 'StringLiteral') return node.value;
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis[0].value.cooked;
  }
  return undefined;
}

function parseSource(source, filename) {
  return parse(source, {
    sourceType: 'module',
    sourceFilename: filename,
    plugins: ['typescript'],
    createParenthesizedExpressions: true,
    errorRecovery: false,
  });
}

function walk(node, visit) {
  visit(node);
  // Inspect child nodes rather than a fixed visitor-key table so TypeScript
  // containers do not hide route calls. Metadata and comments are not AST children.
  const children = [];
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'extra', 'comments', 'leadingComments', 'innerComments', 'trailingComments'].includes(key)) continue;
    for (const child of Array.isArray(value) ? value : [value]) {
      if (child && typeof child.type === 'string' && typeof child.start === 'number') children.push(child);
    }
  }
  children.sort((a, b) => a.start - b.start || a.end - b.end);
  for (const child of children) walk(child, visit);
}

function memberCall(node) {
  if (!['CallExpression', 'OptionalCallExpression'].includes(node.type)) return undefined;
  const member = node.callee;
  if (
    !['MemberExpression', 'OptionalMemberExpression'].includes(member.type) ||
    member.computed || member.object.type !== 'Identifier' || member.property.type !== 'Identifier'
  ) return undefined;
  return { target: member.object.name, method: member.property.name };
}

function openApiPath(expressPath) {
  return expressPath
    .replace(/:([A-Za-z0-9_]+)/g, '{$1}')
    .replace(/\*([A-Za-z0-9_]+)/g, '{$1}');
}

export function extractRouterRoutes(source, routerName, filename = 'route.ts') {
  const sourceFile = parseSource(source, filename);
  const routes = [];

  walk(sourceFile, (node) => {
    const call = memberCall(node);
    if (call) {
      const method = call.method.toLowerCase();
      if (call.target === routerName && HTTP_METHODS.has(method)) {
        const routePath = literalText(node.arguments[0]);
        if (routePath !== undefined) routes.push({
          method,
          routePath,
          line: node.loc.start.line,
          middlewareSource: node.arguments.slice(1, -1).map((argument) => source.slice(argument.start, argument.end)).join(' '),
        });
      }
    }
  });
  return routes;
}

export function inventoryCoreRoutes(backendRoot) {
  const routes = [{ method: 'get', path: '/uploads/{filename}', source: 'src/mountRouters.ts', line: 1 }];
  for (const [routerName, [mountPath, relativeFile]] of Object.entries({ ...CORE_ROUTER_MOUNTS, ...NESTED_ROUTER_MOUNTS })) {
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

/**
 * Static `/api/*` mounts from the app assembly.
 * Mounts live in `src/mountRouters.ts` (called from `createApp`); keep scanning
 * `app.ts` as well so a future inline mount cannot silently drift.
 */
export function inventoryStaticAppMounts(backendRoot) {
  const mounts = [];
  for (const relativeFile of ['src/mountRouters.ts', 'src/app.ts']) {
    const filename = path.join(backendRoot, relativeFile);
    if (!fs.existsSync(filename)) continue;
    const source = fs.readFileSync(filename, 'utf8');
    const sourceFile = parseSource(source, filename);

    walk(sourceFile, (node) => {
      // app.use('/api/...', router)
      const call = memberCall(node);
      if (call?.target === 'app' && call.method === 'use') {
        const mountPath = literalText(node.arguments[0]);
        if (mountPath?.startsWith('/api/') && node.arguments[1]) {
          mounts.push({
            path: mountPath,
            routerExpression: source.slice(node.arguments[1].start, node.arguments[1].end),
            source: relativeFile,
          });
        }
      }

      // listRouterMounts entries: { path: '/api/...', router: ... }
      if (
        node.type === 'ObjectProperty' && !node.computed && !node.shorthand &&
        node.key.type === 'Identifier' && node.key.name === 'path'
      ) {
        const mountPath = literalText(node.value);
        if (mountPath?.startsWith('/api/')) {
          mounts.push({
            path: mountPath,
            routerExpression: 'listRouterMounts',
            source: relativeFile,
          });
        }
      }
    });
  }
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
