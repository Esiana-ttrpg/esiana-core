import { METRIC_REGISTRY, type MetricId } from '../../../../../shared/metricRegistry.js';
import type { MetricValue } from '../../../../../shared/metricValue.js';
import type {
  PersonalStatisticsExportDailyAggregate,
  PersonalStatisticsExportJson,
  PersonalStatisticsResponse,
  WritingDayCompleteness,
} from '../../../../../shared/statsTypes.js';
import { uniqueDocumentIds } from '../../../../../shared/writingSession.js';
import { prisma } from '../../prisma.js';
import {
  listResolvedWritingWordRows,
  type NarrativeWordEvent,
} from '../writing/aggregateWritingWords.js';
import { calendarDateKey } from './zonedTime.js';
import { queryPersonalStatistics } from './queryPersonalStatistics.js';

const EXPORT_NOTES = [
  'Word diffs measure change between two versions of a save, not original authorship.',
  'Session duration is the union of focused intervals. Fifteen minutes groups sessions; it is not active time.',
  'Document bodies, private titles, other users’ activity, and campaign names are omitted.',
  'Unmatched historical PAGE_CREATED and PAGE_EDITED wordDelta values are exported as reconstructed net-only rows. Added versus removed is not invented.',
  'Worldbuilding domains are mutually exclusive. Factions ride organization wiki pages and stay not_yet_tracked so they are not double-counted. Relationships use LINK_CREATED, never derived EntityRelation rows.',
];

type ContributionRow = {
  id: string;
  occurredAt: Date;
  campaignId: string;
  documentId: string;
  sourceId: string;
  wordsAdded: number;
  wordsRemoved: number;
  netChange: number;
  origin: string;
  availability: string;
  writingSessionId: string | null;
  narrativeEventId: string | null;
};

type SessionRow = {
  id: string;
  campaignId: string;
  startedAt: Date;
  endedAt: Date | null;
  activeDurationMs: number;
  completeness: string;
  documentIds: unknown;
};

function metricDefinitionsFor(
  payload: PersonalStatisticsResponse,
): PersonalStatisticsExportJson['metricDefinitions'] {
  const ids = new Set<MetricId>([
    ...(Object.keys(payload.snapshot) as MetricId[]),
    ...(Object.keys(payload.period) as MetricId[]),
    ...(Object.keys(payload.habits) as MetricId[]),
  ]);
  const definitions: PersonalStatisticsExportJson['metricDefinitions'] = [];
  for (const id of ids) {
    const def = METRIC_REGISTRY[id];
    if (!def) continue;
    definitions.push({
      id: def.id,
      unit: def.unit,
      source: def.source,
      timeSemantics: def.timeSemantics,
      attributionRules: def.attributionRules,
      historicalCompleteness: def.historicalCompleteness,
      reportingClock: def.reportingClock,
      aggregation: def.aggregation,
    });
  }
  return definitions.sort((a, b) => a.id.localeCompare(b.id));
}

function completenessOf(input: {
  reconstructed: boolean;
  hasActivity: boolean;
}): WritingDayCompleteness {
  if (input.reconstructed) return 'partial';
  if (input.hasActivity) return 'measured';
  return 'none';
}

export function mergeExportContributionDetails(input: {
  contributions: ContributionRow[];
  events: Array<NarrativeWordEvent & { campaignId: string; pageId: string | null }>;
  start: Date;
  end: Date;
}): ContributionRow[] {
  const resolved = listResolvedWritingWordRows({
    contributions: input.contributions,
    events: input.events,
    start: input.start,
    end: input.end,
  });
  return resolved.map((item) => {
    if (item.kind === 'stored') return item.row as ContributionRow;
    return {
      id: `reconstructed:${item.event.id}`,
      occurredAt: item.row.occurredAt,
      campaignId: item.event.campaignId ?? '',
      documentId: item.event.pageId ?? '',
      sourceId: 'wiki.page',
      wordsAdded: item.row.wordsAdded,
      wordsRemoved: item.row.wordsRemoved,
      netChange: item.row.netChange,
      origin: item.row.origin,
      availability: item.row.availability,
      writingSessionId: null,
      narrativeEventId: item.row.narrativeEventId,
    };
  });
}

export function assembleExportDailyAggregates(input: {
  timeZone: string;
  contributions: ContributionRow[];
  sessions: SessionRow[];
}): PersonalStatisticsExportDailyAggregate[] {
  const days = new Map<
    string,
    {
      wordsAdded: number;
      wordsRemoved: number;
      sessionCount: number;
      sessionMinutes: number;
      reconstructed: boolean;
      hasActivity: boolean;
    }
  >();
  const ensure = (date: string) => {
    const current = days.get(date) ?? {
      wordsAdded: 0,
      wordsRemoved: 0,
      sessionCount: 0,
      sessionMinutes: 0,
      reconstructed: false,
      hasActivity: false,
    };
    days.set(date, current);
    return current;
  };

  for (const row of input.contributions) {
    if (row.origin !== 'human') continue;
    const day = ensure(calendarDateKey(row.occurredAt, input.timeZone));
    day.wordsAdded += row.wordsAdded;
    day.wordsRemoved += row.wordsRemoved;
    day.hasActivity = true;
    if (row.availability !== 'measured') day.reconstructed = true;
  }
  for (const session of input.sessions) {
    const day = ensure(calendarDateKey(session.startedAt, input.timeZone));
    day.sessionCount += 1;
    day.sessionMinutes += Math.max(0, Math.round(session.activeDurationMs / 60_000));
    day.hasActivity = true;
    if (session.completeness !== 'measured') day.reconstructed = true;
  }

  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, day]) => ({
      date,
      wordsAdded: day.wordsAdded,
      wordsRemoved: day.wordsRemoved,
      netChange: day.wordsAdded - day.wordsRemoved,
      sessionCount: day.sessionCount,
      sessionMinutes: day.sessionMinutes,
      completeness: completenessOf(day),
    }));
}

