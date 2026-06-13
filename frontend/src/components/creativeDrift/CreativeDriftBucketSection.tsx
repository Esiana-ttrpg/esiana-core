import type { CreativeDriftBucketPayload } from '@shared/creativeDrift';
import type { CreativeDriftFinding } from '@shared/creativeDrift';
import { UNRESOLVED_EMPTY_COPY } from '@/lib/unresolvedCopy';
import { CreativeDriftItemRow } from './CreativeDriftItemRow';

interface CreativeDriftBucketSectionProps {
  campaignHandle: string;
  bucket: CreativeDriftBucketPayload;
  defaultOpen?: boolean;
  onUpdated: () => void;
  onAttachToThread: (entityPageId: string) => void;
}

export function CreativeDriftBucketSection({
  campaignHandle,
  bucket,
  defaultOpen = true,
  onUpdated,
  onAttachToThread,
}: CreativeDriftBucketSectionProps) {
  return (
    <section className="space-y-2">
      <details open={defaultOpen} className="group">
        <summary className="cursor-pointer list-none">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-muted">
              {bucket.label}
            </h2>
            <span className="text-xs text-muted">{bucket.items.length}</span>
          </div>
        </summary>
        {bucket.items.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            {UNRESOLVED_EMPTY_COPY[bucket.bucket] ?? 'Nothing here right now.'}
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {bucket.items.map((item: CreativeDriftFinding) => (
              <CreativeDriftItemRow
                key={item.fingerprint}
                campaignHandle={campaignHandle}
                finding={item}
                onUpdated={onUpdated}
                onAttachToThread={onAttachToThread}
              />
            ))}
          </ul>
        )}
      </details>
    </section>
  );
}
