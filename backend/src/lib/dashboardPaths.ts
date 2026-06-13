import { buildWikiPageHref, type WikiPageHrefSource } from './wikiLinkService.js';
import type { PublicPagePath } from '../../../shared/publicPagePath.js';

/** Resolve a wiki page public path for dashboard widgets and activity feeds. */
export function campaignWikiHref(
  campaignHandle: string,
  source: string | WikiPageHrefSource,
  legacyTemplateType?: string,
): PublicPagePath {
  return buildWikiPageHref(campaignHandle, source, legacyTemplateType);
}
