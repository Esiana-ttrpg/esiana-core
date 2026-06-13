import { useEffect, useState } from 'react';
import type { InspectorSectionDef } from '@/lib/entityInspectorSections';

interface InspectorSectionNavProps {
  sections: InspectorSectionDef[];
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  onNavigate: (sectionId: string) => void;
}

export function InspectorSectionNav({
  sections,
  scrollContainerRef,
  onNavigate,
}: InspectorSectionNavProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');

  useEffect(() => {
    const root = scrollContainerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) {
          const sectionId = visible[0].target.id.replace('inspector-section-', '');
          setActiveId(sectionId);
        }
      },
      { root, rootMargin: '-20% 0px -60% 0px', threshold: 0 },
    );

    for (const section of sections) {
      const el = root.querySelector(`#inspector-section-${section.id}`);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sections, scrollContainerRef]);

  return (
    <nav
      className="flex shrink-0 flex-col gap-0.5 border-r border-border/60 py-3 pr-2"
      aria-label="Inspector sections"
    >
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => onNavigate(section.id)}
          className={`rounded px-2 py-1.5 text-left text-[10px] font-medium transition-colors ${
            activeId === section.id
              ? 'bg-primary/15 text-primary'
              : 'text-muted hover:bg-surface hover:text-foreground'
          }`}
        >
          {section.label}
        </button>
      ))}
    </nav>
  );
}
