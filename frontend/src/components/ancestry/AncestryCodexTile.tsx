import { useMemo } from 'react';
import { Users } from 'lucide-react';
import {
  ANCESTRY_ENTITY_KIND_LABELS,
  parseAncestryMetadata,
} from '@/lib/ancestryMetadata';
import {
  buildAncestryPresenceProjection,
  formatPresenceExcerpt,
} from '@/lib/ancestryPresenceProjection';
import type { CategoryIndexChild } from '@/lib/wiki';
import type { WikiTreeNode } from '@/types/wiki';

interface AncestryCodexTileProps {
  child: CategoryIndexChild;
  flatPages: WikiTreeNode[];
  pageById: Map<string, WikiTreeNode>;
  selected: boolean;
  nested?: boolean;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
}

export function AncestryCodexTile({
  child,
  flatPages,
  pageById,
  selected,
  nested = false,
  onSelect,
  onOpen,
}: AncestryCodexTileProps) {
  const model = useMemo(() => {
    const ancestry = parseAncestryMetadata(child.metadata);
    const presence = buildAncestryPresenceProjection(child.id, flatPages);
    const presenceExcerpt = formatPresenceExcerpt(presence);
    const parentTitle =
      ancestry.entityKind === 'lineage' && ancestry.parentAncestryId
        ? (pageById.get(ancestry.parentAncestryId)?.title ?? null)
        : null;

    return {
      displayName: child.title,
      identitySummary: ancestry.identitySummary,
      presenceExcerpt,
      parentTitle,
      kindLabel:
        ancestry.entityKind !== 'root'
          ? ANCESTRY_ENTITY_KIND_LABELS[ancestry.entityKind]
          : null,
      portraitUrl: ancestry.appearance.portraitUrl,
    };
  }, [child, flatPages, pageById]);

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={() => onSelect(child.id)}
      onDoubleClick={() => onOpen(child.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onOpen(child.id);
        }
      }}
      className={[
        'creature-codex-tile',
        selected ? 'creature-codex-tile--selected' : '',
        nested ? 'ml-6 border-l-2 border-primary/20 pl-3' : '',
        'group text-left transition-transform hover:scale-[1.02]',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="creature-codex-tile__portrait max-h-36">
        {model.portraitUrl ? (
          <img
            src={model.portraitUrl}
            alt=""
            className="size-full max-h-36 object-cover object-top transition-[filter] group-hover:brightness-110"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-surface/50 text-muted">
            <Users className="size-12" strokeWidth={1.25} />
          </div>
        )}
      </div>

      <div className="creature-codex-tile__body">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="font-semibold leading-snug text-focal-foreground group-hover:text-primary">
            {model.displayName}
          </h3>
          {model.kindLabel ? (
            <span className="rounded-full border border-border bg-elevated/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
              {model.kindLabel}
            </span>
          ) : null}
        </div>

        {model.parentTitle ? (
          <p className="mt-0.5 text-xs text-primary/80">
            Lineage of {model.parentTitle}
          </p>
        ) : null}

        {model.identitySummary ? (
          <p className="mt-1 line-clamp-2 text-sm text-focal-muted">
            {model.identitySummary}
          </p>
        ) : null}

        {model.presenceExcerpt ? (
          <p className="mt-1 text-xs text-muted">{model.presenceExcerpt}</p>
        ) : null}
      </div>
    </button>
  );
}
