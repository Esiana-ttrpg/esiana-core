import { copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(backendRoot, '../shared/campaignThemes.ts');
const target = join(backendRoot, 'src/lib/campaignThemesRegistry.ts');

copyFileSync(source, target);
