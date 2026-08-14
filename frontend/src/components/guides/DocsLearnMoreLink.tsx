import { ExternalLink } from 'lucide-react';
import { docsUrl, type DocsLinkKey } from '@/lib/docsLinks';

interface DocsLearnMoreLinkProps {
  doc: DocsLinkKey;
  label?: string;
  className?: string;
}

export function DocsLearnMoreLink({
  doc,
  label = 'Learn more in the docs',
  className = 'inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline',
}: DocsLearnMoreLinkProps) {
  return (
    <a
      href={docsUrl(doc)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {label}
      <ExternalLink className="size-3" aria-hidden />
    </a>
  );
}
