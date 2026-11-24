import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { inventoryCoreRoutes } from './openapi-route-inventory.mjs';

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(backend, 'openapi/openapi.yaml');
let text = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
const existing = YAML.parse(text);
const additions = {};
for (const route of inventoryCoreRoutes(backend).filter(route => route.path.startsWith('/opds') || route.path.includes('/opds/credentials'))) {
  if (existing.paths[route.path]?.[route.method]) continue;
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
      '401': { description: 'Session or isolated reader credential required' },
      '403': { description: 'Insufficient privileges or personal OPDS disabled' },
      '404': { description: 'Route disabled or content inaccessible' },
      '429': { description: 'Rate limited' },
    },
  };
  if (protocol && !html && !manifest) operation.parameters.push({ name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 10000 } });
  if (route.method === 'post') operation.requestBody = { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string', minLength: 1, maxLength: 80 } } } } } };
  if (route.method === 'delete' && route.path === '/api/admin/opds/credentials') operation.requestBody = { required: true, content: { 'application/json': { schema: { type: 'object', required: ['confirmation'], properties: { confirmation: { const: 'REVOKE ALL OPDS CREDENTIALS' } } } } } };
  (additions[route.path] ??= {})[route.method] = operation;
}
if (Object.keys(additions).length) text = text.replace('paths:\n', `paths:\n${YAML.stringify(additions).split('\n').filter(Boolean).map(line => `  ${line}`).join('\n')}\n`);
if (!existing.components.securitySchemes.opdsBasic) text = text.replace('  securitySchemes:\n', '  securitySchemes:\n    opdsBasic:\n      type: http\n      scheme: basic\n      description: Any username and an isolated OPDS reader secret as password.\n    opdsBearer:\n      type: http\n      scheme: bearer\n      bearerFormat: Isolated OPDS reader secret (not a general API token)\n');
if (!existing.tags.some(tag => tag.name === 'OPDS')) text = text.replace('tags:\n', 'tags:\n  - name: OPDS\n');
fs.writeFileSync(file, text);
