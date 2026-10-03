import type { CSSProperties } from 'react';
import { META_FIELD_LABEL_CLASS } from '@/lib/surfaceLayout';
import {
  BookOpen,
  FileText,
  Map,
  MapPin,
  Package,
  PawPrint,
  ScrollText,
  Swords,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { HubRecentEditItem } from '@/types/hub';
import { HubSectionHeader } from '@/components/hub/HubSectionHeader';
import { formatRelativeUpdated } from '@/utils/formatDate';

interface HubRecentlyEditedProps {
  items: HubRecentEditItem[];
}

function iconForRecentEdit(item: HubRecentEditItem): { Icon: LucideIcon; tint: string } {
  const key = (item.templateType ?? item.entityType ?? '').toUpperCase();
  switch (key) {
    case 'CHARACTER':
    case 'CHARACTERS':
      return { Icon: Users, tint: 'var(--color-status-legend-fg)' };
    case 'ORGANIZATION':
    case 'ORGANIZATIONS':
      return { Icon: Swords, tint: 'var(--color-status-warning-fg)' };
    case 'LOCATION':
    case 'LOCATIONS':
      return { Icon: MapPin, tint: 'var(--color-status-neutral-fg)' };
    case 'EVENT':
    case 'EVENTS':
      return { Icon: ScrollText, tint: 'var(--hub-section-recent)' };
    case 'OBJECT':
    case 'OBJECTS':
      return { Icon: Package, tint: 'var(--color-status-muted-fg)' };
    case 'BESTIARY':
      return { Icon: PawPrint, tint: 'var(--color-status-secret-fg)' };
    case 'MAP':
    case 'MAPS':
      return { Icon: Map, tint: 'var(--hub-section-library)' };
    case 'SESSION':
      return { Icon: BookOpen, tint: 'var(--hub-section-resume)' };
    default:
      return { Icon: FileText, tint: 'var(--hub-section-recent)' };
  }
}

export function HubRecentlyEdited({ items }: HubRecentlyEditedProps) {
  if (items.length === 0) return null;

  return (
    <section className="hub-section-surface space-y-3">
      <HubSectionHeader title="Recently Edited" variant="recent" size="sm" />
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const { Icon, tint } = iconForRecentEdit(item);
          return (
            <li key={`${item.campaignId}-${item.entityId}`}>
              <Link
                to={item.href}
                className="hub-recent-row flex items-start gap-2.5 rounded-lg border px-3 py-2"
              >
                <span
                  className="hub-recent-icon-well mt-0.5"
                  style={{ '--hub-recent-icon-tint': tint } as CSSProperties}
                  aria-hidden
                >
                  <Icon className="size-3.5" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <p className={META_FIELD_LABEL_CLASS}>{item.campaignName}</p>
                  <p className="mt-0.5 line-clamp-1 text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted">
                    {formatRelativeUpdated(item.updatedAt)}
                  </p>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
