/**
 * Resolve `from:` display names to campaign member userIds.
 *
 * Exact case-insensitive match on resolveUserDisplayName / email-derived
 * username. Duplicate names yield a SET of userIds — never an arbitrary pick.
 */

import { prisma } from '../prisma.js';
import { resolveUserDisplayName, deriveUsername } from '../userDisplay.js';

export interface AuthorResolution {
  /** All matching member userIds (may be >1 for duplicate display names). */
  userIds: string[];
  /** True when at least one requested name matched zero members. */
  unresolved: boolean;
}

/**
 * Match author query strings against campaign members.
 * Empty authors → { userIds: [], unresolved: false }.
 */
export async function resolveSearchAuthors(
  campaignId: string,
  authors: string[] | undefined,
): Promise<AuthorResolution> {
  if (!authors || authors.length === 0) {
    return { userIds: [], unresolved: false };
  }

  const members = await prisma.campaignMember.findMany({
    where: { campaignId },
    select: {
      userId: true,
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      },
    },
  });

  const matchedIds = new Set<string>();
  let unresolved = false;

  for (const author of authors) {
    const needle = author.trim().toLowerCase();
    if (!needle) continue;
    let found = false;
    for (const member of members) {
      const display = resolveUserDisplayName(member.user).toLowerCase();
      const username = deriveUsername(member.user.email).toLowerCase();
      if (display === needle || username === needle) {
        matchedIds.add(member.userId);
        found = true;
      }
    }
    if (!found) unresolved = true;
  }

  return { userIds: [...matchedIds], unresolved };
}
