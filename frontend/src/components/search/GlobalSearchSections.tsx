import type {
  GlobalSearchResult,
  GlobalSearchSection,
} from '@shared/globalSearch';
import { GlobalSearchResultRow } from './GlobalSearchResultRow';

interface GlobalSearchSectionsProps {
  sections: GlobalSearchSection[];
  results: GlobalSearchResult[];
  activeIndex: number;
  queryTokens: string[];
  queryText: string;
  onHover: (index: number) => void;
  onSelect: (index: number) => void;
  onShowAllType: (typeKey: string) => void;
}

function footerLabel(section: GlobalSearchSection): string | null {
  if (!section.typeKey) return null;
  const remaining = section.totalCount - section.resultIds.length;
  if (remaining <= 0) return null;
  if (section.kind === 'mentions') {
    return `Show all ${section.totalCount}${section.approximate ? '+' : ''}`;
  }
  return `Show all ${section.totalCount}${section.approximate ? '+' : ''} ${section.label}`;
}

export function GlobalSearchSections({
  sections,
  results,
  activeIndex,
  queryTokens,
  queryText,
  onHover,
  onSelect,
  onShowAllType,
}: GlobalSearchSectionsProps) {
  const indexById = new Map(results.map((r, i) => [r.id, i]));

  return (
    <>
      {sections.map((section) => {
        const footer = footerLabel(section);
        return (
          <div key={section.key} className="border-b border-border/30 last:border-b-0">
            <p className="px-4 pb-1 pt-3 text-xs text-muted">{section.label}</p>
            {section.resultIds.map((id) => {
              const index = indexById.get(id);
              if (index == null) return null;
              const result = results[index]!;
              const hideTypeLabel =
                section.kind === 'type' || section.kind === 'mentions';
              return (
                <GlobalSearchResultRow
                  key={id}
                  result={result}
                  active={index === activeIndex}
                  queryTokens={queryTokens}
                  queryText={queryText}
                  hideTypeLabel={hideTypeLabel}
                  onHover={() => onHover(index)}
                  onSelect={() => onSelect(index)}
                />
              );
            })}
            {footer && section.typeKey ? (
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-elevated/50"
                onClick={() => onShowAllType(section.typeKey!)}
              >
                {footer}
              </button>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
