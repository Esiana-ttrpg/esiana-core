import type { Editor } from '@tiptap/react';
import { useMemo } from 'react';

type TocHeading = { level: number; text: string };

interface WorkshopDocumentOutlineProps {
  editor: Editor | null;
  onSelectHeading?: (text: string) => void;
}

export function WorkshopDocumentOutline({ editor, onSelectHeading }: WorkshopDocumentOutlineProps) {
  const headings = useMemo(() => {
    if (!editor) return [] as TocHeading[];
    const result: TocHeading[] = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name !== 'heading') return;
      const level = node.attrs?.level ?? 1;
      const text = node.textContent?.trim() ?? '';
      if (!text || typeof level !== 'number') return;
      result.push({ level, text });
    });
    return result;
  }, [editor, editor?.state.doc]);

  if (headings.length < 2) {
    return (
      <p className="px-2 text-xs text-muted-foreground">Add headings to see an outline.</p>
    );
  }

  return (
    <nav className="space-y-0.5 px-1 text-xs" aria-label="Document outline">
      {headings.map((h) => (
        <button
          key={`${h.level}-${h.text}`}
          type="button"
          onClick={() => onSelectHeading?.(h.text)}
          className="block w-full truncate rounded px-2 py-1 text-left text-muted-foreground hover:bg-elevated/50 hover:text-foreground"
          style={{ paddingLeft: 8 + (h.level - 1) * 10 }}
        >
          {h.text}
        </button>
      ))}
    </nav>
  );
}
