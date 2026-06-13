/** URL helpers for handle-based campaign routes (`/campaigns/:campaignHandle/...`). */

import {
  campaignFreeformPagePath,
  campaignPath as sharedCampaignPath,
  campaignWorkspaceEntityPath,
  campaignWorkspaceIndexPath,
  resolveCanonicalPagePath,
  workspaceToSegment,
} from '@shared/campaignWorkspaceRoutes';
import type { WikiPageWorkspaceInput } from '@shared/wikiWorkspaceResolve';
import { asPublicPagePath, type PublicPagePath } from '@shared/publicPagePath';

export type { PublicPagePath };
export { asPublicPagePath };
export {
  campaignWorkspaceEntityPath,
  campaignWorkspaceIndexPath,
  campaignFreeformPagePath,
  resolveCanonicalPagePath,
  workspaceToSegment,
};

export function readCampaignHandle(params: {
  campaignHandle?: string;
}): string {
  return params.campaignHandle ?? '';
}

export function campaignPath(handle: string, ...segments: string[]): string {
  return sharedCampaignPath(handle, ...segments);
}

export function campaignApiPath(handle: string, ...segments: string[]): string {
  const suffix = segments.filter(Boolean).join('/');
  return suffix ? `/campaigns/${handle}/${suffix}` : `/campaigns/${handle}`;
}

export function campaignDashboardPath(handle: string): string {
  return campaignPath(handle, 'dashboard');
}

export function campaignDefaultEntryPath(handle: string): string {
  return campaignDashboardPath(handle);
}

export function campaignPartyPath(handle: string): string {
  return campaignPath(handle, 'party');
}

export function campaignChronologyPath(
  handle: string,
  view?: 'calendar' | 'timeline' | 'events' | 'feed',
): string {
  const base = campaignPath(handle, 'chronology');
  return view ? `${base}?view=${view}` : base;
}

export function campaignNotesPath(handle: string): string {
  return campaignPath(handle, 'notes');
}

export function campaignNotePath(handle: string, timelinePointId: string): string {
  return campaignPath(handle, 'notes', timelinePointId);
}

export function campaignNoteAllViewPath(
  handle: string,
  timelinePointId: string,
): string {
  return campaignPath(handle, 'notes', timelinePointId, 'all');
}

type CategoryPathPage = WikiPageWorkspaceInput & {
  id: string;
  workspace?: string | null;
  pathKey?: string | null;
};

/** Adventure workspace hub (`?section=` / `?view=` query shell). */
export function campaignAdventureHubPath(handle: string): string {
  return campaignWorkspaceIndexPath(handle, 'adventures');
}

/** Downtime workspace hub. */
export function campaignDowntimeHubPath(handle: string): string {
  return campaignWorkspaceIndexPath(handle, 'downtime');
}

/**
 * Resolve a wiki page public path. Prefer `campaignCategoryChildPath` at call sites.
 * Without flatPages, never emits legacy `/wiki/:id` (returns campaign home).
 */
export function campaignWikiPath(
  handle: string,
  pageId?: string,
  flatPages: readonly CategoryPathPage[] = [],
): PublicPagePath {
  if (!pageId) {
    return asPublicPagePath(campaignPagesIndexPath(handle));
  }
  if (flatPages.length > 0) {
    return campaignCategoryChildPath(handle, pageId, undefined, flatPages);
  }
  return asPublicPagePath(campaignPath(handle, pageId));
}

export function campaignWikiMaintenancePath(handle: string): string {
  return campaignPath(handle, 'wiki', 'maintenance');
}

export function campaignPagesIndexPath(handle: string): string {
  return campaignPath(handle, 'pages');
}

export function campaignCreativeDriftPath(handle: string): string {
  return campaignPath(handle, 'narrative', 'unresolved');
}

