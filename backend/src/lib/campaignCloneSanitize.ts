import type { CampaignCloneOptions } from './campaignCloneOptions.js';
import { resolvePresetToOptions, isClonePresetId } from './campaignClonePresets.js';
import type { ClonePresetId, ClonePresetUsed } from './campaignClonePresets.js';
import { isValidDiscoverability, normalizeDiscoverability } from '../../../shared/campaignPolicy/discoverability.js';

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function sanitizeCampaignCloneOptions(raw: unknown): CampaignCloneOptions {
  const root = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const defaults = resolvePresetToOptions('fresh-sequel');

  const structureRaw =
    root.structure && typeof root.structure === 'object'
      ? (root.structure as Record<string, unknown>)
      : {};
  const recruitmentRaw =
    root.recruitment && typeof root.recruitment === 'object'
      ? (root.recruitment as Record<string, unknown>)
      : {};
  const schedulingRaw =
    root.scheduling && typeof root.scheduling === 'object'
      ? (root.scheduling as Record<string, unknown>)
      : {};
  const gameplayRaw =
    root.gameplay && typeof root.gameplay === 'object'
      ? (root.gameplay as Record<string, unknown>)
      : {};
  const communityRaw =
    root.community && typeof root.community === 'object'
      ? (root.community as Record<string, unknown>)
      : {};

  return {
    structure: {
      wikiPages: bool(structureRaw.wikiPages, defaults.structure.wikiPages),
      folderStructure: bool(structureRaw.folderStructure, defaults.structure.folderStructure),
      sidebarLayout: bool(structureRaw.sidebarLayout, defaults.structure.sidebarLayout),
    },
    recruitment: {
      settings: bool(recruitmentRaw.settings, defaults.recruitment.settings),
      tableStyleTags: bool(recruitmentRaw.tableStyleTags, defaults.recruitment.tableStyleTags),
      safety: bool(recruitmentRaw.safety, defaults.recruitment.safety),
      publicDocs: bool(recruitmentRaw.publicDocs, defaults.recruitment.publicDocs),
    },
    scheduling: {
      calendarStructure: bool(
        schedulingRaw.calendarStructure,
        defaults.scheduling.calendarStructure,
      ),
      sessionCadence: bool(schedulingRaw.sessionCadence, defaults.scheduling.sessionCadence),
      sessionEventsLogs: bool(
        schedulingRaw.sessionEventsLogs,
        defaults.scheduling.sessionEventsLogs,
      ),
    },
    gameplay: {
      characters: bool(gameplayRaw.characters, defaults.gameplay.characters),
      inventoryState: bool(gameplayRaw.inventoryState, defaults.gameplay.inventoryState),
      mapsAssets: bool(gameplayRaw.mapsAssets, defaults.gameplay.mapsAssets),
      diceHistory: false,
    },
    community: {
      members: bool(communityRaw.members, defaults.community.members),
      joinRequests: bool(communityRaw.joinRequests, defaults.community.joinRequests),
      chatHistory: false,
    },
  };
}

export function parseDuplicateCampaignBody(body: unknown): {
  name: string;
  discoverability: string;
  copy: CampaignCloneOptions;
  presetUsed?: ClonePresetUsed;
} | null {
  if (!body || typeof body !== 'object') return null;
  const root = body as Record<string, unknown>;
  const name = typeof root.name === 'string' ? root.name.trim() : '';
  if (!name) return null;

  const discoverability = isValidDiscoverability(root.discoverability as string | null | undefined)
    ? (root.discoverability as string)
    : root.isPublicViewable === true || root.isPublicViewable === 'true'
      ? 'unlisted'
      : normalizeDiscoverability('private');

  let copy: CampaignCloneOptions;
  if (root.copy !== undefined) {
    copy = sanitizeCampaignCloneOptions(root.copy);
  } else if (typeof root.preset === 'string' && isClonePresetId(root.preset)) {
    copy = resolvePresetToOptions(root.preset as ClonePresetId);
  } else {
    return null;
  }

  const presetUsed =
    typeof root.presetUsed === 'string'
      ? root.presetUsed
      : typeof root.preset === 'string' && isClonePresetId(root.preset)
        ? root.preset
        : undefined;

  return { name, discoverability, copy, presetUsed: presetUsed as ClonePresetUsed | undefined };
}
