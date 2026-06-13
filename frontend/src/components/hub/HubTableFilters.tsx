import { useMemo } from 'react';
import type { HubTableFilter } from '@/types/hub';
import { CampaignMemberRoles } from '@/types/domain';
import type { CampaignSummary } from '@/types/campaign';
import {
  CampaignDiscoverability,
  normalizeDiscoverability,
} from '@shared/campaignPolicy/discoverability';

const FILTERS: Array<{ id: HubTableFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'managing', label: 'Managing' },
  { id: 'joined', label: 'Joined' },
  { id: 'public', label: 'Public' },
];

interface HubTableFiltersProps {
  value: HubTableFilter;
  onChange: (filter: HubTableFilter) => void;
  counts: Record<HubTableFilter, number>;
}

export function HubTableFilters({ value, onChange, counts }: HubTableFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter campaigns">
      {FILTERS.map((filter) => {
        const active = value === filter.id;
        const count = counts[filter.id] ?? 0;
        return (
          <button
            key={filter.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(filter.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              active
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border bg-surface text-muted hover:border-primary/30 hover:text-foreground'
            }`}
          >
            {filter.label}
            <span className="ml-1.5 text-[10px] opacity-80">({count})</span>
          </button>
        );
      })}
    </div>
  );
}

function isManagerRole(role: string | null | undefined): boolean {
  return role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER;
}

function isJoinedRole(role: string | null | undefined): boolean {
  return (
    role === CampaignMemberRoles.PARTICIPANT ||
    role === CampaignMemberRoles.PARTICIPANT ||
    role === CampaignMemberRoles.OBSERVER
  );
}

export function filterCampaignsByHubTab(
  campaigns: CampaignSummary[],
  filter: HubTableFilter,
): CampaignSummary[] {
  if (filter === 'all') return campaigns;
  if (filter === 'managing') {
    return campaigns.filter((c) => c.isMember && isManagerRole(c.role));
  }
  if (filter === 'joined') {
    return campaigns.filter((c) => c.isMember && isJoinedRole(c.role));
  }
  return campaigns.filter(
    (c) =>
      !c.isMember &&
      normalizeDiscoverability(c.discoverability) === CampaignDiscoverability.PUBLIC,
  );
}

export function useHubFilterCounts(campaigns: CampaignSummary[]) {
  return useMemo(
    () => ({
      all: campaigns.length,
      managing: filterCampaignsByHubTab(campaigns, 'managing').length,
      joined: filterCampaignsByHubTab(campaigns, 'joined').length,
      public: filterCampaignsByHubTab(campaigns, 'public').length,
    }),
    [campaigns],
  );
}
