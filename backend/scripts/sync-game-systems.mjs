import { copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(backendRoot, '../shared/gameSystems.ts');
const target = join(backendRoot, 'src/lib/gameSystemsRegistry.ts');

copyFileSync(source, target);
