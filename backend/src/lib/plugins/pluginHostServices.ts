import type { DomainEventListener } from '../domainEvents/index.js';
import type { PluginDataApi } from './pluginDataService.js';
import type {
  PluginCalendarReadDto,
  PluginLoreIndexEntryDto,
  PluginMapSummaryDto,
  PluginPartyMemberDto,
  PluginTimelineEventDto,
  PluginWorldSummaryDto,
} from '../../../../shared/pluginCampaignRead.js';
import {
  readPluginCalendar,
  readPluginLoreIndex,
  readPluginMaps,
  readPluginParty,
  readPluginTimelineRecent,
  readPluginWorldSummary,
} from './pluginCampaignReadService.js';
import {
  getPluginCampaignConfig,
  setPluginCampaignConfig,
} from './pluginConfigService.js';
import {
  deletePluginSecret,
  getPluginSecret,
  listPluginSecretKeys,
  setPluginSecret,
} from './pluginSecretsService.js';

function assertPermission(
  pluginId: string,
  permissions: string[],
  permission: string,
): void {
  if (!permissions.includes(permission)) {
    throw new Error(`Plugin "${pluginId}" lacks ${permission} permission`);
  }
}

function resolveCampaignId(
  jailedCampaignId: string | undefined,
  requested?: string,
): string {
  const campaignId = jailedCampaignId ?? requested;
  if (!campaignId) {
    throw new Error('campaignId is required');
  }
  if (jailedCampaignId && requested && requested !== jailedCampaignId) {
    throw new Error('Campaign jail violation');
  }
  return campaignId;
}

export interface PluginCalendarApi {
  getCurrentDate(): Promise<PluginCalendarReadDto>;
  getSeason(): Promise<string | null>;
}

export interface PluginTimelineApi {
  getRecentEvents(limit?: number): Promise<PluginTimelineEventDto[]>;
}

export interface PluginPartyApi {
  getCurrentParty(viewerUserId?: string | null): Promise<PluginPartyMemberDto[]>;
}

export interface PluginWorldApi {
  getSummary(): Promise<PluginWorldSummaryDto | null>;
}

export interface PluginLoreApi {
  getCharacters(
    viewerUserId?: string | null,
    limit?: number,
  ): Promise<PluginLoreIndexEntryDto[]>;
  getOrganizations(
    viewerUserId?: string | null,
    limit?: number,
  ): Promise<PluginLoreIndexEntryDto[]>;
  getLocations(
    viewerUserId?: string | null,
    limit?: number,
  ): Promise<PluginLoreIndexEntryDto[]>;
}

export interface PluginMapsApi {
  list(viewerUserId?: string | null, limit?: number): Promise<PluginMapSummaryDto[]>;
}

export interface PluginConfigApi {
  get(key?: string): Promise<unknown>;
  set(partial: Record<string, unknown>): Promise<Record<string, unknown>>;
}

export interface PluginSecretsApi {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  listKeys(): Promise<string[]>;
}

export interface PluginEventsApi {
  subscribe(pattern: string, listener: DomainEventListener): () => void;
}

export interface PluginHostServiceBundle {
  data: PluginDataApi;
  calendar: PluginCalendarApi;
  timeline: PluginTimelineApi;
  party: PluginPartyApi;
  world: PluginWorldApi;
  lore: PluginLoreApi;
  maps: PluginMapsApi;
  config: PluginConfigApi;
  secrets: PluginSecretsApi;
  events: PluginEventsApi;
}

export function createPluginHostServices(input: {
  pluginId: string;
  permissions: string[];
  jailedCampaignId?: string;
  data: PluginDataApi;
  subscribeToDomainEvent: (
    pattern: string,
    listener: DomainEventListener,
  ) => () => void;
}): PluginHostServiceBundle {
  const { pluginId, permissions, jailedCampaignId, data, subscribeToDomainEvent } =
    input;

  const campaignIdFor = (requested?: string) =>
    resolveCampaignId(jailedCampaignId, requested);

  return {
    data,
    calendar: {
      async getCurrentDate() {
        assertPermission(pluginId, permissions, 'campaign:read-calendar');
        return readPluginCalendar(campaignIdFor());
      },
      async getSeason() {
        assertPermission(pluginId, permissions, 'campaign:read-calendar');
        const calendar = await readPluginCalendar(campaignIdFor());
        return calendar.season;
      },
    },
    timeline: {
      async getRecentEvents(limit = 20) {
        assertPermission(pluginId, permissions, 'campaign:read-timeline');
        return readPluginTimelineRecent(campaignIdFor(), limit);
      },
    },
    party: {
      async getCurrentParty(viewerUserId = null) {
        assertPermission(pluginId, permissions, 'campaign:read-party');
        return readPluginParty(campaignIdFor(), viewerUserId);
      },
    },
    world: {
      async getSummary() {
        assertPermission(pluginId, permissions, 'campaign:read-world');
        return readPluginWorldSummary(campaignIdFor());
      },
    },
    lore: {
      getCharacters(viewerUserId = null, limit = 100) {
        assertPermission(pluginId, permissions, 'campaign:read-lore');
        return readPluginLoreIndex(
          campaignIdFor(),
          'characters',
          viewerUserId,
          limit,
        );
      },
      getOrganizations(viewerUserId = null, limit = 100) {
        assertPermission(pluginId, permissions, 'campaign:read-lore');
        return readPluginLoreIndex(
          campaignIdFor(),
          'organizations',
          viewerUserId,
          limit,
        );
      },
      getLocations(viewerUserId = null, limit = 100) {
        assertPermission(pluginId, permissions, 'campaign:read-lore');
        return readPluginLoreIndex(
          campaignIdFor(),
          'locations',
          viewerUserId,
          limit,
        );
      },
    },
    maps: {
      list(viewerUserId = null, limit = 50) {
        assertPermission(pluginId, permissions, 'campaign:read-maps');
        return readPluginMaps(campaignIdFor(), viewerUserId, limit);
      },
    },
    config: {
      get(key?: string) {
        assertPermission(pluginId, permissions, 'plugin:config');
        return getPluginCampaignConfig(pluginId, campaignIdFor(), key);
      },
      set(partial: Record<string, unknown>) {
        assertPermission(pluginId, permissions, 'plugin:config');
        return setPluginCampaignConfig(pluginId, campaignIdFor(), partial);
      },
    },
    secrets: {
      get(key: string) {
        assertPermission(pluginId, permissions, 'plugin:secrets');
        return getPluginSecret(pluginId, campaignIdFor(), key);
      },
      set(key: string, value: string) {
        assertPermission(pluginId, permissions, 'plugin:secrets');
        return setPluginSecret(pluginId, campaignIdFor(), key, value);
      },
      delete(key: string) {
        assertPermission(pluginId, permissions, 'plugin:secrets');
        return deletePluginSecret(pluginId, campaignIdFor(), key);
      },
      listKeys() {
        assertPermission(pluginId, permissions, 'plugin:secrets');
        return listPluginSecretKeys(pluginId, campaignIdFor());
      },
    },
    events: {
      subscribe(pattern: string, listener: DomainEventListener) {
        return subscribeToDomainEvent(pattern, listener);
      },
    },
  };
}
