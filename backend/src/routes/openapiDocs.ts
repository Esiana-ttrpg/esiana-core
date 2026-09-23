import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import yaml from 'yaml';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function openApiSpecCandidates(moduleDirectory: string): string[] {
  return [
    // Production: dist/backend/src/routes -> dist/backend/openapi
    path.resolve(moduleDirectory, '../../openapi/openapi.yaml'),
    // Development: backend/src/routes -> backend/openapi
    path.resolve(moduleDirectory, '../../../../openapi/openapi.yaml'),
  ];
}

export function resolveOpenApiSpecPath(moduleDirectory = __dirname): string {
  const candidates = openApiSpecCandidates(moduleDirectory);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    `OpenAPI spec not found. Tried: ${candidates.join(', ')}`,
  );
}

export function loadOpenApiSpec(specPath = resolveOpenApiSpecPath()): Record<string, unknown> {
  const raw = fs.readFileSync(specPath, 'utf8');
  return yaml.parse(raw) as Record<string, unknown>;
}

export function createOpenApiDocsRouter(
  specPath = resolveOpenApiSpecPath(),
): Router {
  const router = Router();
  const rawSpec = fs.readFileSync(specPath, 'utf8');
  const spec = yaml.parse(rawSpec) as Record<string, unknown>;

  router.get('/openapi.yaml', (_req, res) => {
    res.type('application/yaml').send(rawSpec);
  });

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
