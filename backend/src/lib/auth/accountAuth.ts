import { prisma } from '../prisma.js';
import { isPasswordAuthEnabled, type PasswordAuthUser } from './passwordAuth.js';

export type SignInMethod =
  | { type: 'password' }
  | { type: 'federated'; providerId: string };

export async function listSignInMethods(userId: string): Promise<SignInMethod[]> {
  const [user, accounts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    }),
    prisma.account.findMany({
      where: { userId },
      select: { provider: true },
    }),
  ]);
  if (!user) return [];
  const methods: SignInMethod[] = [];
  if (isPasswordAuthEnabled(user)) methods.push({ type: 'password' });
  for (const account of accounts) {
    methods.push({ type: 'federated', providerId: account.provider });
  }
  return methods;
}

export async function assertCanRemoveSignInMethod(
  userId: string,
  removing: SignInMethod,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const methods = await listSignInMethods(userId);
  const remaining = methods.filter((method) => {
    if (method.type !== removing.type) return true;
    if (method.type === 'password' && removing.type === 'password') return false;
    if (
      method.type === 'federated' &&
      removing.type === 'federated' &&
      method.providerId === removing.providerId
    ) {
      return false;
    }
    return true;
  });
  if (remaining.length === 0) {
    return {
      ok: false,
      error:
        'You must keep at least one sign-in method (password or a linked identity provider).',
    };
  }
  return { ok: true };
}

export function userHasPassword(user: PasswordAuthUser): boolean {
  return isPasswordAuthEnabled(user);
}
