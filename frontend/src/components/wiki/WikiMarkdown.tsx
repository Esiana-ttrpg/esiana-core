import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface WikiMarkdownProps {
  content: string;
  emptyLabel?: string;
}

export function WikiMarkdown({
  content,
  emptyLabel = 'No content yet.',
}: WikiMarkdownProps) {
  const trimmed = content?.trim() ?? '';

  if (!trimmed) {
    return (
      <p className="text-sm italic text-muted">{emptyLabel}</p>
    );
  }

  return (
    <div className="prose prose-invert prose-slate max-w-none prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground prose-code:text-primary/90">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{trimmed}</ReactMarkdown>
    </div>
  );
}
