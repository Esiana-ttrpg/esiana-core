import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { inventoryCoreRoutes } from './openapi-route-inventory.mjs';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const specPath = path.join(backendRoot, 'openapi/openapi.yaml');
const spec = YAML.parse(fs.readFileSync(specPath, 'utf8'));
const rootPackage = JSON.parse(fs.readFileSync(path.join(backendRoot, '../package.json'), 'utf8'));
spec.info.version = rootPackage.version;

const publicOperations = new Set([
  'GET /api/health',
  'GET /api/auth/providers',
  'GET /api/auth/oidc/{providerId}/start',
  'GET /api/auth/oidc/{providerId}/callback',
  'POST /api/auth/register',
  'POST /api/auth/login',
  'POST /api/auth/forgot-password',
  'POST /api/auth/reset-password',
  'POST /api/auth/logout',
  'GET /api/campaign-themes',
  'GET /api/game-systems',
  'GET /api/public-directory',
  'GET /api/public/system/status',
  'GET /api/recruitment/all',
  'GET /api/recruitment/featured',
  'GET /api/recruitment/lobby/{handle}',
  'GET /api/users/{id}/activity',
  'GET /api/users/{id}/avatar',
  'GET /api/users/{id}/creator-attribution',
  'GET /api/users/{id}/public-profile',
]);

// These development-only protocol endpoints are mounted without Esiana
// authentication middleware. Protected fixture resources perform their own
// provider credential checks and therefore are intentionally not included.
const explicitlyAnonymousOperations = new Set([
  'GET /api/plugin-connection-fixtures/oauth/authorize',
  'POST /api/plugin-connection-fixtures/oauth/token',
  'POST /api/plugin-connection-fixtures/oauth/revoke',
]);

// Keep route discovery, parameters, authorization, and security synchronized;
// override only protocol details the generic JSON operation cannot express.
const operationOverrides = new Map([
  ['GET /api/campaigns/{campaignHandle}/events', {
    summary: 'Stream campaign domain events',
    description: 'Authorization: Authenticated application user or API token; Membership in the addressed campaign. Events are transient invalidation signals; reconnecting clients refetch canonical resources.',
    responses: {
      '200': {
        description: 'Campaign-scoped server-sent event stream',
        content: { 'text/event-stream': { schema: { type: 'string' } } },
      },
    },
  }],
]);

