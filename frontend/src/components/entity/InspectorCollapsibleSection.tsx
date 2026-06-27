import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { loreSectionLabel } from '@/components/entity/lore/LoreKnowledgeUi';
import { LORE_SECTION_IDS } from '@/lib/inspectorSectionMode';

interface InspectorCollapsibleSectionProps {
  id: string;
  label: string;
  defaultExpanded: boolean;
  forceExpanded?: boolean;
  summary?: string | null;
  stickyHeader?: boolean;
  children: ReactNode;
}

export function InspectorCollapsibleSection({
  id,
  label,
  defaultExpanded,
  forceExpanded = false,
  summary,
  stickyHeader = false,
  children,
}: InspectorCollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded || forceExpanded);

  useEffect(() => {
    if (forceExpanded) setExpanded(true);
  }, [forceExpanded]);

  const isOpen = expanded || forceExpanded;
  const useLoreLabel = LORE_SECTION_IDS.has(id);
  const headerSticky = stickyHeader && isOpen;

  return (
    <section id={`inspector-section-${id}`} className="scroll-mt-2 border-b border-border/60 last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className={`flex w-full items-center gap-2 py-2.5 text-left ${
          headerSticky
            ? 'sticky top-0 z-10 border-b border-border/40 bg-background/90 backdrop-blur-sm'
            : ''
        }`}
        aria-expanded={isOpen}
        aria-controls={`inspector-section-body-${id}`}
      >
        <ChevronDown
          className={`size-3.5 shrink-0 text-muted transition-transform ${
            isOpen ? 'rotate-0' : '-rotate-90'
          }`}
        />
        <span
          className={
            useLoreLabel
              ? `${loreSectionLabel} normal-case tracking-[0.08em] text-foreground`
              : META_SECTION_LABEL_CLASS
          }
        >
          {label}
        </span>
        {!isOpen && summary ? (
          <span className="ml-auto truncate text-[10px] text-muted">{summary}</span>
        ) : null}
      </button>
      {isOpen ? (
        <div id={`inspector-section-body-${id}`} className="space-y-3 pb-4">
          {children}
        </div>
      ) : null}
    </section>
  );
}
