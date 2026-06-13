import type {
  ContinuityIssue,
  ContinuityScope,
} from '../../../shared/continuityIssue.js';
import {
  continuityFingerprint,
  continuityIssueId,
} from '../../../shared/continuityIssue.js';
import {
  aliasCollisionMessage,
  brokenLinkMessage,
  globalUnlinkedEntityMessage,
  unresolvedWikilinkMessage,
  unlinkedEntityMessage,
} from './continuityIssueMessages.js';
import { resolveWikiCodexType } from './resolveWikiCodexType.js';
import type { WikiContinuityPageInput } from './wikiContinuityRoots.js';

export interface BrokenLinkInput {
  targetPageId: string;
  label?: string;
}

export interface UnresolvedWikilinkInput {
  sourcePageId: string;
  rawText: string;
  normalizedText: string;
}

export interface UnlinkedPageInput extends WikiContinuityPageInput {
  inboundLinkCount: number;
}

export interface AliasCollisionInput {
  normalizedAlias: string;
  pageIds: string[];
}

export function buildBrokenLinkIssues(
  pageId: string,
  broken: BrokenLinkInput[],
  scope: ContinuityScope = 'local',
  blockId?: string,
): ContinuityIssue[] {
  return broken.map((row) => {
    const slug = row.label?.trim() || row.targetPageId || 'unknown';
    const fingerprint = continuityFingerprint('broken_link', {
      pageId,
      targetPageId: row.targetPageId || undefined,
      slug: row.targetPageId ? undefined : slug,
    });
    return {
      id: continuityIssueId(fingerprint),
      fingerprint,
      severity: 'critical',
      scope,
      type: 'broken_link',
      producer: 'link_integrity',
      message: brokenLinkMessage(row.label?.trim() || slug),
      pageId,
      relatedPageId: row.targetPageId || undefined,
      linkLabel: row.label,
      blockId,
    };
  });
}

export function buildUnresolvedWikilinkIssues(
  rows: UnresolvedWikilinkInput[],
  scope: ContinuityScope,
  blockId?: string,
): ContinuityIssue[] {
  return rows.map((row) => {
    const fingerprint = continuityFingerprint('unresolved_wikilink', {
      sourcePageId: row.sourcePageId,
      normalizedText: row.normalizedText,
      blockId,
    });
    return {
      id: continuityIssueId(fingerprint),
      fingerprint,
      severity: 'critical',
      scope,
      type: 'unresolved_wikilink',
      producer: 'wikilink_resolver',
      message: unresolvedWikilinkMessage(row.rawText),
      pageId: row.sourcePageId,
      linkLabel: row.rawText,
      blockId,
    };
  });
}

export function buildUnlinkedEntityIssue(
  page: UnlinkedPageInput,
  scope: ContinuityScope,
): ContinuityIssue | null {
  if (page.inboundLinkCount > 0) return null;

  const codexType = resolveWikiCodexType({
    templateType: page.templateType,
    metadata: page.metadata,
  });
  const fingerprint = continuityFingerprint('unlinked_entity', {
    pageId: page.id,
  });
  const message =
    scope === 'global'
      ? globalUnlinkedEntityMessage(page.title, codexType)
      : unlinkedEntityMessage(codexType, page.title);

  return {
    id: continuityIssueId(fingerprint),
    fingerprint,
    severity: 'warning',
    scope,
    type: 'unlinked_entity',
    producer: 'unlinked_entity_scanner',
    message,
    pageId: page.id,
  };
}

export function buildAliasCollisionIssues(
  collisions: AliasCollisionInput[],
): ContinuityIssue[] {
  return collisions.map((row) => {
    const fingerprint = continuityFingerprint('alias_collision', {
      normalizedAlias: row.normalizedAlias,
    });
    return {
      id: continuityIssueId(fingerprint),
      fingerprint,
      severity: 'warning',
      scope: 'global',
      type: 'alias_collision',
      producer: 'alias_collision_scanner',
      message: aliasCollisionMessage(row.normalizedAlias),
      relatedPageId: row.pageIds[0],
    };
  });
}
