import { parseRuleResourceMetadata } from '@/lib/ruleResourceMetadata';
import {
  findCodexProjectionPage,
  type CodexIdentityProjection,
} from '@/lib/codexIdentityProjection';
import type { WikiPageLineageSnapshot } from '@/lib/entityProjectionQueries';

export type RuleResourceIdentityProjection = CodexIdentityProjection;

export function buildRuleResourceIdentityProjection(
  pageId: string,
  flatPages: readonly WikiPageLineageSnapshot[],
): RuleResourceIdentityProjection | null {
  const page = findCodexProjectionPage(flatPages, pageId);
  if (!page) return null;

  const resource = parseRuleResourceMetadata(page.metadata);
  const lineParts: string[] = [];
  if (resource.resourceType) lineParts.push(resource.resourceType);
  if (resource.scope) lineParts.push(resource.scope);

  return {
    displayName: page.title,
    identityLine: lineParts.join(' • '),
    knownFor: resource.summary,
    portraitUrl: null,
  };
}
