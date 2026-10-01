import type { GlobalSearchResult } from '@shared/globalSearch';
import { catalogLucideIcon } from '@/lib/tagIconCatalog';
import { highlightMatchSegments } from '@/lib/highlightMatch';

interface GlobalSearchResultRowProps {
  result: GlobalSearchResult;
  active: boolean;
  queryTokens: string[];
  /** Hide the type label (redundant inside a type/mentions section). */
  hideTypeLabel?: boolean;
  /** Free-text query used for the fuzzy “Similar to …” hint. */
  queryText?: string;
  onSelect: () => void;
  onHover: () => void;
}

function HighlightedText({
  text,
  tokens,
  className,
}: {
  text: string;
  tokens: string[];
  className?: string;
}) {
  const segments = highlightMatchSegments(text, tokens);
  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.type === 'mark' ? (
          <mark
            key={index}
            className="rounded-sm bg-primary/20 text-inherit"
          >
            {segment.value}
          </mark>
        ) : (
          <span key={index}>{segment.value}</span>
        ),
      )}
    </span>
  );
}

function isFuzzyMatch(matchedOn: GlobalSearchResult['matchedOn']): boolean {
  return matchedOn === 'title_fuzzy' || matchedOn === 'alias_fuzzy';
}

export function GlobalSearchResultRow({
  result,
  active,
  queryTokens,
  hideTypeLabel = false,
  queryText,
  onSelect,
  onHover,
}: GlobalSearchResultRowProps) {
  const FallbackIcon = catalogLucideIcon(result.fallbackIcon ?? 'file-text');
  const imageUrl = result.image?.thumbUrl ?? result.image?.url;
  const showFuzzyHint = isFuzzyMatch(result.matchedOn) && Boolean(queryText?.trim());

  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onMouseEnter={onHover}
      onClick={onSelect}
      className={`flex w-full items-stretch gap-3 border-b border-border/40 px-4 py-3 text-left transition-colors last:border-b-0 ${
        active ? 'bg-elevated' : 'hover:bg-elevated/70'
      }`}
    >
      <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-border/40 bg-canvas/60 sm:size-16">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted">
            <FallbackIcon className="size-7" strokeWidth={1.5} aria-hidden />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <HighlightedText
            text={result.title}
            tokens={queryTokens}
            className="truncate text-base font-medium text-foreground"
          />
          {!hideTypeLabel ? (
            <span className="shrink-0 text-[11px] uppercase tracking-wide text-muted">
              {result.type.label}
            </span>
          ) : null}
        </div>

        {result.subtitle ? (
          <p className="mt-0.5 truncate text-sm text-muted">{result.subtitle}</p>
        ) : null}

        {showFuzzyHint ? (
          <p className="mt-0.5 truncate text-sm text-muted">
            Similar to &ldquo;{queryText!.trim()}&rdquo;
          </p>
        ) : null}

        {result.excerpt ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted">
            <span className="text-foreground/70">{result.excerpt.field}: </span>
            <HighlightedText text={result.excerpt.text} tokens={queryTokens} />
          </p>
        ) : null}
      </div>
    </button>
  );
}
