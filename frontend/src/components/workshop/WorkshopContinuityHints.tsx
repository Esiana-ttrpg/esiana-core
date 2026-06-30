import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useMemo } from 'react';
import { useWiki } from '@/contexts/WikiContext';
import type { WorkshopDocument } from '@shared/workshopDocument';
import { countWikilinksInMarkdown } from '@/lib/workshopDrafts';

interface WorkshopContinuityHintsProps {
  draft: WorkshopDocument | null;
}

export function WorkshopContinuityHints({ draft }: WorkshopContinuityHintsProps) {
  const { flatPages } = useWiki();

  const hints = useMemo(() => {
    if (!draft) return [];
    const lines: string[] = [];
    const linkCount = countWikilinksInMarkdown(draft.bodyMarkdown);
    if (linkCount > 0) {
      lines.push(`${linkCount} linked reference${linkCount === 1 ? '' : 's'} in this draft`);
    }

    if (draft.anchorEntityIds?.length) {
      for (const anchorId of draft.anchorEntityIds.slice(0, 2)) {
        const page = flatPages.find((p) => p.id === anchorId);
        if (page) {
          lines.push(`Continuing from ${page.title}`);
        }
      }
    }

    return lines.slice(0, 3);
  }, [draft, flatPages]);

  if (hints.length === 0) return null;

  return (
    <section className="space-y-1.5">
      <h3 className="META_SECTION_LABEL_CLASS-foreground">
        Continuity
      </h3>
      <ul className="space-y-1 text-sm text-muted-foreground">
        {hints.map((hint) => (
          <li key={hint}>{hint}</li>
        ))}
      </ul>
    </section>
  );
}
