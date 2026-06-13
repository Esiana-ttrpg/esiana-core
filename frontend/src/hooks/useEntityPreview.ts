import { useMemo } from 'react';
import {
  buildEntityPreviewBase,
  buildEntityPreviewProjection,
  type EntityPreviewContext,
} from '@/lib/entityPreview';
import type { WikiPageLineageSnapshot } from '@/lib/entityProjectionQueries';
import { chronologyDateKey } from '@/hooks/useCampaignChronologyNow';

export function useEntityPreview(
  pageId: string,
  flatPages: readonly WikiPageLineageSnapshot[],
  context: EntityPreviewContext | null,
  enabled = true,
) {
  const flatPagesKey = useMemo(
    () => flatPages.map((p) => `${p.id}:${p.title}`).join('|'),
    [flatPages],
  );

  const base = useMemo(() => {
    if (!enabled || !pageId) return null;
    return buildEntityPreviewBase(pageId, flatPages, context ?? undefined);
  }, [enabled, pageId, flatPagesKey, flatPages, context]);

  const projection = useMemo(() => {
    if (!enabled || !pageId || !context) return null;
    return buildEntityPreviewProjection(pageId, flatPages, context);
  }, [
    enabled,
    pageId,
    flatPagesKey,
    flatPages,
    context?.isDMUser,
    context?.viewerOrgId,
    context?.viewerPageId,
    context?.viewerCharacterId,
    context ? chronologyDateKey(context.campaignNow) : '',
  ]);

  return { base, projection };
}
