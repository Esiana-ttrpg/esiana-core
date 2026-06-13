import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import yaml from 'yaml';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SPEC_CANDIDATES = [
  path.resolve(__dirname, '../../openapi/openapi.yaml'),
  path.resolve(__dirname, '../../../../openapi/openapi.yaml'),
];

export function resolveOpenApiSpecPath(): string {
  for (const candidate of SPEC_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    `OpenAPI spec not found. Tried: ${SPEC_CANDIDATES.join(', ')}`,
  );
}

export function loadOpenApiSpec(specPath = resolveOpenApiSpecPath()): Record<string, unknown> {
  const raw = fs.readFileSync(specPath, 'utf8');
  return yaml.parse(raw) as Record<string, unknown>;
}

export function createOpenApiDocsRouter(): Router {
  const router = Router();
  const spec = loadOpenApiSpec();

  router.get('/openapi.json', (_req, res) => {
    res.json(spec);
  });

  router.use(
    '/',
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      customSiteTitle: 'Esiana API',
      swaggerOptions: {
        persistAuthorization: true,
      },
    }),
  );

  return router;
}

export function isOpenApiDocsEnabled(): boolean {
  if (process.env.OPENAPI_DOCS_ENABLED === 'false') return false;
  if (process.env.OPENAPI_DOCS_ENABLED === 'true') return true;
  return env.nodeEnv !== 'production';
}
