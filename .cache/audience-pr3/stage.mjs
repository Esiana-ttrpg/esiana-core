import fs from 'node:fs';
import path from 'node:path';
import { normalizeSchemaPrismaForSqlite } from '../../backend/prisma/scripts/sqliteSchema.mjs';
const schema = fs.readFileSync('backend/prisma/schema.prisma', 'utf8');
const output = path.resolve('.cache/audience-pr3/client').replaceAll('\\', '/');
const staged = normalizeSchemaPrismaForSqlite(schema).replace(/output\s*=\s*"\.\.\/src\/generated\/prisma"/, `output = "${output}"`);
fs.writeFileSync('.cache/audience-pr3/schema.prisma', staged);
