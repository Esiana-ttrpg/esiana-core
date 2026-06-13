import type { ThreadStatus } from '@/lib/threadMetadata';
import { THREAD_STATUS_CLASS } from '@/lib/threadVisualTokens';

interface ThreadStatusBadgeProps {
  status: ThreadStatus;
  className?: string;
}

export function ThreadStatusBadge({ status, className = '' }: ThreadStatusBadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${THREAD_STATUS_CLASS[status]} ${className}`}
    >
      {status}
    </span>
  );
}
