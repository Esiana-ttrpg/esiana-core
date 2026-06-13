import { truncationUserMessage } from '@shared/relationsRenderCaps';
import type { RelationsTruncation } from '@shared/relationsRenderCaps';

interface RelationsTruncationBannerProps {
  truncation: RelationsTruncation;
}

export function RelationsTruncationBanner({ truncation }: RelationsTruncationBannerProps) {
  const message = truncationUserMessage(truncation);
  if (!message) return null;
  return (
    <p className="text-xs text-muted" role="status">
      {message}
    </p>
  );
}
