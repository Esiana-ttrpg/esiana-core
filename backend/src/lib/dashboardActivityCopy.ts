import { campaignNotePath } from './notifications/deepLinks.js';
import { campaignWikiHref } from './dashboardPaths.js';
import type { WikiPageHrefSource } from './wikiLinkService.js';

export type BulletinActivityItem = {
  id: string;
  line: string;
  href: string | null;
  createdAt: string;
};

type ActivityRow = {
  id: string;
  actionType: string;
  entityType: string;
  entityId: string;
  entityName: string;
  parentContext: string | null;
  createdAt: Date;
};

export function mapCampaignActivityToBulletinItem(
  row: ActivityRow,
  campaignHandle: string,
  wikiPage?: WikiPageHrefSource | null,
): BulletinActivityItem {
  const action = row.actionType.toUpperCase();
  const entityType = row.entityType.toUpperCase();
  const name = row.entityName?.trim() || 'Untitled';

  let line: string;
  let href: string | null = null;

  if (entityType === 'WIKI_PAGE') {
    href = wikiPage
      ? campaignWikiHref(campaignHandle, wikiPage)
      : campaignWikiHref(campaignHandle, row.entityId);
    if (row.parentContext === 'Characters') {
      if (action === 'CREATE') line = `${name} was added to the party`;
      else if (action === 'DELETE') line = `${name} was removed from records`;
      else line = `${name} was expanded`;
    } else if (action === 'CREATE') line = `${name} was added to the codex`;
    else if (action === 'DELETE') line = `${name} was removed from the codex`;
    else line = `${name} was expanded`;
  } else if (entityType === 'CHARACTER') {
    href = `/campaigns/${campaignHandle}/characters/${row.entityId}`;
    if (action === 'CREATE') line = `${name} joined the chronicle`;
    else if (action === 'DELETE') line = `${name} left the chronicle`;
    else line = `${name} was updated`;
  } else if (entityType === 'SESSION' || entityType === 'SESSION_NOTE') {
    href = campaignNotePath(campaignHandle, row.entityId);
    if (action === 'CREATE' || action === 'PUBLISH') {
      line = `${name} notes were published`;
    } else if (action === 'DELETE') {
      line = `${name} notes were removed`;
    } else {
      line = `${name} notes were updated`;
    }
  } else if (entityType === 'TIME_TRACKING') {
    href = `/campaigns/${campaignHandle}/chronology?view=calendar`;
    line = 'World time advanced';
  } else if (entityType === 'CALENDAR' || entityType === 'CALENDAR_EVENT') {
    href = `/campaigns/${campaignHandle}/chronology?view=events`;
    if (action === 'CREATE') line = `${name} was added to the calendar`;
    else if (action === 'DELETE') line = `${name} was removed from the calendar`;
    else line = `${name} was updated on the calendar`;
  } else {
    line =
      action === 'CREATE'
        ? `${name} was added`
        : action === 'DELETE'
          ? `${name} was removed`
          : `${name} was updated`;
  }

  return {
    id: row.id,
    line,
    href,
    createdAt: row.createdAt.toISOString(),
  };
}
