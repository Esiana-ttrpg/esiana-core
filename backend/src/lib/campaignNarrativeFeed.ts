import { prisma } from './prisma.js';
import type { CampaignContext } from '../types/api.js';
import { chronologyCanView, chronologyElevated } from './chronologyAccess.js';
import { canViewWikiPage } from './wikiTree.js';
import { getContentPresenceStateMap } from './contentPresenceService.js';
import { buildPageDiscoveryMap } from './discoveryProjectionService.js';
import { wikiPageHrefSelect } from './wikiPageHrefSelect.js';
import { buildWikiPageHref } from './wikiLinkService.js';
import { buildOccurrences } from './buildChronologyOccurrences.js';
import { calendarEpochMinuteForDate, convertEpochToCalendarState, parseMonths, getMonthsForYear, parseLeapRules, resolveMonthName } from './timeEngine.js';
import { parseSessionNoteMetadata } from './sessionNoteMetadata.js';
import { loadDowntimeGapOverlays } from './downtimeGapOverlays.js';
import { parseOrganizationMetadata, isOrganizationMetadataPresent } from './organizationMetadata.js';
import { ContentPresenceEntityType } from '../../../shared/contentPresence.js';
import { buildNarrativeViewerContext, projectWikiPageVisibility, projectTimelineEventVisibility, isTimelineEventVisible } from '../../../shared/narrativeProjection.js';
import { anchorFromTimelineOccurrence, anchorFromSessionTimelinePoint, anchorFromOrgRelationEvent, anchorFromWorldAdvanceEffect, anchorFromDowntimePeriod, type CanonicalChronologyAnchor, type ChronologyDomainKindValue } from '../../../shared/chronologyTypes.js';
import { buildConvergenceEntry, type ConvergenceOverlayBundle, type ConvergenceTimelineEntry } from '../../../shared/chronologyConvergence.js';
import { feedExcerpt, feedRange, type FeedImportance, type CampaignFeedCoverage, type FeedEntryMetadata } from '../../../shared/campaignFeed.js';
import { deriveDowntimePeriodGapsFromSessionEpochs, formatDowntimePeriodTitle } from '../../../shared/downtimePeriodProjection.js';
import { parseWorldAdvanceBatchPayload, WORLD_ADVANCE_CATEGORY } from '../../../shared/worldAdvance.js';
import { asPublicPagePath } from '../../../shared/publicPagePath.js';
import { filterFeedImportance, matchesFeedWindow, orderFeedEntries, sessionSummaryExcerpt } from './campaignFeedProjection.js';

const INVENTORY_LIMIT = 2000;
const UNDATED_LIMIT = 100;
export interface CampaignFeedOptions {
  from?: string; to?: string; order: 'asc' | 'desc'; importance: FeedImportance[];
  includeFuture: boolean; domains: ChronologyDomainKindValue[] | null; sessionLinkedOnly: boolean;
}

