/** Stable DTOs for plugin campaign read services (no Prisma leakage). */

export interface PluginCalendarReadDto {
  currentEpochMinute: string | null;
  label: string | null;
  season: string | null;
  masterCalendarId: string | null;
  moonPhaseSummary: string | null;
}

export interface PluginTimelineEventDto {
  id: string;
  type: string;
  pageId: string | null;
  createdAt: string;
}

export interface PluginPartyMemberDto {
  userId: string;
  playerLabel: string;
  identityPageId: string | null;
}

export interface PluginWorldSummaryDto {
  handle: string;
  name: string;
  currentArc: string | null;
}

export interface PluginLoreIndexEntryDto {
  id: string;
  title: string;
  workspace: string | null;
  templateType: string | null;
}

export interface PluginMapSummaryDto {
  id: string;
  title: string;
}

export interface PluginHirelingReadDto {
  id: string;
  characterPageId: string;
  characterName: string;
  role: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'FORMER';
  assignment: { kind: 'haven' | 'project'; id: string; pageId: string; title: string } | null;
  compensation: { amount: number | null; currency: string | null; cadence: string | null; unpaid: boolean };
  features: Array<{ id: string; title: string; description: string | null }>;
  notes: string | null;
}

export interface PluginCampaignReadPermissions {
  calendar: boolean;
  timeline: boolean;
  party: boolean;
  world: boolean;
  lore: boolean;
  maps: boolean;
  downtime: boolean;
}
