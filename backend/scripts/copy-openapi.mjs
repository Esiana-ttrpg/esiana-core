import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'openapi');
const target = path.join(root, 'dist/backend/openapi');

fs.cpSync(source, target, { recursive: true });
