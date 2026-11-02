import { CampaignWorkspace } from '../../../../../shared/campaignWorkspace.js';
import {
  WORLDBUILDING_DOMAINS,
  type PersonalStatisticsVisibility,
  type WorldbuildingDomain,
  type WorldbuildingDomainStats,
} from '../../../../../shared/statsTypes.js';
import { isStructuralTemplateType } from '../../../../../shared/wikiTemplateType.js';
import { chronologyWikiDocumentKind } from '../../../../../shared/wikiWorkspaceResolve.js';
import {
  metricPartial,
  metricUnavailable,
  metricValue,
  type MetricValue,
} from '../../../../../shared/metricValue.js';
import { resolveWikiCodexType } from '../../resolveWikiCodexType.js';
import { NarrativeEventType } from '../../narrativeEventService.js';
import type { ResolvedWritingWordRow } from '../writing/aggregateWritingWords.js';

export type WorldbuildingPageInput = {
  id: string;
  title?: string;
  parentId?: string | null;
  workspace?: string | null;
  templateType: string;
  metadata: unknown;
};

const WORKSPACE_DOMAIN: Partial<Record<string, WorldbuildingDomain>> = {
  [CampaignWorkspace.CHARACTERS]: 'characters',
  [CampaignWorkspace.LOCATIONS]: 'locations',
  [CampaignWorkspace.ORGANIZATIONS]: 'organizations',
  [CampaignWorkspace.FAMILIES]: 'families',
  [CampaignWorkspace.BESTIARY]: 'creatures',
  [CampaignWorkspace.CUSTOM]: 'custom',
};

const CODEX_DOMAIN: Partial<Record<string, WorldbuildingDomain>> = {
  CHARACTER: 'characters',
  LOCATION: 'locations',
  ORGANIZATION: 'organizations',
  FAMILY: 'families',
  BESTIARY: 'creatures',
};

/**
 * Mutually exclusive domain for a wiki page. Chronology kind wins, then
 * workspace, then metadata-only `resolveWikiCodexType` (no page id — the locked
 * character/location/organization formulas stay metadata-only).
 */
export function classifyWorldbuildingDomain(
  page: WorldbuildingPageInput,
): WorldbuildingDomain | null {
  const chronology = chronologyWikiDocumentKind({
    id: page.id,
    title: page.title ?? '',
    parentId: page.parentId ?? null,
    templateType: page.templateType,
    metadata: page.metadata,
    workspace: page.workspace,
  });
  if (chronology === 'event') return 'events';
  if (chronology === 'era') return 'eras';

  const template = page.templateType?.trim().toUpperCase() || 'DEFAULT';
  if (isStructuralTemplateType(template)) return null;

  const fromWorkspace = page.workspace ? WORKSPACE_DOMAIN[page.workspace] : undefined;
  if (fromWorkspace) return fromWorkspace;

  const fromCodex = CODEX_DOMAIN[
    resolveWikiCodexType({
      templateType: page.templateType,
      metadata: page.metadata,
    })
  ];
  return fromCodex ?? null;
}

type DomainBucket = {
  created: number;
  periodCreated: number;
  periodEdited: number;
  wordsAdded: number;
  reconstructed: boolean;
};

function emptyBuckets(): Record<WorldbuildingDomain, DomainBucket> {
  return Object.fromEntries(
    WORLDBUILDING_DOMAINS.map((domain) => [
      domain,
      {
        created: 0,
        periodCreated: 0,
        periodEdited: 0,
        wordsAdded: 0,
        reconstructed: false,
      },
    ]),
  ) as Record<WorldbuildingDomain, DomainBucket>;
}

function contributedMetric(bucket: DomainBucket): MetricValue {
  if (bucket.reconstructed) return metricPartial(bucket.wordsAdded);
  return metricValue(bucket.wordsAdded);
}

function documentIdFor(item: ResolvedWritingWordRow): string | null {
  if (item.kind === 'stored') return item.row.documentId ?? null;
  return item.event.pageId ?? item.row.documentId ?? null;
}

function periodField(
  value: MetricValue,
  input: {
    skipPeriod: boolean;
    visibility: PersonalStatisticsVisibility;
    tracked: boolean;
  },
): MetricValue {
  if (!input.tracked) return metricUnavailable('not_yet_tracked');
  if (input.skipPeriod) return metricUnavailable('not_yet_tracked');
  if (input.visibility !== 'owner') return metricUnavailable('private');
  return value;
}

export function assembleWorldbuildingStats(input: {
  createdPages: WorldbuildingPageInput[];
  pagesById: Map<string, WorldbuildingPageInput>;
  periodEvents: Array<{ type: string; pageId?: string | null }>;
  wordRows: ResolvedWritingWordRow[];
  lifetimeLinkCount: number;
  skipPeriod: boolean;
  visibility: PersonalStatisticsVisibility;
}): WorldbuildingDomainStats[] {
  const buckets = emptyBuckets();

  for (const page of input.createdPages) {
    const domain = classifyWorldbuildingDomain(page);
    if (domain) buckets[domain].created += 1;
  }
  buckets.relationships.created = input.lifetimeLinkCount;

  if (!input.skipPeriod) {
    for (const event of input.periodEvents) {
      if (event.type === NarrativeEventType.LINK_CREATED) {
        buckets.relationships.periodCreated += 1;
        continue;
      }
      if (!event.pageId) continue;
      const page = input.pagesById.get(event.pageId);
      if (!page) continue;
      const domain = classifyWorldbuildingDomain(page);
      if (!domain) continue;
      if (event.type === NarrativeEventType.PAGE_CREATED) {
        buckets[domain].periodCreated += 1;
      } else if (event.type === NarrativeEventType.PAGE_EDITED) {
        buckets[domain].periodEdited += 1;
      }
    }

    for (const item of input.wordRows) {
      const documentId = documentIdFor(item);
      if (!documentId) continue;
      const page = input.pagesById.get(documentId);
      if (!page) continue;
      const domain = classifyWorldbuildingDomain(page);
      if (!domain) continue;
      const row = item.row;
      buckets[domain].wordsAdded += row.wordsAdded;
      if (row.availability !== 'measured') buckets[domain].reconstructed = true;
    }
  }

  return WORLDBUILDING_DOMAINS.map((domain) => {
    const faction = domain === 'factions';
    const relationships = domain === 'relationships';
    const bucket = buckets[domain];
    return {
      domain,
      created: faction ? metricUnavailable('not_yet_tracked') : metricValue(bucket.created),
      periodCreated: periodField(metricValue(bucket.periodCreated), {
        skipPeriod: input.skipPeriod,
        visibility: input.visibility,
        tracked: !faction,
      }),
      periodEdited: periodField(metricValue(bucket.periodEdited), {
        skipPeriod: input.skipPeriod,
        visibility: input.visibility,
        tracked: !faction && !relationships,
      }),
      periodContributed: periodField(contributedMetric(bucket), {
        skipPeriod: input.skipPeriod,
        visibility: input.visibility,
        tracked: !faction && !relationships,
      }),
    };
  });
}
