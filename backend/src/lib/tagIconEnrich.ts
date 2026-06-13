import { formatTagsForApi, type WikiTagRecord } from './wikiTags.js';
import { enrichWikiTagsWithIconUrls } from './tagIconAssets.js';

export type WikiTagApiRecord = WikiTagRecord & {
  iconAssetUrl: string | null;
};

export async function formatTagsForApiEnriched(
  tags: Parameters<typeof formatTagsForApi>[0],
): Promise<WikiTagApiRecord[]> {
  const base = formatTagsForApi(tags);
  return enrichWikiTagsWithIconUrls(base);
}
