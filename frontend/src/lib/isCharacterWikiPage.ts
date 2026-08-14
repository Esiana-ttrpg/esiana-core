import { isCharacterEntityPage } from '@shared/resolveCanonicalEntityCategory';
import type { WikiTreeNode } from '@/types/wiki';

export function isCharacterWikiPage(
  page: WikiTreeNode,
  flatPages: readonly WikiTreeNode[] = [],
): boolean {
  return isCharacterEntityPage(page, flatPages);
}
