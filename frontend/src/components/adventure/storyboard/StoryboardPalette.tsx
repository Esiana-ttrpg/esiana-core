import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useWiki } from '@/contexts/WikiContext';
import { IdentityPagePicker } from '@/components/campaign/IdentityPagePicker';
import type {
  StoryboardPaletteData,
  StoryboardPaletteEntry,
} from '@/lib/adventure';

export type { StoryboardPaletteData, StoryboardPaletteEntry };

type PaletteTab = 'scenes' | 'quests' | 'threads' | 'people' | 'places' | 'events' | 'wiki';

interface StoryboardPaletteProps {
  palette: StoryboardPaletteData;
  placedIds: Set<string>;
  readOnly?: boolean;
  onAdd: (entry: StoryboardPaletteEntry) => void;
}

const TAB_LABELS: Record<PaletteTab, string> = {
  scenes: 'Scenes',
  quests: 'Quests',
  threads: 'Threads',
  people: 'People',
  places: 'Places',
  events: 'Events',
  wiki: 'Wiki pin',
};

export function StoryboardPalette({
  palette,
  placedIds,
  readOnly = false,
  onAdd,
}: StoryboardPaletteProps) {
  const { flatPages } = useWiki();
  const [tab, setTab] = useState<PaletteTab>('scenes');
  const [wikiPinId, setWikiPinId] = useState<string | null>(null);

  const entries: StoryboardPaletteEntry[] = (() => {
    switch (tab) {
      case 'scenes':
        return palette.scenes;
      case 'quests':
        return palette.quests;
      case 'threads':
        return palette.threads;
      case 'people':
        return palette.characters;
      case 'places':
        return palette.locations;
      case 'events':
        return palette.events;
      default:
        return [];
    }
  })();

  function handleWikiPin(pageId: string | null) {
    setWikiPinId(pageId);
    if (!pageId || readOnly) return;
    const page = flatPages.find((p) => p.id === pageId);
    if (!page) return;
    onAdd({ id: page.id, title: page.title, entityType: 'wiki_page' });
    setWikiPinId(null);
  }

  return (
    <aside className="flex flex-col overflow-hidden rounded border border-border">
      <div className="flex flex-wrap gap-0.5 border-b border-border p-1">
        {(Object.keys(TAB_LABELS) as PaletteTab[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded px-2 py-1 text-[10px] ${
              tab === key
                ? 'bg-primary/15 font-medium text-primary'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {tab === 'wiki' ? (
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground">
              Pin any wiki page to the board (layout only).
            </p>
            <IdentityPagePicker
              flatPages={flatPages}
              value={wikiPinId}
              disabled={readOnly}
              placeholder="Search wiki pages…"
              onChange={handleWikiPin}
            />
          </div>
        ) : (
          <ul className="space-y-1">
            {entries.map((entry) => {
              const onBoard = placedIds.has(entry.id);
              return (
                <li key={entry.id} className="flex items-center gap-1">
                  <span className="min-w-0 flex-1 truncate text-xs">{entry.title}</span>
                  {!readOnly && !onBoard ? (
                    <button
                      type="button"
                      title="Add to board"
                      className="shrink-0 rounded p-0.5 text-primary hover:bg-primary/10"
                      onClick={() => onAdd(entry)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  ) : onBoard ? (
                    <span className="text-[9px] text-muted-foreground">on board</span>
                  ) : null}
                </li>
              );
            })}
            {entries.length === 0 ? (
              <li className="py-4 text-xs text-muted-foreground">No entities in this tab.</li>
            ) : null}
          </ul>
        )}
      </div>
    </aside>
  );
}
