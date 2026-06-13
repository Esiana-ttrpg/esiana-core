import type { LucideIcon } from 'lucide-react';
import type { CampaignSummary } from '@/types/campaign';
import type { NotificationRecord } from '@/types/notifications';
import { CampaignCard } from './CampaignCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { getCampaignPriorityReason } from '@/lib/hubPrioritization';

interface CampaignSectionProps {
  title: string;
  icon: LucideIcon;
  campaigns: CampaignSummary[];
  emptyTitle: string;
  emptyDescription?: string;
  subtitle?: string;
  getBadge?: (campaign: CampaignSummary) => string | undefined;
  notifications?: NotificationRecord[];
}

export function CampaignSection({
  title,
  icon: Icon,
  campaigns,
  emptyTitle,
  emptyDescription,
  subtitle,
  getBadge,
  notifications = [],
}: CampaignSectionProps) {
  const list = campaigns ?? [];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Icon className="size-5 text-primary" strokeWidth={1.5} />
          {title}
          <span className="text-sm font-normal text-muted">({list.length})</span>
        </h2>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {list.length === 0 ? (
        <EmptyState
          icon={Icon}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              badge={getBadge?.(campaign)}
              priorityReason={getCampaignPriorityReason(campaign, notifications)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
