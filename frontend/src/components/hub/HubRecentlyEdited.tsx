import { META_FIELD_LABEL_CLASS } from '@/lib/surfaceLayout';
import { Link } from 'react-router-dom';
import type { HubRecentEditItem } from '@/types/hub';
import { HubSectionHeader } from '@/components/hub/HubSectionHeader';
import { formatRelativeUpdated } from '@/utils/formatDate';

interface HubRecentlyEditedProps {
  items: HubRecentEditItem[];
}

export function HubRecentlyEdited({ items }: HubRecentlyEditedProps) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <HubSectionHeader title="Recently Edited" variant="recent" size="sm" />
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <li key={`${item.campaignId}-${item.entityId}`}>
            <Link
              to={item.href}
              className="hub-recent-row block rounded-lg border px-3 py-2"
            >
              <p className={META_FIELD_LABEL_CLASS}>
                {item.campaignName}
              </p>
              <p className="mt-0.5 line-clamp-1 text-sm font-medium text-foreground">
                {item.title}
              </p>
              <p className="mt-0.5 text-[10px] text-muted">
                {formatRelativeUpdated(item.updatedAt)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
