/**
 * Phase 22 — interpretive lore overlays (historical aliases, interpretations, claims).
 * Canonical prose lives on WikiPage; these types are structured knowledge graph nodes.
 */
import type { RevelationProvenance } from './discoveryProjection.js';
import {
  type ChronologyDateParts,
  compareChronologyDateParts,
  dateSortKey,
} from './chronologyTypes.js';

export type { ChronologyDateParts };

export const AliasUsageTypes = {
  OFFICIAL: 'OFFICIAL',
  COLLOQUIAL: 'COLLOQUIAL',
  PEJORATIVE: 'PEJORATIVE',
  RELIGIOUS: 'RELIGIOUS',
  FOREIGN_LANGUAGE: 'FOREIGN_LANGUAGE',
  SECRET: 'SECRET',
  MYTHIC: 'MYTHIC',
} as const;

export type AliasUsageType =
  (typeof AliasUsageTypes)[keyof typeof AliasUsageTypes];

export const LoreSourceTypes = {
  JOURNAL: 'JOURNAL',
  NPC_TESTIMONY: 'NPC_TESTIMONY',
  EVENT_RECORD: 'EVENT_RECORD',
  ARTIFACT: 'ARTIFACT',
  RUMOR: 'RUMOR',
  DIVINE_VISION: 'DIVINE_VISION',
  OTHER: 'OTHER',
} as const;

export type LoreSourceType =
  (typeof LoreSourceTypes)[keyof typeof LoreSourceTypes];

export const LoreAccountKinds = {
  WIDELY_ACCEPTED: 'WIDELY_ACCEPTED',
  REGIONAL_BELIEF: 'REGIONAL_BELIEF',
  MYTHIC_TRADITION: 'MYTHIC_TRADITION',
  SUPPRESSED: 'SUPPRESSED',
  PROPAGANDA: 'PROPAGANDA',
  UNVERIFIED: 'UNVERIFIED',
} as const;

export type LoreAccountKind =
  (typeof LoreAccountKinds)[keyof typeof LoreAccountKinds];

export const LoreConfidences = {
  VERIFIED: 'VERIFIED',
  PARTIAL: 'PARTIAL',
  UNVERIFIED: 'UNVERIFIED',
  CONTESTED: 'CONTESTED',
} as const;

export type LoreConfidence =
  (typeof LoreConfidences)[keyof typeof LoreConfidences];

export const ClaimSourceRoles = {
  SUPPORTS: 'SUPPORTS',
  CONTRADICTS: 'CONTRADICTS',
  REFERENCES: 'REFERENCES',
} as const;

export type ClaimSourceRole =
  (typeof ClaimSourceRoles)[keyof typeof ClaimSourceRoles];

export const NarrativeWeights = {
  MINOR: 'MINOR',
  MAJOR: 'MAJOR',
  FOUNDATIONAL: 'FOUNDATIONAL',
  APOCRYPHAL: 'APOCRYPHAL',
} as const;

export type NarrativeWeight =
  (typeof NarrativeWeights)[keyof typeof NarrativeWeights];

export const KnowledgeStates = {
  KNOWN: 'KNOWN',
  SUSPECTED: 'SUSPECTED',
  CONFIRMED: 'CONFIRMED',
  DISPROVEN: 'DISPROVEN',
  UNDISCOVERED: 'UNDISCOVERED',
} as const;

export type KnowledgeState =
  (typeof KnowledgeStates)[keyof typeof KnowledgeStates];

export const LoreSourceEntityTypes = {
  WIKI_PAGE: 'WIKI_PAGE',
  CALENDAR_EVENT: 'CALENDAR_EVENT',
  CHARACTER: 'CHARACTER',
  ARTIFACT: 'ARTIFACT',
  ORGANIZATION: 'ORGANIZATION',
  SESSION_NOTE: 'SESSION_NOTE',
  OTHER: 'OTHER',
} as const;

export type LoreSourceEntityType =
  (typeof LoreSourceEntityTypes)[keyof typeof LoreSourceEntityTypes];

export const LoreRelationVisibilities = {
  PUBLIC: 'PUBLIC',
  PARTY: 'PARTY',
  GM_ONLY: 'GM_ONLY',
  SECRET: 'SECRET',
} as const;

export type LoreRelationVisibility =
  (typeof LoreRelationVisibilities)[keyof typeof LoreRelationVisibilities];

export type EntityHistoricalAliasRecord = {
  id: string;
  stableKey: string;
  pageId: string;
  campaignId: string;
  name: string;
  label?: string | null;
  context?: string | null;
  usageType: AliasUsageType;
  eraStart?: ChronologyDateParts | null;
  eraEnd?: ChronologyDateParts | null;
  regions?: string[];
  visibility: LoreRelationVisibility;
  isPrimaryInEra: boolean;
  isSecret: boolean;
  playerDiscoverable: boolean;
  sortOrder: number;
};

export type LoreInterpretationGroupRecord = {
  id: string;
  pageId: string;
  campaignId: string;
  topic?: string | null;
  sortOrder: number;
};

export type LoreInterpretationAccountRecord = {
  id: string;
  stableKey: string;
  pageId: string;
  campaignId: string;
  interpretationGroupId?: string | null;
  title: string;
  narrative: string;
  accountKind: LoreAccountKind;
  beliefRegion?: string | null;
  sourceOrigin?: string | null;
  confidence: LoreConfidence;
  visibility: LoreRelationVisibility;
  narrativeWeight?: NarrativeWeight | null;
  gmResolution?: string | null;
  sortOrder: number;
};

