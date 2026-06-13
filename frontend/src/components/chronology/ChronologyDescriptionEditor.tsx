import { WikiTipTapEditor } from '@/components/wiki/WikiTipTapEditor';

interface ChronologyDescriptionEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  minHeight?: string;
}

/** Markdown-preserving description editor for chronology events (no plain textarea). */
export function ChronologyDescriptionEditor({
  content,
  onChange,
  minHeight = 'min-h-[120px]',
}: ChronologyDescriptionEditorProps) {
  return (
    <WikiTipTapEditor
      content={content}
      onChange={onChange}
      wikiTree={[]}
      minHeight={minHeight}
      placeholder="Event chronicle (Markdown)…"
    />
  );
}
