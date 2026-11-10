import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';
import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import type { SlashSuggestionState } from './extensions/slashSuggestionPlugin';
import { filterWikiEditorCommands, type WikiEditorCommand } from './wikiEditorCommands';

interface WikiSlashSuggestionPopoverProps {
  editor: Editor;
  portalContainer?: Element;
  state: SlashSuggestionState;
  onSource: () => void;
  onClose: () => void;
}
export function WikiSlashSuggestionPopover({ editor, state, portalContainer, onSource, onClose }: WikiSlashSuggestionPopoverProps) {
  const commands = useMemo(() => filterWikiEditorCommands(state.query), [state.query]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => setSelectedIndex(0), [state.query]);

  const run = (command: WikiEditorCommand) => {
    command.run(editor, { from: state.from, to: state.to }, { openSourcePicker: onSource });
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowDown' && commands.length) {
        event.preventDefault();
        setSelectedIndex((index) => (index + 1) % commands.length);
      } else if (event.key === 'ArrowUp' && commands.length) {
        event.preventDefault();
        setSelectedIndex((index) => (index - 1 + commands.length) % commands.length);
      } else if (event.key === 'Enter' && commands[selectedIndex]) {
        event.preventDefault();
        run(commands[selectedIndex]);
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [commands, selectedIndex, onClose]);

  const grouped = useMemo(() => {
    const groups = new Map<string, WikiEditorCommand[]>();
    commands.forEach((command) => groups.set(command.category, [...(groups.get(command.category) ?? []), command]));
    return [...groups.entries()];
  }, [commands]);

  let absoluteIndex = -1;
  return createPortal(
    <div
      className="fixed z-[200] w-[min(22rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-border bg-background shadow-xl"
      style={{ top: state.top, left: Math.min(state.left, Math.max(8, window.innerWidth - 360)) }}
      role="listbox"
      aria-label="Insert command"
    >
      <div className="border-b border-border px-3 py-2">
        <div className={META_SECTION_LABEL_CLASS}>Insert</div>
        <div className="mt-0.5 text-xs text-muted">{state.query ? `Searching for “${state.query}”` : 'Type to search commands'}</div>
      </div>
      <div className="max-h-72 overflow-y-auto py-1">
        {grouped.length ? grouped.map(([category, items]) => (
          <div key={category}>
            <div className={`px-3 pb-1 pt-2 text-muted/80 ${META_SECTION_LABEL_CLASS}`}>{category}</div>
            {items.map((command) => {
              absoluteIndex += 1;
              const index = absoluteIndex;
              const selected = index === selectedIndex;
              return (
                <button
                  key={command.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`w-full px-3 py-2 text-left ${selected ? 'bg-primary/10' : 'hover:bg-muted/20'}`}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onMouseDown={(event) => { event.preventDefault(); run(command); }}
                >
                  <span className="block text-sm font-medium text-foreground">{command.label}</span>
                  <span className="block text-xs text-muted">{command.description}</span>
                </button>
              );
            })}
          </div>
        )) : <div className="px-3 py-6 text-center text-sm text-muted">No commands match that search.</div>}
      </div>
    </div>,
    portalContainer ?? document.body,
  );
}
