import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { UserRoles } from '../types/domain.js';
import { prisma } from './prisma.js';

test('dual-engine portability: User.role write uses TEXT column not Postgres enum', async (t) => {
  const stamp = randomUUID().slice(0, 8);
  const email = `portability-${stamp}@example.test`;

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: 'test-hash',
      role: UserRoles.USER,
    },
    select: { id: true, role: true },
  });

  t.after(async () => {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
  });

  assert.equal(user.role, UserRoles.USER);

  const admin = await prisma.user.create({
    data: {
      email: `portability-admin-${stamp}@example.test`,
      passwordHash: 'test-hash',
      role: UserRoles.SYSTEM_ADMIN,
    },
    select: { id: true, role: true },
  });

  t.after(async () => {
    await prisma.user.delete({ where: { id: admin.id } }).catch(() => undefined);
  });

  assert.equal(admin.role, UserRoles.SYSTEM_ADMIN);
});