const tagRules = [
  [/^\/api\/admin\//, 'Administration'],
  [/^\/api\/auth\//, 'Authentication'],
  [/^\/api\/(public-directory|recruitment)/, 'Recruitment'],
  [/^\/api\/(game-systems|campaign-themes|public\/system)/, 'System Catalog'],
  [/^\/api\/users\//, 'Public Profiles'],
  [/^\/api\/user\/(notifications|notification-)/, 'Notifications'],
  [/^\/api\/user\//, 'User Account'],
  [/\/plugins(?:\/|$)/, 'Plugins'],
  [/\/backup(?:\/|$)/, 'Backup'],
  [/\/(assets|uploads|maps)(?:\/|$)|^\/uploads\//, 'Assets and Maps'],
  [/\/chronology|\/calendars|\/calendar-events|\/time-tracking|\/time\//, 'Chronology'],
  [/\/downtime\//, 'Downtime'],
  [/\/journal\//, 'Journal'],
  [/\/workshop\//, 'Workshop'],
  [/\/world-development|\/world-pressure|\/world-state|\/momentum|\/pacing\//, 'World State'],
  [/\/narrative-|\/entity-graph|\/rumors|\/interpretations|\/lore-claims/, 'Narrative Knowledge'],
  [/\/wiki|\/workspace\//, 'Wiki'],
  [/^\/api\/campaigns/, 'Campaigns'],
  [/^\/api\/assets|^\/api\/plugin-assets/, 'Assets and Maps'],
  [/^\/api\/content-packs|^\/api\/sample-data/, 'Content Packs'],
  [/^\/api\/import-providers/, 'Import'],
  [/^\/api\/health$/, 'System'],
];

function tagFor(routePath) {
  return tagRules.find(([pattern]) => pattern.test(routePath))?.[1] ?? 'System';
}

function humanize(value) {
  return value
    .replace(/[{}]/g, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function summaryFor(method, routePath) {
  const segments = routePath.split('/').filter(Boolean);
  const resource = segments.slice(-2).map(humanize).join(' ');
  const verb = { get: 'Get', post: 'Create or run', put: 'Replace', patch: 'Update', delete: 'Delete' }[method] ?? humanize(method);
  return `${verb} ${resource}`;
}

function structuralPath(routePath) {
  return routePath.replace(/\{[^}]+\}/g, '{}');
}

function parametersFor(routePath) {
  return [...routePath.matchAll(/\{([^}]+)\}/g)].map(([, name]) => ({
    name,
    in: 'path',
    required: true,
    schema: { type: 'string' },
  }));
}

const campaignGuardDescriptions = [
  ['requireCampaignOwner', 'Campaign owner capability (campaign-scoped; not system administration)'],
  ['requireGamemasterSettings', 'Campaign settings modification privilege (campaign-scoped; not system administration)'],
  ['requireChronologyManager', 'Campaign chronology-management permission'],
  ['requireNonObserverMember', 'Non-observer campaign membership'],
  ['requireMapsEdit', 'Campaign maps-edit capability'],
  ['requireAssetsUpload', 'Campaign asset-upload capability'],
  ['requireAssetsDeleteAny', 'Campaign asset-delete capability'],
  ['requireRumorModerate', 'Campaign rumor-moderation capability'],
  ['requireDiscoveryReveal', 'Campaign discovery-reveal capability'],
  ['requireDowntimeManage', 'Campaign downtime-management capability'],
  ['requirePageVisibilityEdit', 'Campaign page-visibility capability'],
  ['requirePageEditAny', 'Campaign page-edit capability'],
  ['requireAdventureStoryboardEdit', 'Campaign storyboard-edit capability'],
  ['requirePageCreate', 'Campaign page-create capability'],
  ['requireJournalPlannerAccess', 'Campaign journal-planner capability'],
  ['requireQuestEdit', 'Campaign quest-edit capability'],
  ['requireThreadEdit', 'Campaign thread-edit capability'],
  ['requireNotesModerate', 'Campaign notes-moderation capability'],
];

function authorizationFor(route) {
  if (route.source === 'src/routes/admin.ts') {
    return { boundary: 'system-administration', requires: ['Authenticated application user', 'SYSTEM_ADMIN application role'] };
  }
  if (route.source === 'src/routes/campaignScoped.ts') {
    const requires = ['Authenticated application user or API token', 'Membership in the addressed campaign'];
    for (const [guard, description] of campaignGuardDescriptions) {
      if (route.middlewareSource.includes(guard)) requires.push(description);
    }
    if (/\/(wiki|workspace|maps|uploads|journal|entity-graph|interpretations|lore-claims)(?:\/|$)/.test(route.path)) {
      requires.push('Resource-level visibility and ownership checks performed by the controller/service');
    }
    return { boundary: 'campaign', requires };
  }
  if (route.source === 'src/routes/plugins.ts') {
    const scope = route.middlewareSource.match(/API_TOKEN_SCOPES\.([A-Z_]+)/)?.[1];
    return {
      boundary: 'application-plugin-management',
      requires: ['Authenticated application user or API token', ...(scope ? [`Bearer-token scope: ${scope}`] : [])],
      note: 'Token scopes restrict bearer tokens only and do not bypass other authorization checks.',
    };
  }
  if (route.source === 'src/routes/user.ts') {
    return { boundary: 'own-user-account', requires: ['Authenticated application user session'] };
  }
  if (route.source === 'src/routes/campaigns.ts' && route.path !== '/api/campaigns/public') {
    const requires = ['Authenticated application user or API token'];
    if (route.middlewareSource.includes('requireCampaignMembership')) requires.push('Membership in the addressed campaign');
    if (route.middlewareSource.includes('requireCampaignOwner')) requires.push('Campaign owner capability (campaign-scoped; not system administration)');
    if (route.middlewareSource.includes('requireGamemasterSettings')) requires.push('Campaign settings modification privilege (campaign-scoped; not system administration)');
    return { boundary: 'campaign-or-account', requires };
  }
  return { boundary: 'public-or-resource-conditional', requires: [] };
}

function securityFor(route) {
  const key = `${route.method.toUpperCase()} ${route.path}`;
  if (explicitlyAnonymousOperations.has(key)) return [{}];
  if (publicOperations.has(key) || route.path.startsWith('/api/plugin-assets/')) return undefined;
  if (route.path === '/uploads/{filename}' || route.path.startsWith('/api/assets/')) {
    return [{}, { cookieAuth: [] }, { bearerAuth: [] }];
  }
  if (route.source === 'src/routes/admin.ts'
    || route.source === 'src/routes/user.ts'
    || route.source === 'src/routes/contentPacks.ts'
    || route.source === 'src/routes/sampleData.ts'
    || route.source === 'src/routes/auth.ts') return [{ cookieAuth: [] }];
  return [{ cookieAuth: [] }, { bearerAuth: [] }];
}

function genericOperation(route, canonicalPath) {
  const success = route.method === 'post' && /(?:\/async|\/restore)$/.test(route.path) ? '202' : '200';
  const operation = {
    tags: [tagFor(route.path)],
    summary: summaryFor(route.method, route.path),
    operationId: `${route.method}_${route.path.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '')}`,
    'x-esiana-authorization': authorizationFor(route),
  };
  const key = `${route.method.toUpperCase()} ${route.path}`;
  const optionalAssetAuth = route.path === '/uploads/{filename}' || route.path.startsWith('/api/assets/');
  if (!publicOperations.has(key) && !optionalAssetAuth && !route.path.startsWith('/api/plugin-assets/')) {
    operation.security = [{ cookieAuth: [] }, { bearerAuth: [] }];
  } else if (optionalAssetAuth) {
    operation.security = [{}, { cookieAuth: [] }, { bearerAuth: [] }];
  }
  const parameters = parametersFor(canonicalPath);
  if (parameters.length) operation.parameters = parameters;
  if (['post', 'put', 'patch'].includes(route.method)) {
    operation.requestBody = {
      required: false,
      description: 'JSON fields accepted by this operation. Action endpoints may not require a body.',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiRequest' } } },
    };
  }
  const binaryResponse = route.path === '/uploads/{filename}'
    || route.path.startsWith('/api/assets/')
    || route.path.startsWith('/api/plugin-assets/')
    || /\/(?:backup|export)(?:\/|$)/.test(route.path) && route.method === 'get';
  operation.responses = {
    [success]: {
      description: 'Successful response',
      content: binaryResponse
        ? { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } }
        : { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } },
    },
    '400': { $ref: '#/components/responses/BadRequest' },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '403': { $ref: '#/components/responses/Forbidden' },
    '404': { $ref: '#/components/responses/NotFound' },
    '429': { $ref: '#/components/responses/RateLimited' },
    '500': { $ref: '#/components/responses/InternalError' },
  };
  return operation;
}

spec.tags = [...new Set(tagRules.map(([, tag]) => tag))].map((name) => ({ name }));
spec.paths ??= {};
const legacyTags = { Auth: 'Authentication', Assets: 'Assets and Maps' };
for (const pathItem of Object.values(spec.paths)) {
  for (const operation of Object.values(pathItem)) {
    if (operation && typeof operation === 'object' && Array.isArray(operation.tags)) {
      operation.tags = operation.tags.map((tag) => legacyTags[tag] ?? tag);
    }
  }
}
const canonicalByStructure = new Map(Object.keys(spec.paths).map((key) => [structuralPath(key), key]));
for (const route of inventoryCoreRoutes(backendRoot)) {
  const structure = structuralPath(route.path);
  const canonicalPath = canonicalByStructure.get(structure) ?? route.path;
  canonicalByStructure.set(structure, canonicalPath);
  spec.paths[canonicalPath] ??= {};
  const current = spec.paths[canonicalPath][route.method];
  if (!current || String(current.operationId ?? '').startsWith(`${route.method}_api_`) || String(current.operationId ?? '').startsWith(`${route.method}_uploads_`)) {
    spec.paths[canonicalPath][route.method] = genericOperation(route, canonicalPath);
  }
  const operation = spec.paths[canonicalPath][route.method];
  operation['x-esiana-authorization'] = authorizationFor(route);
  const security = securityFor(route);
  if (security) operation.security = security;
  else delete operation.security;
  const authorization = operation['x-esiana-authorization'];
  if (authorization.requires.length) {
    const statement = `Authorization: ${authorization.requires.join('; ')}.`;
    if (!String(operation.description ?? '').includes('Authorization:')) {
      operation.description = [operation.description, statement].filter(Boolean).join('\n\n');
    }
  }
  const override = operationOverrides.get(`${route.method.toUpperCase()} ${route.path}`);
  if (override) {
    if (override.summary) operation.summary = override.summary;
    if (override.description) operation.description = override.description;
    if (override.responses) operation.responses = { ...operation.responses, ...override.responses };
  }
}

spec.components ??= {};
spec.components.schemas ??= {};
spec.components.schemas.ApiResponse ??= {
  description: 'Endpoint-specific JSON response. See the operation description and examples.',
  oneOf: [
    { type: 'object', additionalProperties: true },
    { type: 'array', items: {} },
    { type: 'boolean' },
    { type: 'string' },
  ],
};
spec.components.schemas.ApiRequest ??= {
  type: 'object',
  description: 'Operation-specific request fields. Consult the operation summary and validation errors; unknown fields are not guaranteed to be retained.',
  additionalProperties: true,
};
spec.components.responses = {
  BadRequest: { description: 'Invalid request', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
  Unauthorized: { description: 'Authentication required or invalid', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
  Forbidden: { description: 'Authenticated principal lacks the required system, campaign, or token capability', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
  NotFound: { description: 'Resource not found or not visible to this principal', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
  RateLimited: { description: 'Rate limit exceeded; inspect the Retry-After header', headers: { 'Retry-After': { schema: { type: 'integer' } } }, content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
  InternalError: { description: 'Unexpected server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
};

fs.writeFileSync(specPath, YAML.stringify(spec, { lineWidth: 0 }));
console.log(`Synchronized ${inventoryCoreRoutes(backendRoot).length} core Express routes into ${specPath}`);
