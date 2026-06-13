import { normalizeEntityCategoryKey } from '@/lib/entityCategoryKeys';
import type { WikiTreeNode } from '@/types/wiki';

export function isCharacterWikiPage(page: WikiTreeNode): boolean {
  if (page.templateType === 'CHARACTER') return true;
  const metadata = page.metadata as Record<string, unknown> | undefined;
  const category = normalizeEntityCategoryKey(
    typeof metadata?.entityCategory === 'string' ? metadata.entityCategory : null,
  );
  return category === 'characters';
}
