import { env } from '../src/config/env.js';
import { prisma } from '../src/lib/prisma.js';
import {
  generateApiTokenSecret,
  hashApiToken,
  computeTokenExpiry,
} from '../src/lib/apiToken.js';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const admin = await prisma.user.findFirst({
  where: { role: 'SYSTEM_ADMIN' },
  select: { id: true, email: true },
});
if (!admin) throw new Error('no admin');

const raw = generateApiTokenSecret();
await prisma.userToken.create({
  data: {
    userId: admin.id,
    name: 'debug-token',
    tokenHash: hashApiToken(raw),
    scopes: [],
    expiresAt: computeTokenExpiry(30),
  },
});
await prisma.$disconnect();

const out = path.join(process.cwd(), '.baseline-token.txt');
writeFileSync(out, raw, 'utf8');
console.log('admin', admin.email);
console.log('token file', out);
console.log('test:', `curl -H "Authorization: Bearer ${raw}" http://127.0.0.1:${env.port}/api/campaigns/dev-benchmark-small/status`);