export function buildPersonalStatisticsExportJson(input: {
  payload: PersonalStatisticsResponse;
  exportedAt: Date;
  contributions: ContributionRow[];
  sessions: SessionRow[];
}): PersonalStatisticsExportJson {
  return {
    version: 1,
    exportedAt: input.exportedAt.toISOString(),
    timeZone: input.payload.timeZone,
    visibilityContext: 'owner',
    range: input.payload.range,
    campaignId: input.payload.campaignId,
    provenance: {
      timestamps: 'UTC',
      reportingClock: 'real_world',
      notes: EXPORT_NOTES,
    },
    metricDefinitions: metricDefinitionsFor(input.payload),
    snapshot: input.payload.snapshot,
    period: input.payload.period,
    habits: input.payload.habits,
    worldbuilding: input.payload.worldbuilding,
    contributions: input.contributions.map((row) => ({
      id: row.id,
      occurredAt: row.occurredAt.toISOString(),
      campaignId: row.campaignId,
      documentId: row.documentId,
      sourceId: row.sourceId,
      wordsAdded: row.wordsAdded,
      wordsRemoved: row.wordsRemoved,
      netChange: row.netChange,
      origin: row.origin,
      availability: row.availability,
      writingSessionId: row.writingSessionId,
      narrativeEventId: row.narrativeEventId,
    })),
    dailyAggregates: assembleExportDailyAggregates({
      timeZone: input.payload.timeZone,
      contributions: input.contributions,
      sessions: input.sessions,
    }),
    writingSessions: input.sessions.map((session) => ({
      id: session.id,
      campaignId: session.campaignId,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() ?? null,
      activeDurationMs: session.activeDurationMs,
      completeness: session.completeness,
      documentIds: uniqueDocumentIds(session.documentIds),
    })),
  };
}

function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function csvTable(headers: string[], rows: Array<Array<unknown>>): string {
  return [
    headers.join(','),
    ...rows.map((row) => row.map(csvCell).join(',')),
  ].join('\n');
}

function metricValueCells(value: MetricValue): [string, string, string] {
  if (value.status === 'unavailable') return [value.status, '', value.reason];
  return [value.status, String(value.amount), ''];
}

function metricMapRows(
  metrics: PersonalStatisticsResponse['snapshot'],
): Array<Array<unknown>> {
  return Object.entries(metrics).flatMap(([id, value]) =>
    value ? [[id, ...metricValueCells(value)]] : [],
  );
}

