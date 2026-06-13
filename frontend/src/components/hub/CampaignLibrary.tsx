import { useMemo, useState } from 'react';
import { LayoutGrid, List, Rows3 } from 'lucide-react';
import type { CampaignSummary } from '@/types/campaign';
import type { HubLibraryFilter, ShelfDensityMode } from '@/types/hub';
import { CampaignMemberRoles } from '@/types/domain';
import {
  loadShelfDensityPreference,
  resolveShelfDensity,
  saveShelfDensityPreference,
  type ResolvedShelfDensity,
} from '@/lib/hubDensityPreference';
import { CampaignLibraryCard } from '@/components/hub/CampaignLibraryCard';
import { CampaignLibraryRow } from '@/components/hub/CampaignLibraryRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { HubSectionHeader } from '@/components/hub/HubSectionHeader';
import { HubThemedSearch } from '@/components/hub/HubThemedSearch';

const FILTERS: Array<{ id: HubLibraryFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'managing', label: 'GMing' },
  { id: 'playing', label: 'Playing' },
  { id: 'favorites', label: 'Favorites' },
];

interface CampaignLibraryProps {
  campaigns: CampaignSummary[];
  pinnedCampaignIds: string[];
  onPinToggle: (campaignId: string, pinned: boolean) => void;
}

function isManagerRole(role: string | null | undefined): boolean {
  return role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER;
}

function filterCampaigns(
  campaigns: CampaignSummary[],
  filter: HubLibraryFilter,
  pinnedCampaignIds: string[],
  search: string,
): CampaignSummary[] {
  const q = search.trim().toLowerCase();
  let list = campaigns.filter((c) => c.isMember);

  if (filter === 'managing') {
    list = list.filter((c) => isManagerRole(c.role));
  } else if (filter === 'playing') {
    list = list.filter((c) => c.role === CampaignMemberRoles.PARTICIPANT || c.role === CampaignMemberRoles.OBSERVER);
  } else if (filter === 'favorites') {
    list = list.filter((c) => pinnedCampaignIds.includes(c.id));
  } else if (filter === 'active') {
    list = list.filter((c) => {
      const m = c.hubSignals?.momentum?.label;
      return (m !== 'stalled' && m !== 'fading') || c.hubSignals?.nextSession != null;
    });
  }

  if (q) {
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.handle.toLowerCase().includes(q) ||
        (c.hubSignals?.arcIdentity?.currentArc?.toLowerCase().includes(q) ?? false),
    );
  }

  const pinOrder = new Map(pinnedCampaignIds.map((id, i) => [id, i]));
  return [...list].sort((a, b) => {
    const pinA = pinOrder.get(a.id);
    const pinB = pinOrder.get(b.id);
    if (pinA != null && pinB != null && pinA !== pinB) return pinA - pinB;
    if (pinA != null && pinB == null) return -1;
    if (pinA == null && pinB != null) return 1;
    return a.name.localeCompare(b.name);
  });
}

export function CampaignLibrary({
  campaigns,
  pinnedCampaignIds,
  onPinToggle,
}: CampaignLibraryProps) {
  const [filter, setFilter] = useState<HubLibraryFilter>('all');
  const [search, setSearch] = useState('');
  const [densityPref, setDensityPref] = useState<ShelfDensityMode>(loadShelfDensityPreference);

  const memberCampaigns = useMemo(
    () => campaigns.filter((c) => c.isMember),
    [campaigns],
  );

  const filtered = useMemo(
    () => filterCampaigns(memberCampaigns, filter, pinnedCampaignIds, search),
    [memberCampaigns, filter, pinnedCampaignIds, search],
  );

  const resolvedDensity: ResolvedShelfDensity = resolveShelfDensity(
    memberCampaigns.length,
    densityPref,
  );
  const useList = resolvedDensity === 'ledger';

  function setDensity(mode: ShelfDensityMode) {
    setDensityPref(mode);
    saveShelfDensityPreference(mode);
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <HubSectionHeader
          title="Your Campaigns"
          subtitle="Every table in one place."
          variant="library"
        />
        <div
          className="flex items-center gap-1 rounded-lg border p-0.5"
          style={{ borderColor: 'rgba(201, 169, 98, 0.2)' }}
          title="Shelf density"
        >
          {(
            [
              { mode: 'cinematic' as const, icon: LayoutGrid, label: 'Cinematic' },
              { mode: 'shelf' as const, icon: Rows3, label: 'Shelf' },
              { mode: 'ledger' as const, icon: List, label: 'Ledger' },
            ] as const
          ).map(({ mode, icon: Icon, label }) => {
            const active =
              densityPref === mode ||
              (densityPref === 'auto' &&
                resolveShelfDensity(memberCampaigns.length, 'auto') === mode);
            return (
              <button
                key={mode}
                type="button"
                title={label}
                onClick={() => setDensity(mode)}
                className={`hub-chip hub-chip--library rounded-md !border-0 !bg-transparent !px-1.5 !py-1.5 ${
                  active ? 'hub-chip--active !bg-transparent' : 'text-muted hover:text-foreground'
                }`}
              >
                <Icon className="size-4" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <HubThemedSearch value={search} onChange={setSearch} />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`hub-chip hub-chip--library ${
                filter === f.id ? 'hub-chip--active' : 'text-muted hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No campaigns in this view"
          description="Try another filter or create a new campaign."
        />
      ) : useList ? (
        <ul className="flex flex-col gap-2 transition-all duration-200">
          {filtered.map((campaign) => (
            <li key={campaign.id}>
              <CampaignLibraryRow
                campaign={campaign}
                pinned={pinnedCampaignIds.includes(campaign.id)}
                onPinToggle={() =>
                  onPinToggle(campaign.id, pinnedCampaignIds.includes(campaign.id))
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <div
          className={`grid gap-3 transition-all duration-200 ${
            resolvedDensity === 'cinematic'
              ? 'sm:grid-cols-2 lg:grid-cols-3'
              : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          }`}
        >
          {filtered.map((campaign) => (
            <CampaignLibraryCard
              key={campaign.id}
              campaign={campaign}
              density={resolvedDensity}
              pinned={pinnedCampaignIds.includes(campaign.id)}
              onPinToggle={() =>
                onPinToggle(campaign.id, pinnedCampaignIds.includes(campaign.id))
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