/** Explicit opt-in projection. The legacy convergence path remains unchanged. */
export async function buildCampaignNarrativeFeed(ctx: CampaignContext, options: CampaignFeedOptions): Promise<ConvergenceOverlayBundle> {
  const campaignId = ctx.campaignId, handle = ctx.campaignHandle ?? campaignId, elevated = chronologyElevated(ctx);
  const [campaign, calendars] = await Promise.all([
    prisma.campaign.findUniqueOrThrow({ where: { id: campaignId }, select: { currentEpochMinute: true } }),
    prisma.fantasyCalendar.findMany({ where: { campaignId }, orderBy: [{ isMasterTime: 'desc' }, { id: 'asc' }] }),
  ]);
  const now = campaign.currentEpochMinute ?? 0n;
  const master = calendars.find(row => row.isMasterTime) ?? calendars[0];
  const defaultRange = feedRange(now, master?.epochOffset ?? 0n);
  const from = options.from ?? defaultRange.from, to = options.to ?? defaultRange.to;
  if (!/^-?\d+$/.test(from) || !/^-?\d+$/.test(to) || BigInt(from) >= BigInt(to)) throw new Error('INVALID_FEED_RANGE');
  const nativeWindows = calendars.map(calendar => {
    try {
      const first = convertEpochToCalendarState(BigInt(from) < calendar.epochOffset ? calendar.epochOffset : BigInt(from), calendar);
      const last = convertEpochToCalendarState(BigInt(to) < calendar.epochOffset ? calendar.epochOffset : BigInt(to), calendar);
      return { calendarId: calendar.id, targetYear: { gte: first.year, lte: last.year } };
    } catch { return { calendarId: calendar.id }; }
  });
  const [eventRows, pageRows, points, eras, momentum] = await Promise.all([
    prisma.calendarEvent.findMany({ where: { calendar: { campaignId }, OR: [
      { targetEpochMinute: { gte: BigInt(from), lt: BigInt(to) } }, { isRepeating: true },
      { targetEpochMinute: null, OR: [{ targetYear: null }, ...nativeWindows] },
    ] }, orderBy: [{ targetEpochMinute: 'desc' }, { id: 'asc' }], take: INVENTORY_LIMIT + 1 }),
    prisma.wikiPage.findMany({ where: { campaignId, deletedAt: null }, select: { ...wikiPageHrefSelect, visibility: true }, orderBy: { id: 'asc' }, take: INVENTORY_LIMIT + 1 }),
    prisma.campaignSessionTimeline.findMany({ where: { campaignId }, orderBy: { sequenceOrder: 'desc' }, take: INVENTORY_LIMIT + 1 }),
    prisma.campaignEra.findMany({ where: { campaignId } }),
    prisma.campaignMomentum.findUnique({ where: { campaignId }, select: { eraRecurrenceHistory: true } }),
  ]);
  const coverage: CampaignFeedCoverage = {
    requestedRange: { mode: 'EPOCH_RANGE', from, to }, sourceWarnings: [],
    gaps: ['Current quest status and entity edit dates are not transition history.',
      'Raw map keyframes and current territorial overlays are not projected; recorded applied world-advance effects remain available.',
      'Condition-based and plugin-specific recurrence semantics are limited to the shared chronology generator.'],
    undated: { limit: UNDATED_LIMIT, capped: false, returned: 0 }, unaligned: { limit: UNDATED_LIMIT, capped: false, returned: 0 },
    order: options.order, includeFuture: options.includeFuture, todayEndEpochMinute: defaultRange.to,
    availableRange: { from: null, to: null },
  };
  const warn = (source: string, code: string, message: string) => {
    if (!coverage.sourceWarnings.some(row => row.source === source && row.code === code)) coverage.sourceWarnings.push({ source, code, message });
  };
  // Inventory notices reveal no hidden-record counts or identities.
  for (const source of ['world_event', 'session_chronicle', 'org_relation']) {
    warn(source, 'BOUNDED_INVENTORY', 'Source inventory is bounded; absence from this window does not prove complete history.');
  }
  const viewer = buildNarrativeViewerContext({ role: ctx.role, campaignNow: { epochMinute: now, dateParts: { year: null, month: null, day: null } }, allowPlayerChronologyManagement: ctx.allowPlayerChronologyManagement });
  // Capability-based elevation is authoritative, including membership overrides.
  viewer.perspective = elevated ? 'elevated' : 'party';
  const [pagePresence, eventPresence, sessionPresence] = await Promise.all([
    buildPageDiscoveryMap(campaignId, pageRows.map(row => row.id)),
    getContentPresenceStateMap(campaignId, ContentPresenceEntityType.TIMELINE_EVENT, eventRows.map(row => row.id)),
    getContentPresenceStateMap(campaignId, ContentPresenceEntityType.SESSION_NOTE, points.map(row => row.id)),
  ]);
  const authorizedPages = pageRows.filter(row => canViewWikiPage(row.visibility, ctx.role) && chronologyCanView(ctx, row.visibility.toUpperCase())
    && projectWikiPageVisibility(row.id, pagePresence, viewer).visible);
  const pages = authorizedPages.slice(0, INVENTORY_LIMIT);
  const pageMap = new Map(pages.map(row => [row.id, row]));
  const pathMap = new Map(pages.map(row => [row.id, buildWikiPageHref(handle, row)]));
  const presence = new Map([...eventPresence, ...sessionPresence]);
  const authorizedEvents = eventRows.filter(row => chronologyCanView(ctx, row.visibility)
    && (elevated || isTimelineEventVisible(projectTimelineEventVisibility(row.id, row.visibility, eventPresence, viewer))));
  const visibleEvents = authorizedEvents.slice(0, INVENTORY_LIMIT);
  if (authorizedEvents.length > INVENTORY_LIMIT) warn('world_event', 'SOURCE_TRUNCATED', 'Authorized chronology inventory exceeded its source limit. Narrow the date window; recurrence expansion limits still apply.');
  if (authorizedPages.length > INVENTORY_LIMIT) warn('lore_reference', 'SOURCE_TRUNCATED', 'Authorized canonical page inventory exceeded its source limit; some source references and summaries are unavailable.');
  const enabled = (domain: ChronologyDomainKindValue) => options.domains === null || options.domains.includes(domain);
  const entries: ConvergenceTimelineEntry[] = [];
  const dateLabel = (minute: bigint) => {
    if (!master || minute < master.epochOffset) return 'Date unavailable';
    try { const state = convertEpochToCalendarState(minute, master); return `${state.monthName} ${state.day}, Year ${state.year}`; }
    catch { return 'Date unavailable'; }
  };
  const add = (anchor: CanonicalChronologyAnchor, feed: FeedEntryMetadata, links?: ConvergenceTimelineEntry['links']) => {
    if (!enabled(anchor.domain)) return;
    const entry = buildConvergenceEntry(anchor, viewer, { campaignHandle: handle, resolveWikiPagePath: id => pathMap.get(id) ?? null }, presence);
    // Sources have already passed their authoritative authorization checks.
    if (!entry.projection.visible) return;
    entry.feed = feed;
    if (anchor.instant.epochMinute !== null) {
      const delta = BigInt(anchor.instant.epochMinute) - (master?.epochOffset ?? 0n);
      feed.referenceDay = String(delta / 1440n - (delta < 0n && delta % 1440n !== 0n ? 1n : 0n));
    }
    entry.display.summary = feedExcerpt(entry.display.summary);
    entry.display.dateLabel = anchor.instant.epochMinute !== null ? dateLabel(BigInt(anchor.instant.epochMinute)) : feed.nativeDateLabel ?? null;
    if (links) entry.links = links;
    entries.push(entry);
  };
  const wikiLink = (id: string) => pathMap.has(id) ? [{ hrefKind: 'wiki_page', path: pathMap.get(id)! }] : [];
  const calendarMap = new Map(calendars.map(row => [row.id, row]));
  const validDateMinute = (calendar: typeof calendars[number], parts: { year: number | null; month: number | null; day: number | null }) => {
    if (parts.year === null || parts.month === null || parts.day === null || parts.year < 1) return null;
    const months = getMonthsForYear(parts.year, parseMonths(calendar.months), parseLeapRules(calendar.leapDays));
    if (parts.month < 0 || parts.month >= months.length || parts.day < 1 || parts.day > months[parts.month]!.length) return null;
    return calendarEpochMinuteForDate(calendar, parts.year, parts.month, parts.day);
  };

  // Chronology: one row per recurrence, shared generator, normalized native dates (never stale repeated epochs).
  const categories = await prisma.calendarEventCategory.findMany({ where: { campaignId, name: WORLD_ADVANCE_CATEGORY }, select: { id: true } });
  const batchCategoryIds = new Set(categories.map(row => row.id));
  for (const event of visibleEvents) {
    if (batchCategoryIds.has(event.categoryId ?? '')) continue; // The same artifact is represented by its distinct applied effects below.
    if (!enabled('world_event')) continue;
    const calendar = calendarMap.get(event.calendarId);
    if (!calendar) continue;
    const expanded = buildOccurrences([event], new Map([[calendar.id, calendar]]), null, eras, (momentum?.eraRecurrenceHistory ?? {}) as import('./eraOccurrenceHistory.js').EraHistory, true);
    for (const code of expanded.warnings) warn('world_event', code, 'Chronology recurrence expansion is limited or contains unsupported dates. Narrowing a window cannot recover occurrences beyond a recurrence cap.');
    if (!expanded.occurrences.length && !event.isRepeating) {
      add(anchorFromTimelineOccurrence({ ...event, occurrenceId: `occ_${event.id}_0_0`, baseEventId: event.id, prerequisiteBaseEventId: event.prerequisiteId, sourceType: 'STATIC', start: { year: event.targetYear, month: event.targetMonth, day: event.targetDay, epochMinute: null } }),
        { datePrecision: 'undated', importance: event.importance as FeedImportance, calendarId: calendar.id, calendarName: calendar.name }, pathMap.has(`event-${event.id}`) ? [{ hrefKind: 'event_lore', path: pathMap.get(`event-${event.id}`)! }] : []);
    }
    let timeOffset = 0n;
    for (const raw of expanded.occurrences) {
      const row = raw as unknown as { occurrenceId: string; occurrenceIndex: number; start: { year: number; month: number; day: number }; end: { year: number; month: number; day: number } };
      let minute: bigint | null = null, end: bigint | null = null;
      try { minute = validDateMinute(calendar, row.start); end = validDateMinute(calendar, row.end); } catch { /* Preserve native-only records below. */ }
      if (event.targetEpochMinute !== null && row.occurrenceIndex === 0 && minute !== null) timeOffset = event.targetEpochMinute - minute;
      if (minute !== null) minute += timeOffset;
      if (end !== null) end += timeOffset;
      const nativeAvailable = minute === null || minute >= calendar.epochOffset;
      const nativeDateLabel = nativeAvailable ? `${resolveMonthName(calendar, row.start.year, row.start.month)} ${row.start.day}, Year ${row.start.year}` : 'Native date unavailable';
      const links: ConvergenceTimelineEntry['links'] = [];
      if (pathMap.has(`event-${event.id}`)) links.push({ hrefKind: 'event_lore', path: pathMap.get(`event-${event.id}`)! });
      links.push({ hrefKind: 'chronology_events', path: asPublicPagePath(`/campaigns/${handle}/chronology?view=timeline&track=${encodeURIComponent(calendar.id)}`) });
      add(anchorFromTimelineOccurrence({ ...event, baseEventId: event.id, occurrenceId: row.occurrenceId, prerequisiteBaseEventId: event.prerequisiteId, sourceType: event.isRepeating ? 'REPEATING' : 'STATIC', start: { ...row.start, epochMinute: minute?.toString() ?? null } }),
        { datePrecision: minute === null ? 'unaligned' : event.targetEpochMinute === null ? 'day' : 'minute', importance: event.importance as FeedImportance,
          occurrenceId: row.occurrenceId, occurrenceIndex: row.occurrenceIndex, duration: event.duration, endEpochMinute: end?.toString(),
          calendarId: calendar.id, calendarName: calendar.name, nativeDateLabel, nativeStart: nativeAvailable ? row.start : undefined, nativeEnd: nativeAvailable ? row.end : undefined, provenance: [`timeline_event:${event.id}`] }, links);
    }
  }

  const authorizedPoints = points.slice(0, INVENTORY_LIMIT).filter(row => pageMap.has(row.wikiPageId));
  const pointMap = new Map(authorizedPoints.map(row => [row.id, row]));
  for (const entry of entries) {
    const point = pointMap.get(entry.source.entityId);
    if (entry.domain === 'world_event' && point) entry.sessionLink = { timelinePointId: point.id, sequenceOrder: point.sequenceOrder };
  }
  // Fetch only the authorized canonical anchors in the requested range, never per-author notes or transcripts.
  const summaryIds = authorizedPoints.filter(row => {
    const minute = parseSessionNoteMetadata(pageMap.get(row.wikiPageId)!.metadata).fantasyEpochMinute;
    return !minute || (/^-?\d+$/.test(minute) && BigInt(minute) >= BigInt(from) && BigInt(minute) < BigInt(to));
  }).slice(0, 200).map(row => row.wikiPageId);
  const summaries = summaryIds.length ? await prisma.wikiPage.findMany({ where: { campaignId, id: { in: summaryIds }, deletedAt: null }, select: { id: true, blocks: true } }) : [];
  const summaryMap = new Map(summaries.map(row => [row.id, sessionSummaryExcerpt(Array.isArray(row.blocks)
    ? row.blocks.filter(block => block && typeof block === 'object' && !Array.isArray(block)
      && canViewWikiPage(typeof block.visibility === 'string' ? block.visibility : pageMap.get(row.id)!.visibility, ctx.role)) : [])]));
  warn('session_chronicle', 'SUMMARY_LIMIT', 'Canonical session excerpts are bounded to 400 characters and 200 authorized anchors per request. Private notes and transcripts are excluded.');
  const sessionEpochs: { timelinePointId: string; sequenceOrder: number; epochMinute: string }[] = [];
  for (const point of authorizedPoints) {
    const page = pageMap.get(point.wikiPageId)!;
    const meta = parseSessionNoteMetadata(page.metadata);
    if (!meta.isSessionAnchor || meta.isSessionAuthor) continue;
    const minute = meta.fantasyEpochMinute && /^-?\d+$/.test(meta.fantasyEpochMinute) ? meta.fantasyEpochMinute : null;
    const summary = summaryMap.get(page.id) ?? null;
    // Empty scheduled placeholders are not evidence that a session occurred.
    if (!summary) continue;
    if (minute !== null && BigInt(minute) <= now) sessionEpochs.push({ timelinePointId: point.id, sequenceOrder: point.sequenceOrder, epochMinute: minute });
    add(anchorFromSessionTimelinePoint({ timelinePointId: point.id, wikiPageId: page.id, sequenceOrder: point.sequenceOrder, title: page.title, summary, fantasyEpochMinute: minute, plannedStartAt: null }),
      { datePrecision: minute === null ? 'undated' : 'minute', provenance: [`session_note:${page.id}`] }, [{ hrefKind: 'session_note', path: asPublicPagePath(`/campaigns/${handle}/notes/${point.id}`) }]);
  }

  for (const page of pages) {
    if (!enabled('org_relation') || !isOrganizationMetadataPresent(page.metadata)) continue;
    for (const relation of parseOrganizationMetadata(page.metadata).relations) {
      if (!pageMap.has(relation.targetOrgId)) continue;
      for (const record of relation.history) {
        if (!chronologyCanView(ctx, record.visibility.toUpperCase())) continue;
        const anchor = anchorFromOrgRelationEvent({ orgPageId: page.id, orgTitle: page.title, targetOrgId: relation.targetOrgId, relationId: relation.id, eventId: record.id,
          effectiveDate: record.effectiveDate, relationType: record.relationType, stance: record.stance, visibility: record.visibility, sourceEventIds: [], note: record.note ?? null });
        if (master) { try { anchor.instant.epochMinute = validDateMinute(master, record.effectiveDate)?.toString() ?? null; } catch { /* Undated, never editorial timestamps. */ } }
        const linkedPoint = (record.sourceEventIds ?? []).map(id => pointMap.get(id)).find(point => !!point);
        if (linkedPoint) anchor.sessionLink = { timelinePointId: linkedPoint.id, sequenceOrder: linkedPoint.sequenceOrder };
        add(anchor, { datePrecision: anchor.instant.epochMinute === null ? 'undated' : 'day', provenance: [`org_relation:${record.id}`] }, wikiLink(page.id));
      }
    }
  }

  // Applied effects are separate records; receipts establish application, never creation timestamps.
  const receipts = await prisma.worldAdvanceReceipt.findMany({ where: { campaignId, chronologyEventId: { in: visibleEvents.filter(row => batchCategoryIds.has(row.categoryId ?? '')).map(row => row.id) } }, select: { chronologyEventId: true, effectId: true } });
  const receiptIds = new Set(receipts.map(row => `${row.chronologyEventId}:${row.effectId}`));
  for (const event of visibleEvents.filter(row => batchCategoryIds.has(row.categoryId ?? ''))) {
    let batch; try { batch = parseWorldAdvanceBatchPayload(JSON.parse(event.description ?? '{}')); } catch { continue; }
    if (!batch) continue;
    for (const effect of batch.effects) {
      if (!receiptIds.has(`${event.id}:${effect.id}`)) continue;
      if ((effect.sourceEventIds ?? []).some(id => !authorizedEvents.some(row => row.id === id) && !pointMap.has(id))) continue;
      const payload = effect as unknown as Record<string, unknown>;
      const pageIds = Object.entries(payload).flatMap(([key, value]) => /(?:PageId|OrgId|PageIds|OrgIds)$/i.test(key) ? (Array.isArray(value) ? value : [value]).filter((id): id is string => typeof id === 'string') : []);
      if (pageIds.some(id => !pageMap.has(id)) || (!elevated && (effect.type === 'consequence_bridge' || effect.type === 'suggest_border_keyframe'))) continue;
      if (typeof payload.visibility === 'string' && !chronologyCanView(ctx, payload.visibility.toUpperCase())) continue;
      const anchor = anchorFromWorldAdvanceEffect({ chronologyEventId: event.id, batchId: batch.batchId, effectId: effect.id, effectType: effect.type, projectionDomain: effect.domain,
        summary: feedExcerpt(typeof payload.note === 'string' ? payload.note : null) ?? `${effect.domain}: ${effect.type.replaceAll('_', ' ')}`, targetEpochMinute: event.targetEpochMinute ?? batch.nextEpochMinute, synthesisHeadline: null });
      const links = [...new Set(pageIds)].flatMap(wikiLink);
      if (elevated) links.push({ hrefKind: 'world_advance_batch', path: asPublicPagePath(`/campaigns/${handle}/world-advance/batches/${event.id}`) });
      add(anchor, { datePrecision: 'minute', groupId: `batch:${batch.batchId}`, groupTitle: event.title, provenance: [`world_advance:${event.id}:${effect.id}`] }, links);
    }
  }

  // Keep canonical gap identities: hidden sessions must not be bridged into a newly invented period.
  const knownPages = new Map(pageRows.map(row => [row.id, row]));
  const allSessionEpochs = points.flatMap(point => {
    const meta = parseSessionNoteMetadata(knownPages.get(point.wikiPageId)?.metadata);
    return meta.fantasyEpochMinute && /^-?\d+$/.test(meta.fantasyEpochMinute) && BigInt(meta.fantasyEpochMinute) <= now
      ? [{ timelinePointId: point.id, sequenceOrder: point.sequenceOrder, epochMinute: meta.fantasyEpochMinute }] : [];
  });
  const authorizedSessionIds = new Set(sessionEpochs.map(row => row.timelinePointId));
  const gaps = deriveDowntimePeriodGapsFromSessionEpochs({ sessionEpochs: allSessionEpochs, fallbackStartEpochMinute: null, currentEpochMinute: String(now) })
    .filter(gap => (!gap.sessionBeforeId || authorizedSessionIds.has(gap.sessionBeforeId)) && (!gap.sessionAfterId || authorizedSessionIds.has(gap.sessionAfterId)));
  const projects = await prisma.downtimeProject.findMany({ where: { campaignId, wikiPageId: { in: [...pageMap.keys()] }, completedAtEpochMinute: { not: null }, status: { in: ['COMPLETED', 'FAILED'] } }, take: INVENTORY_LIMIT + 1 });
  warn('downtime_period', 'BOUNDED_INVENTORY', 'Downtime periods derive from authorized session dates; visible project outcomes are bounded. Simulation internals and private annotations are not included.');
  const gapOverlays = await loadDowntimeGapOverlays(campaignId);
  for (const gap of gaps) {
    const title = formatDowntimePeriodTitle({ ...gap, promotedLabel: gapOverlays[gap.gapId]?.promotedLabel });
    const matching = projects.slice(0, INVENTORY_LIMIT).filter(row => row.completedAtEpochMinute! > BigInt(gap.startEpochMinute) && row.completedAtEpochMinute! <= BigInt(gap.endEpochMinute));
    const anchor = anchorFromDowntimePeriod({ ...gap, title, summary: null, startDateParts: null, endDateParts: null, advanceRunCount: 0, projectCompletions: matching.filter(row => row.status === 'COMPLETED').length, projectFailures: matching.filter(row => row.status === 'FAILED').length, rollupHeadline: title });
    add(anchor, { datePrecision: 'minute', groupId: `gap:${gap.gapId}`, groupTitle: title, endEpochMinute: gap.endEpochMinute });
    for (const project of matching) {
      const page = pageMap.get(project.wikiPageId)!;
      const outcome = { ...anchor, id: `project-outcome:${project.id}`, sourceEntityId: page.id, instant: { epochMinute: String(project.completedAtEpochMinute), dateParts: null }, title: `${page.title} ${project.status === 'COMPLETED' ? 'completed' : 'failed'}` };
      add(outcome, { datePrecision: 'minute', groupId: `gap:${gap.gapId}`, groupTitle: title, provenance: [`downtime_project:${project.id}`] }, wikiLink(page.id));
    }
  }

  if (elevated) {
    const accepted = await prisma.campaignWorldEventSuggestion.findMany({ where: { campaignId, status: 'accepted' }, select: { id: true, acceptedCalendarEventId: true, developmentPayload: true, occurredAtEpochMinute: true }, take: INVENTORY_LIMIT + 1 });
    const artifactIds = accepted.flatMap(row => {
      const payload = row.developmentPayload as { acceptedArtifactId?: unknown } | null;
      const id = row.acceptedCalendarEventId ?? (typeof payload?.acceptedArtifactId === 'string' ? payload.acceptedArtifactId : null);
      return id ? [id] : [];
    });
    // Existence audit is independent of the requested date window; an older artifact is not an integration gap.
    const artifacts = await prisma.calendarEvent.findMany({ where: { calendar: { campaignId }, id: { in: artifactIds } }, select: { id: true } });
    const visibleIds = new Set(artifacts.map(row => row.id));
    let unsupported = false;
    for (const row of accepted) {
      const payload = row.developmentPayload as { acceptedArtifactId?: unknown } | null;
      const artifactId = row.acceptedCalendarEventId ?? (typeof payload?.acceptedArtifactId === 'string' ? payload.acceptedArtifactId : null);
      if (!artifactId || !visibleIds.has(artifactId)) { unsupported = true; continue; }
      for (const entry of entries.filter(entry => entry.source.entityId === artifactId)) {
        entry.feed!.originLabel = 'Progression';
        entry.feed!.provenance = [...(entry.feed!.provenance ?? []), `accepted_development:${row.id}`];
      }
    }
    if (unsupported) coverage.gaps.push('Some accepted progression outcomes lack a supported, authorized durable event projection. No history is inferred from suggestions or current artifact state.');
  }
  coverage.gaps.push('Accepted progression chronology artifacts are included once as world events. Non-event and plugin-specific artifact dating/visibility require source adapters.');
  const supportedSources: ChronologyDomainKindValue[] = ['world_event', 'session_chronicle', 'org_relation', 'world_advance', 'downtime_period'];
  for (const source of options.domains ?? []) if (!supportedSources.includes(source)) coverage.gaps.push(`The ${source} source has no supported historical feed collector.`);
  let filtered = filterFeedImportance(entries, options.importance).filter(entry => !options.sessionLinkedOnly || entry.sessionLink !== null)
    .filter(entry => matchesFeedWindow(entry, BigInt(from), BigInt(to), now, BigInt(defaultRange.to), options.includeFuture));
  filtered = orderFeedEntries(filtered, options.order);
  // Deduplicate only identical stable projection identities; presentation grouping does not remove records.
  filtered = [...new Map(filtered.map(entry => [entry.entryId, entry])).values()];
  const dated = filtered.filter(row => row.instant.epochMinute !== null);
  const undated = filtered.filter(row => row.instant.epochMinute === null && row.feed?.datePrecision !== 'unaligned');
  const unaligned = filtered.filter(row => row.feed?.datePrecision === 'unaligned');
  coverage.undated = { limit: UNDATED_LIMIT, capped: undated.length > UNDATED_LIMIT, returned: Math.min(undated.length, UNDATED_LIMIT) };
  coverage.unaligned = { limit: UNDATED_LIMIT, capped: unaligned.length > UNDATED_LIMIT, returned: Math.min(unaligned.length, UNDATED_LIMIT) };
  if (dated.length) coverage.availableRange = { from: orderFeedEntries(dated, 'asc')[0]!.instant.epochMinute, to: orderFeedEntries(dated, 'desc')[0]!.instant.epochMinute };
  return {
    bundleVersion: 'convergence-v1', evaluatedAt: new Date().toISOString(), projectionContextHash: `feed:${campaignId}:${now}:${ctx.role}`,
    campaignNowEpochMinute: String(now), viewerRole: ctx.role, window: coverage.requestedRange,
    domains: options.domains ?? supportedSources, sourcesIncluded: supportedSources.filter(enabled),
    entries: [...dated.slice(0, INVENTORY_LIMIT), ...unaligned.slice(0, UNDATED_LIMIT), ...undated.slice(0, UNDATED_LIMIT)],
    truncation: { capped: dated.length > INVENTORY_LIMIT, maxEntries: INVENTORY_LIMIT, totalCollected: dated.length }, feed: coverage,
  };
}