export function campaignProgressionPath(
  handle: string,
  section?: import('@shared/progressionHub').ProgressionSectionId,
): string {
  const base = campaignPath(handle, 'progression');
  if (!section) return base;
  const params = new URLSearchParams({ section });
  return `${base}?${params.toString()}`;
}

export function campaignWikiTagsPath(
  handle: string,
  _tagsPageId?: string,
  tagId?: string,
): string {
  const base = campaignWorkspaceIndexPath(handle, 'tags');
  if (!tagId) return base;
  const params = new URLSearchParams({ tagId });
  return `${base}?${params.toString()}`;
}

export function campaignEventLorePath(
  handle: string,
  baseEventId: string,
  options?: { create?: boolean; prefillTitle?: string },
): string {
  const base = campaignPath(handle, `event-${baseEventId}`);
  if (!options?.create) return base;
  const params = new URLSearchParams({ create: 'true' });
  if (options.prefillTitle?.trim()) {
    params.set('prefillTitle', options.prefillTitle.trim());
  }
  return `${base}?${params.toString()}`;
}

export function campaignCharacterPath(
  handle: string,
  characterPageId: string,
  flatPages: readonly CategoryPathPage[] = [],
): string {
  return campaignCategoryChildPath(handle, characterPageId, 'Characters', flatPages);
}

/** Resolve public path for a wiki page using workspace + pathKey. */
export function campaignCategoryChildPath(
  handle: string,
  pageId: string,
  _categoryTitle?: string,
  flatPages: readonly CategoryPathPage[] = [],
): PublicPagePath {
  const page = flatPages.find((entry) => entry.id === pageId);
  if (page) {
    return resolveCanonicalPagePath(handle, page, flatPages);
  }
  return asPublicPagePath(campaignPath(handle, pageId));
}

export type CampaignSettingsTab =
  | 'general'
  | 'access'
  | 'recruitment'
  | 'scheduling'
  | 'world-development'
  | 'appearance'
  | 'integrations'
  | 'advanced';

export function campaignSettingsPath(
  handle: string,
  tab?: CampaignSettingsTab,
): string {
  const base = campaignPath(handle, 'settings');
  return tab ? `${base}?tab=${tab}` : base;
}

export function campaignTransferOwnershipPath(handle: string): string {
  return campaignPath(handle, 'transfer-ownership');
}

export function campaignTimeTrackingPath(handle: string): string {
  return campaignPath(handle, 'time-tracking');
}

export function campaignWorldAdvancePath(handle: string): string {
  return campaignPath(handle, 'world-advance');
}

export function campaignWorldAdvanceBatchPath(handle: string, chronologyEventId: string): string {
  return campaignPath(handle, `world-advance/batches/${chronologyEventId}`);
}

export function campaignVisualAtlasPath(handle: string): string {
  return campaignPath(handle, 'visual-atlas');
}

export type RelationsPathParams = {
  lens?: 'social' | 'structure' | 'kinship' | 'blocs';
  mode?: string;
  level?: 'summary' | 'cluster' | 'entity';
  focus?: string;
  at?: string;
};

export function campaignRelationsPath(handle: string, params?: RelationsPathParams): string {
  const base = campaignPath(handle, 'relations');
  if (!params) return base;
  const search = new URLSearchParams();
  if (params.lens) search.set('lens', params.lens);
  if (params.mode) search.set('mode', params.mode);
  if (params.level) search.set('level', params.level);
  if (params.focus) search.set('focus', params.focus);
  if (params.at) search.set('at', params.at);
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}

export function campaignRecentChangesPath(handle: string): string {
  return campaignPath(handle, 'recent-changes');
}

export function resolveCampaignLinkHandle(campaign: {
  handle?: string | null;
  id: string;
}): string {
  return campaign.handle?.trim() || campaign.id;
}

export function campaignWorkspaceApiPath(
  handle: string,
  segment: string,
  pathKey: string,
): string {
  return campaignApiPath(handle, 'workspace', segment, pathKey);
}
