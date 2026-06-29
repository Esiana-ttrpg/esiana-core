import { campaignNotePath } from '../notifications/deepLinks.js';
import { campaignWikiHref } from '../dashboardPaths.js';
import { NarrativeEventType } from '../narrativeEventService.js';

type CampaignMeta = {
  handle: string;
  name: string;
};

type NarrativeRow = {
  id: string;
  type: string;
  pageId: string | null;
  targetPageId: string | null;
  metadata: unknown;
  createdAt: Date;
  campaignId: string;
};

type ActivityRow = {
  id: string;
  actionType: string;
  entityType: string;
  entityId: string;
  entityName: string;
  parentContext: string | null;
  createdAt: Date;
  campaignId: string;
};

function readWordDelta(metadata: unknown): number | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined;
  const raw = (metadata as Record<string, unknown>).wordDelta;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
}

function pageTitleFromMap(
  pageId: string | null,
  titles: Map<string, string>,
): string {
  if (!pageId) return 'Untitled';
  return titles.get(pageId)?.trim() || 'Untitled';
}

export function narrativeEventToFeedLine(
  row: NarrativeRow,
  campaign: CampaignMeta,
  pageTitles: Map<string, string>,
): { line: string; href: string | null; wordDelta?: number } {
  const handle = campaign.handle;
  const name = pageTitleFromMap(row.pageId, pageTitles);

  switch (row.type) {
    case NarrativeEventType.PAGE_CREATED:
      return {
        line: `${name} was added to the codex`,
        href: row.pageId ? campaignWikiHref(handle, row.pageId) : null,
        wordDelta: readWordDelta(row.metadata),
      };
    case NarrativeEventType.PAGE_EDITED:
      return {
        line: `${name} was expanded`,
        href: row.pageId ? campaignWikiHref(handle, row.pageId) : null,
        wordDelta: readWordDelta(row.metadata),
      };
    case NarrativeEventType.LINK_CREATED: {
      const target = pageTitleFromMap(row.targetPageId, pageTitles);
      return {
        line: `${name} now connects to ${target}`,
        href: row.pageId ? campaignWikiHref(handle, row.pageId) : null,
      };
    }
    case NarrativeEventType.STUB_RESOLVED:
      return {
        line: `A reference on ${name} was resolved`,
        href: row.pageId ? campaignWikiHref(handle, row.pageId) : null,
      };
    default:
      return { line: 'Lore was updated', href: null };
  }
}

export function campaignActivityToFeedLine(
  row: ActivityRow,
  campaign: CampaignMeta,
): { line: string; href: string | null } {
  const handle = campaign.handle;
  const action = row.actionType.toUpperCase();
  const entityType = row.entityType.toUpperCase();
  const name = row.entityName?.trim() || 'Untitled';

  if (entityType === 'WRITING_SESSION') {
    let wordDelta = 0;
    if (row.parentContext) {
      try {
        const ctx = JSON.parse(row.parentContext) as { wordDelta?: number };
        wordDelta = typeof ctx.wordDelta === 'number' ? ctx.wordDelta : 0;
      } catch {
        /* ignore */
      }
    }
    const suffix = wordDelta > 0 ? ` (+${wordDelta} words)` : '';
    return {
      line: `A writing session on ${name}${suffix}`,
      href: campaignWikiHref(handle, row.entityId),
    };
  }

  if (entityType === 'CHARACTER') {
    const href = `/campaigns/${handle}/characters/${row.entityId}`;
    if (action === 'CREATE') return { line: `${name} joined the chronicle`, href };
    if (action === 'DELETE') return { line: `${name} left the chronicle`, href };
    return { line: `${name} was updated`, href };
  }

  if (entityType === 'SESSION' || entityType === 'SESSION_NOTE') {
    const href = campaignNotePath(handle, row.entityId);
    if (action === 'CREATE' || action === 'PUBLISH') {
      return { line: `${name} notes were published`, href };
    }
    if (action === 'DELETE') return { line: `${name} notes were removed`, href };
    return { line: `${name} notes were updated`, href };
  }

  if (entityType === 'TIME_TRACKING') {
    return {
      line: 'World time advanced',
      href: `/campaigns/${handle}/chronology?view=calendar`,
    };
  }

  if (entityType === 'CALENDAR' || entityType === 'CALENDAR_EVENT') {
    const href = `/campaigns/${handle}/chronology?view=events`;
    if (action === 'CREATE') return { line: `${name} was added to the calendar`, href };
    if (action === 'DELETE') return { line: `${name} was removed from the calendar`, href };
    return { line: `${name} was updated on the calendar`, href };
  }

  if (action === 'CREATE') return { line: `${name} was added`, href: null };
  if (action === 'DELETE') return { line: `${name} was removed`, href: null };
  return { line: `${name} was updated`, href: null };
}
