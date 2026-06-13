import { ScrollText } from 'lucide-react';
import { EntityLoreClaimsEditor } from '@/components/entity/lore/EntityLoreClaimsEditor';
import type { LorePageLookup } from '@/lib/resolveLoreSourceDisplay';

const LORE_SOURCES_TEMPLATE_TYPES = new Set([
  'CHARACTER',
  'LOCATION',
  'ORGANIZATION',
  'FAMILY',
  'BESTIARY',
  'QUEST',
  'OBJECT',
  'ANCESTRY',
]);

export function pageSupportsLoreSources(templateType: string): boolean {
  return LORE_SOURCES_TEMPLATE_TYPES.has(templateType.trim().toUpperCase());
}

type CodexLoreSourcesSectionProps = {
  campaignHandle: string;
  pageId: string;
  templateType: string;
  flatPages: LorePageLookup[];
  memberRole?: string;
  allowPlayerChronologyManagement?: boolean;
  railCompact?: boolean;
};

export function CodexLoreSourcesSection({
  campaignHandle,
  pageId,
  templateType,
  flatPages,
  memberRole,
  allowPlayerChronologyManagement = false,
  railCompact = false,
}: CodexLoreSourcesSectionProps) {
  if (!pageSupportsLoreSources(templateType)) return null;

  return (
    <section
      className={`rounded-lg border border-border bg-surface/40 space-y-2 ${
        railCompact ? 'p-2' : 'p-3'
      }`}
    >
      <h3 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <ScrollText className="size-3.5 text-primary" aria-hidden />
        Sources &amp; provenance
      </h3>
      <p className="text-[11px] leading-relaxed text-muted">
        Lore claims on this page. Use <span className="text-foreground">Circulate…</span> to
        record rumor propagation in chronology.
      </p>
      <EntityLoreClaimsEditor
        campaignHandle={campaignHandle}
        pageId={pageId}
        flatPages={flatPages}
        memberRole={memberRole}
        allowPlayerChronologyManagement={allowPlayerChronologyManagement}
      />
    </section>
  );
}
