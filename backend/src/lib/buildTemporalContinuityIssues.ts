import type { ChronologyDateParts } from './entityRelationTypes.js';
import { compareDateParts, dateSortKey } from './entityRelationTypes.js';
import type { ContinuityIssue } from '../../../shared/continuityIssue.js';
import {
  continuityFingerprint,
  continuityIssueId,
} from '../../../shared/continuityIssue.js';
import {
  chronologyInstantFromParts,
  formatChronologyDateLabel,
} from '../../../shared/chronologyTypes.js';
import {
  temporalDissolvedOrgReferenceMessage,
  temporalPosthumousReferenceMessage,
} from './continuityIssueMessages.js';

export type TemporalCharacterBoundary = {
  pageId: string;
  title: string;
  deathDate: ChronologyDateParts;
};

export type TemporalOrgBoundary = {
  pageId: string;
  title: string;
  statusEffectiveDate: ChronologyDateParts;
};

export type DatedContentLinkRef = {
  sourcePageId: string;
  sourceTitle: string;
  contentDate: ChronologyDateParts;
  contentDateLabel: string | null;
  targetPageId: string;
  blockId?: string;
};

export type TemporalContinuityIndex = {
  characters: Map<string, TemporalCharacterBoundary>;
  orgs: Map<string, TemporalOrgBoundary>;
  datedLinks: DatedContentLinkRef[];
};

export function chronologyDateKey(parts: ChronologyDateParts): string {
  return String(dateSortKey(parts));
}

function formatDateLabel(parts: ChronologyDateParts): string {
  return (
    formatChronologyDateLabel(chronologyInstantFromParts(parts)) ?? 'unknown date'
  );
}

function buildPosthumousIssue(
  link: DatedContentLinkRef,
  character: TemporalCharacterBoundary,
): ContinuityIssue {
  const contentDateKey = chronologyDateKey(link.contentDate);
  const boundaryDateKey = chronologyDateKey(character.deathDate);
  const fingerprint = continuityFingerprint('temporal_posthumous_reference', {
    sourcePageId: link.sourcePageId,
    targetPageId: character.pageId,
    contentDateKey,
    boundaryDateKey,
  });
  return {
    id: continuityIssueId(fingerprint),
    fingerprint,
    severity: 'warning',
    scope: 'temporal',
    type: 'temporal_posthumous_reference',
    producer: 'chronology_analyzer',
    message: temporalPosthumousReferenceMessage({
      characterTitle: character.title,
      deathDateLabel: formatDateLabel(character.deathDate),
      sourceTitle: link.sourceTitle,
      contentDateLabel: link.contentDateLabel ?? formatDateLabel(link.contentDate),
    }),
    pageId: link.sourcePageId,
    relatedPageId: character.pageId,
    blockId: link.blockId,
  };
}

function buildDissolvedOrgIssue(
  link: DatedContentLinkRef,
  org: TemporalOrgBoundary,
): ContinuityIssue {
  const contentDateKey = chronologyDateKey(link.contentDate);
  const boundaryDateKey = chronologyDateKey(org.statusEffectiveDate);
  const fingerprint = continuityFingerprint('temporal_dissolved_org_reference', {
    sourcePageId: link.sourcePageId,
    targetPageId: org.pageId,
    contentDateKey,
    boundaryDateKey,
  });
  return {
    id: continuityIssueId(fingerprint),
    fingerprint,
    severity: 'warning',
    scope: 'temporal',
    type: 'temporal_dissolved_org_reference',
    producer: 'chronology_analyzer',
    message: temporalDissolvedOrgReferenceMessage({
      orgTitle: org.title,
      dissolutionDateLabel: formatDateLabel(org.statusEffectiveDate),
      sourceTitle: link.sourceTitle,
      contentDateLabel: link.contentDateLabel ?? formatDateLabel(link.contentDate),
    }),
    pageId: link.sourcePageId,
    relatedPageId: org.pageId,
    blockId: link.blockId,
  };
}

export function detectTemporalContradictions(
  index: TemporalContinuityIndex,
  options?: { filterPageId?: string; maxIssues?: number },
): ContinuityIssue[] {
  const maxIssues = options?.maxIssues ?? 50;
  const filterPageId = options?.filterPageId;
  const issues: ContinuityIssue[] = [];
  const seen = new Set<string>();

  for (const link of index.datedLinks) {
    if (issues.length >= maxIssues) break;

    if (
      filterPageId &&
      link.sourcePageId !== filterPageId &&
      link.targetPageId !== filterPageId
    ) {
      continue;
    }

    const character = index.characters.get(link.targetPageId);
    if (character) {
      if (compareDateParts(link.contentDate, character.deathDate) > 0) {
        const issue = buildPosthumousIssue(link, character);
        if (!seen.has(issue.fingerprint)) {
          seen.add(issue.fingerprint);
          issues.push(issue);
        }
      }
    }

    if (issues.length >= maxIssues) break;

    const org = index.orgs.get(link.targetPageId);
    if (org) {
      if (compareDateParts(link.contentDate, org.statusEffectiveDate) > 0) {
        const issue = buildDissolvedOrgIssue(link, org);
        if (!seen.has(issue.fingerprint)) {
          seen.add(issue.fingerprint);
          issues.push(issue);
        }
      }
    }
  }

  return issues;
}
