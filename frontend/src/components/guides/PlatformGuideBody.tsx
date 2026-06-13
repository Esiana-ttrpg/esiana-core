import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

const guideMarkdownComponents: Components = {
  a: ({ href, children }) => {
    if (href?.startsWith('/')) {
      return (
        <Link to={href} className="text-primary hover:text-primary-hover">
          {children}
        </Link>
      );
    }
    return (
      <a href={href} className="text-primary hover:text-primary-hover" rel="noreferrer" target="_blank">
        {children}
      </a>
    );
  },
};

interface PlatformGuideBodyProps {
  content: string;
}

export function PlatformGuideBody({ content }: PlatformGuideBodyProps) {
  const trimmed = content.trim();
  if (!trimmed) {
    return <p className="text-sm italic text-muted">No content yet.</p>;
  }

  return (
    <div className="prose prose-invert prose-slate max-w-none prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground prose-code:text-primary/90">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={guideMarkdownComponents}>
        {trimmed}
      </ReactMarkdown>
    </div>
  );
}