export function renderPersonalStatisticsExportCsv(
  payload: PersonalStatisticsExportJson,
): string {
  const header = [
    '# Esiana writing statistics export v1',
    `# exportedAt=${payload.exportedAt}`,
    `# timeZone=${payload.timeZone}`,
    `# range.mode=${payload.range.mode}`,
    `# range.start=${payload.range.start ?? ''}`,
    `# range.end=${payload.range.end}`,
    `# campaignId=${payload.campaignId ?? ''}`,
    ...payload.provenance.notes.map((note) => `# ${note}`),
  ].join('\n');

  const metricDefinitions = csvTable(
    [
      'id',
      'unit',
      'source',
      'timeSemantics',
      'attributionRules',
      'historicalCompleteness',
      'reportingClock',
      'aggregation',
    ],
    payload.metricDefinitions.map((row) => [
      row.id,
      row.unit,
      row.source,
      row.timeSemantics,
      row.attributionRules,
      row.historicalCompleteness,
      row.reportingClock,
      row.aggregation,
    ]),
  );

  const metricHeaders = ['metricId', 'status', 'amount', 'reason'];
  const snapshot = csvTable(metricHeaders, metricMapRows(payload.snapshot));
  const period = csvTable(metricHeaders, metricMapRows(payload.period));
  const habits = csvTable(metricHeaders, metricMapRows(payload.habits));

  const worldbuilding = csvTable(
    [
      'domain',
      'createdStatus',
      'createdAmount',
      'createdReason',
      'periodCreatedStatus',
      'periodCreatedAmount',
      'periodCreatedReason',
      'periodEditedStatus',
      'periodEditedAmount',
      'periodEditedReason',
      'periodContributedStatus',
      'periodContributedAmount',
      'periodContributedReason',
    ],
    payload.worldbuilding.map((row) => [
      row.domain,
      ...metricValueCells(row.created),
      ...metricValueCells(row.periodCreated),
      ...metricValueCells(row.periodEdited),
      ...metricValueCells(row.periodContributed),
    ]),
  );

  const contributions = csvTable(
    [
      'id',
      'occurredAt',
      'campaignId',
      'documentId',
      'sourceId',
      'wordsAdded',
      'wordsRemoved',
      'netChange',
      'origin',
      'availability',
      'writingSessionId',
      'narrativeEventId',
    ],
    payload.contributions.map((row) => [
      row.id,
      row.occurredAt,
      row.campaignId,
      row.documentId,
      row.sourceId,
      row.wordsAdded,
      row.wordsRemoved,
      row.netChange,
      row.origin,
      row.availability,
      row.writingSessionId,
      row.narrativeEventId,
    ]),
  );

  const daily = csvTable(
    [
      'date',
      'wordsAdded',
      'wordsRemoved',
      'netChange',
      'sessionCount',
      'sessionMinutes',
      'completeness',
    ],
    payload.dailyAggregates.map((row) => [
      row.date,
      row.wordsAdded,
      row.wordsRemoved,
      row.netChange,
      row.sessionCount,
      row.sessionMinutes,
      row.completeness,
    ]),
  );

  const sessions = csvTable(
    [
      'id',
      'campaignId',
      'startedAt',
      'endedAt',
      'activeDurationMs',
      'completeness',
      'documentIds',
    ],
    payload.writingSessions.map((row) => [
      row.id,
      row.campaignId,
      row.startedAt,
      row.endedAt,
      row.activeDurationMs,
      row.completeness,
      row.documentIds.join(' '),
    ]),
  );

  return `${header}\n\n[metricDefinitions]\n${metricDefinitions}\n\n[snapshot]\n${snapshot}\n\n[period]\n${period}\n\n[habits]\n${habits}\n\n[worldbuilding]\n${worldbuilding}\n\n[contributions]\n${contributions}\n\n[dailyAggregates]\n${daily}\n\n[writingSessions]\n${sessions}\n`;
}

export async function exportOwnerPersonalStatistics(input: {
  userId: string;
  range: {
    mode: PersonalStatisticsResponse['range']['mode'];
    from?: string | null;
    to?: string | null;
  };
  campaignId?: string | null;
  now?: Date;
}): Promise<PersonalStatisticsExportJson> {
  const now = input.now ?? new Date();
  const payload = await queryPersonalStatistics({
    userId: input.userId,
    viewerId: input.userId,
    visibility: 'owner',
    range: input.range,
    campaignId: input.campaignId,
    includeHabits: true,
    includeVisualizations: false,
    now,
  });

  const memberships = await prisma.campaignMember.findMany({
    where: {
      userId: input.userId,
      campaign: { archivedAt: null },
    },
    select: { campaignId: true },
  });
  const campaignIds = payload.campaignId
    ? memberships
        .map((row) => row.campaignId)
        .filter((campaignId) => campaignId === payload.campaignId)
    : memberships.map((row) => row.campaignId);
  const occurredAt = payload.range.start
    ? { gte: new Date(payload.range.start), lt: new Date(payload.range.end) }
    : { lt: new Date(payload.range.end) };

  const rangeStart = payload.range.start ? new Date(payload.range.start) : new Date(0);
  const rangeEnd = new Date(payload.range.end);

  const [storedContributions, events, sessions] = campaignIds.length
    ? await Promise.all([
        prisma.writingContribution.findMany({
          where: {
            userId: input.userId,
            campaignId: { in: campaignIds },
            origin: 'human',
            occurredAt,
          },
          select: {
            id: true,
            occurredAt: true,
            campaignId: true,
            documentId: true,
            sourceId: true,
            wordsAdded: true,
            wordsRemoved: true,
            netChange: true,
            origin: true,
            availability: true,
            writingSessionId: true,
            narrativeEventId: true,
          },
          orderBy: { occurredAt: 'asc' },
        }),
        prisma.narrativeEvent.findMany({
          where: {
            campaignId: { in: campaignIds },
            actorUserId: input.userId,
            source: 'user',
            type: { in: ['PAGE_CREATED', 'PAGE_EDITED'] },
            createdAt: occurredAt,
          },
          select: {
            id: true,
            type: true,
            createdAt: true,
            metadata: true,
            campaignId: true,
            pageId: true,
          },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.writingSession.findMany({
          where: {
            userId: input.userId,
            campaignId: { in: campaignIds },
            startedAt: occurredAt,
            completeness: { not: 'unavailable' },
          },
          select: {
            id: true,
            campaignId: true,
            startedAt: true,
            endedAt: true,
            activeDurationMs: true,
            completeness: true,
            documentIds: true,
          },
          orderBy: { startedAt: 'asc' },
        }),
      ])
    : [[], [], []];

  const contributions = mergeExportContributionDetails({
    contributions: storedContributions,
    events,
    start: rangeStart,
    end: rangeEnd,
  });

  return buildPersonalStatisticsExportJson({
    payload,
    exportedAt: now,
    contributions,
    sessions,
  });
}
