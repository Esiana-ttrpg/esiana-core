import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { inventoryCoreRoutes } from './openapi-route-inventory.mjs';

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(backend, 'openapi/openapi.yaml');
export function syncOpdsOpenApi(text, routes) {
  const document = YAML.parseDocument(text);
  const existing = document.toJS();
  const additions = {};
  const credentialSchema = { type: 'object', required: ['id'], properties: {
    id: { type: 'string' }, name: { type: 'string' }, scopes: { type: 'array', items: { type: 'string' } },
    createdAt: { type: 'string', format: 'date-time' }, expiresAt: { type: 'string', format: 'date-time' },
    lastUsedAt: { type: ['string', 'null'], format: 'date-time' },
  } };
  for (const route of routes.filter(route => route.path.startsWith('/opds') || route.path.includes('/opds/credentials'))) {
    const personal = route.path.startsWith('/opds/me');
    const protocol = route.path.startsWith('/opds');
    const html = protocol && /\{(?:pageId|id)\}$/.test(route.path) && (route.path.includes('/pages/') || route.path.includes('/recruiting/'));
    const manifest = route.path.endsWith('/manifest.json');
    const type = !protocol ? 'application/json' : manifest ? 'application/webpub+json' : html ? 'text/html' : 'application/opds+json';
    const operation = {
      tags: [protocol ? 'OPDS' : route.path.startsWith('/api/admin') ? 'Administration' : 'User Account'],
      summary: `${route.method.toUpperCase()} ${route.path}`,
      description: protocol ? 'Dynamic OPDS 2.0 campaign reading. Disabled by default. Campaign membership, current permissions and audience projection apply. Public routes require the instance login gate and public OPDS flags to allow access.' : 'Manage isolated read-only OPDS reader credentials. Secrets are returned only at creation. Administrators never receive credential secrets.',
      security: personal ? [{ opdsBasic: [] }, { opdsBearer: [] }] : protocol ? [{}] : [{ cookieAuth: [] }],
      parameters: [...route.path.matchAll(/\{([^}]+)\}/g)].map(match => ({ name: match[1], in: 'path', required: true, schema: { type: 'string' } })),
      responses: {
        [route.method === 'post' ? '201' : '200']: { description: 'Success', content: { [type]: { schema: { type: html ? 'string' : 'object' } } } },
        '401': { description: !protocol ? 'Session authentication required' : personal ? 'Isolated reader credential required' : 'Authentication required' },
        '403': { description: 'Insufficient privileges or personal OPDS disabled' },
        '404': { description: 'Route disabled or content inaccessible' },
        '429': { description: 'Rate limited' },
      },
    };
    if (protocol && !html && !manifest) operation.parameters.push({ name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 10000 } });
    if (route.method === 'post') {
      operation.requestBody = { required: true, content: { 'application/json': { schema: { type: 'object', additionalProperties: false, required: ['name'], properties: { name: { type: 'string', minLength: 1, maxLength: 80 } } } } } };
      operation.responses['201'].content['application/json'].schema = { type: 'object', required: ['secret', 'credential'], properties: {
        secret: { type: 'string', minLength: 1, description: 'One-time reader secret. Returned only at creation.' }, credential: credentialSchema,
      } };
    }
    if (!protocol && route.method === 'get' && route.path !== '/api/admin/opds/credentials') {
      operation.responses['200'].content['application/json'].schema = { type: 'object', required: ['credentials'], properties: {
        credentials: { type: 'array', items: credentialSchema },
      } };
    }
    if (route.method === 'delete' && route.path === '/api/admin/opds/credentials') operation.requestBody = { required: true, content: { 'application/json': { schema: { type: 'object', additionalProperties: false, required: ['confirmation'], properties: { confirmation: { const: 'REVOKE ALL OPDS CREDENTIALS' } } } } } };
    (additions[route.path] ??= {})[route.method] = operation;
  }
  for (const [routePath, methods] of Object.entries(additions)) {
    for (const [method, operation] of Object.entries(methods)) document.setIn(['paths', routePath, method], operation);
  }
  if (!existing.components.securitySchemes.opdsBasic) document.setIn(['components', 'securitySchemes', 'opdsBasic'], {
    type: 'http', scheme: 'basic', description: 'Any username and an isolated OPDS reader secret as password.',
  });
  if (!existing.components.securitySchemes.opdsBearer) document.setIn(['components', 'securitySchemes', 'opdsBearer'], {
    type: 'http', scheme: 'bearer', bearerFormat: 'Isolated OPDS reader secret (not a general API token)',
  });
  if (!existing.tags.some(tag => tag.name === 'OPDS')) document.addIn(['tags'], { name: 'OPDS' });
  return document.toString({ lineWidth: 0, flowCollectionPadding: false });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(file, syncOpdsOpenApi(fs.readFileSync(file, 'utf8'), inventoryCoreRoutes(backend)));
}
