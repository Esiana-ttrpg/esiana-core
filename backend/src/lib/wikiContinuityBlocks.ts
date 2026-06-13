import {
  buildBrokenLinkIssues,
  buildUnresolvedWikilinkIssues,
} from './buildContinuityIssues.js';
import type { ContinuityIssue } from '../../../shared/continuityIssue.js';
import {
  extractAllWikiTargetsFromBlock,
  extractUnresolvedWikilinksFromBlock,
} from './wikiLinkExtract.js';
import { filterValidWikiTargetIds } from './wikiLinkService.js';

export async function buildBlockScopedLinkIssues(input: {
  campaignId: string;
  pageId: string;
  blocks: Array<Record<string, unknown>>;
}): Promise<ContinuityIssue[]> {
  const issues: ContinuityIssue[] = [];

  for (const block of input.blocks) {
    const blockId = typeof block.id === 'string' ? block.id : undefined;
    if (!blockId) continue;

    const extracted = extractAllWikiTargetsFromBlock(block);
    if (extracted.length === 0) continue;

    const hrefIds = extracted
      .filter((t) => t.targetPageId && !t.isBrokenStub)
      .map((t) => t.targetPageId);
    const stubBroken = extracted
      .filter((t) => t.isBrokenStub || !t.targetPageId)
      .map((t) => ({
        targetPageId: t.targetPageId || '',
        label: t.label,
      }));

    const validIds = new Set(
      await filterValidWikiTargetIds(
        input.campaignId,
        Array.from(new Set(hrefIds)),
      ),
    );

    const brokenFromHrefs = hrefIds
      .filter((id) => id && !validIds.has(id))
      .map((targetPageId) => ({ targetPageId }));

    const broken = [...stubBroken, ...brokenFromHrefs];
    const uniqueBroken = new Map<string, { targetPageId: string; label?: string }>();
    for (const item of broken) {
      const label = 'label' in item ? item.label : undefined;
      const key = item.targetPageId || `label:${label ?? ''}`;
      if (!uniqueBroken.has(key)) uniqueBroken.set(key, item);
    }

    issues.push(
      ...buildBrokenLinkIssues(
        input.pageId,
        Array.from(uniqueBroken.values()),
        'local',
        blockId,
      ),
    );

    const unresolvedInBlock = extractUnresolvedWikilinksFromBlock(block);
    issues.push(
      ...buildUnresolvedWikilinkIssues(
        unresolvedInBlock.map((row) => ({
          sourcePageId: input.pageId,
          rawText: row.rawText,
          normalizedText: row.normalizedText,
        })),
        'local',
        blockId,
      ),
    );
  }

  return issues;
}