export type LoreClaimRecord = {
  id: string;
  stableKey: string;
  pageId: string;
  campaignId: string;
  statement: string;
  interpretationGroupId?: string | null;
  confidence: LoreConfidence;
  visibility: LoreRelationVisibility;
  narrativeWeight?: NarrativeWeight | null;
  gmResolution?: string | null;
  knowledgeState?: KnowledgeState | null;
  discoveredViaSessionId?: string | null;
  discoveredViaType?: string | null;
  discoveredViaRef?: string | null;
  discoveredAt?: string | null;
  revelation?: RevelationProvenance | null;
  sortOrder: number;
};

export type LoreClaimSourceRecord = {
  id: string;
  claimId: string;
  role: ClaimSourceRole;
  sourceType: LoreSourceType;
  sourceEntityType?: LoreSourceEntityType | null;
  sourceEntityId?: string | null;
  label?: string | null;
  note?: string | null;
  visibility: LoreRelationVisibility;
};

export type EraNameEntry = {
  name: string;
  usageType: AliasUsageType;
  label?: string | null;
};

export type EntityHistoricalNameProjection = {
  canonicalTitle: string;
  formerChip?: string | null;
  eraCallout?: EraNameEntry[] | null;
};

export type InterpretiveLoreSummary = {
  formerChip?: string | null;
  disputed?: boolean;
  isContested?: boolean;
  confidenceLabel?: string | null;
  partialVerification?: boolean;
};

export { dateSortKey, compareChronologyDateParts };

export function isDateWithinRange(
  date: ChronologyDateParts,
  start: ChronologyDateParts | null | undefined,
  end: ChronologyDateParts | null | undefined,
): boolean {
  const key = dateSortKey(date);
  if (start && dateSortKey(start) > key) return false;
  if (end && dateSortKey(end) < key) return false;
  return true;
}

export function resolveHistoricalAliasesAtDate(
  aliases: readonly EntityHistoricalAliasRecord[],
  date: ChronologyDateParts,
): EntityHistoricalAliasRecord[] {
  return aliases
    .filter((a) => isDateWithinRange(date, a.eraStart, a.eraEnd))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function resolveFormerPrimaryChip(
  aliases: readonly EntityHistoricalAliasRecord[],
  date: ChronologyDateParts,
  canonicalTitle: string,
): string | null {
  const normalizedCanonical = canonicalTitle.trim().toLowerCase();
  const ended = aliases
    .filter((a) => {
      if (!a.isPrimaryInEra) return false;
      if (a.name.trim().toLowerCase() === normalizedCanonical) return false;
      if (a.eraEnd && dateSortKey(a.eraEnd) < dateSortKey(date)) return true;
      if (!isDateWithinRange(date, a.eraStart, a.eraEnd)) return true;
      return false;
    })
    .sort((a, b) => {
      const endA = a.eraEnd
        ? dateSortKey(a.eraEnd)
        : a.eraStart
          ? dateSortKey(a.eraStart)
          : 0;
      const endB = b.eraEnd
        ? dateSortKey(b.eraEnd)
        : b.eraStart
          ? dateSortKey(b.eraStart)
          : 0;
      return endB - endA;
    });
  return ended[0]?.name ?? null;
}

export function buildEntityHistoricalNameProjection(
  canonicalTitle: string,
  aliases: readonly EntityHistoricalAliasRecord[],
  date: ChronologyDateParts,
): EntityHistoricalNameProjection {
  const inPeriod = resolveHistoricalAliasesAtDate(aliases, date);
  const eraCallout =
    inPeriod.length > 0
      ? inPeriod.map((a) => ({
          name: a.name,
          usageType: a.usageType,
          label: a.label,
        }))
      : null;

  return {
    canonicalTitle,
    formerChip: resolveFormerPrimaryChip(aliases, date, canonicalTitle),
    eraCallout,
  };
}

export function formatAliasUsageTypeLabel(usageType: AliasUsageType): string {
  switch (usageType) {
    case AliasUsageTypes.OFFICIAL:
      return 'Official';
    case AliasUsageTypes.COLLOQUIAL:
      return 'Colloquial';
    case AliasUsageTypes.PEJORATIVE:
      return 'Pejorative';
    case AliasUsageTypes.RELIGIOUS:
      return 'Religious';
    case AliasUsageTypes.FOREIGN_LANGUAGE:
      return 'Foreign language';
    case AliasUsageTypes.SECRET:
      return 'Secret';
    case AliasUsageTypes.MYTHIC:
      return 'Mythic';
    default:
      return usageType;
  }
}

export function formatLoreAccountKindLabel(kind: LoreAccountKind): string {
  switch (kind) {
    case LoreAccountKinds.WIDELY_ACCEPTED:
      return 'Widely Accepted';
    case LoreAccountKinds.REGIONAL_BELIEF:
      return 'Regional Belief';
    case LoreAccountKinds.MYTHIC_TRADITION:
      return 'Mythic Tradition';
    case LoreAccountKinds.SUPPRESSED:
      return 'Suppressed Record';
    case LoreAccountKinds.PROPAGANDA:
      return 'Propaganda';
    case LoreAccountKinds.UNVERIFIED:
      return 'Unverified';
    default:
      return kind;
  }
}
