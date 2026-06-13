import { campaignWikiPath } from '@/lib/campaignPaths';
import { formatWikiTemplateType } from '@/lib/formatWikiTemplateType';
import { SOURCE_TYPE_OPTIONS } from '@/components/entity/lore/LoreKnowledgeUi';
import type { CalendarEventRecord } from '@/lib/calendarEventsApi';
import type { LoreClaimSourceRecord } from '@/lib/loreKnowledgeProjection';
export type LorePageLookup = {
  id: string;
  title: string;
  templateType: string;
};

export type ResolvedLoreSourceDisplay = {
  primaryTitle: string;
  secondaryLine: string | null;
  href: string | null;
};

function sourceTypeLabel(sourceType: LoreClaimSourceRecord['sourceType']): string {
  return SOURCE_TYPE_OPTIONS.find((o) => o.value === sourceType)?.label ?? 'Source';
}

export function resolveLoreSourceDisplay(
  source: LoreClaimSourceRecord,
  flatPages: LorePageLookup[],
  events: CalendarEventRecord[],
  campaignHandle: string,
): ResolvedLoreSourceDisplay {
  const typeLabel = sourceTypeLabel(source.sourceType);

  if (source.sourceEntityType === 'WIKI_PAGE' && source.sourceEntityId) {
    const page = flatPages.find((p) => p.id === source.sourceEntityId);
    const title = page?.title ?? source.label ?? 'Wiki page';
    const templateLabel = page ? formatWikiTemplateType(page.templateType) : 'Wiki page';
    return {
      primaryTitle: title,
      secondaryLine: `${typeLabel} · ${templateLabel}`,
      href: campaignWikiPath(
        campaignHandle,
        source.sourceEntityId,
        flatPages as unknown as Parameters<typeof campaignWikiPath>[2],
      ),
    };
  }

  if (source.sourceEntityType === 'CALENDAR_EVENT' && source.sourceEntityId) {
    const event = events.find((e) => e.id === source.sourceEntityId);
    const title = event?.title ?? source.label ?? 'Historical event';
    return {
      primaryTitle: title,
      secondaryLine: `${typeLabel} · Historical event`,
      href: null,
    };
  }

  const freeform = source.label?.trim() || source.note?.trim() || 'Unnamed source';
  return {
    primaryTitle: freeform,
    secondaryLine: typeLabel !== 'Other' ? `${typeLabel} · Freeform testimony` : 'Freeform testimony',
    href: null,
  };
}
