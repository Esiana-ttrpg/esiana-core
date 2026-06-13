import type { IconType } from 'react-icons';
import { SiDiscord, SiFoundryvirtualtabletop, SiRoll20 } from 'react-icons/si';
import type { PublicDirectoryCampaign } from '@/types/recruitment';
import {
  getLobbyTableCapacity,
  getOpenRecruitingSlots,
} from '@shared/recruitmentSeats';
import { tokenizeSafetyToolsText } from '@shared/safetyToolsGlossary';

export interface TableSocialState {
  headline: string;
  ariaLabel: string;
}

export function buildMetadataLine(campaign: PublicDirectoryCampaign): string | null {
  const r = campaign.recruitment;
  const settings = campaign.recruitmentSettings;
  const language = settings?.language ?? campaign.language;
  const genre = r.genreThemeLabels?.[0] ?? r.genreThemes[0] ?? null;

  const parts = [
    campaign.gameSystemLabel,
    genre,
    language,
  ].filter((part): part is string => Boolean(part?.trim()));

  return parts.length > 0 ? parts.join(' • ') : null;
}

export function buildCultureChips(campaign: PublicDirectoryCampaign): string[] {
  const r = campaign.recruitment;
  const tableStyles = (campaign.tableStyleLabels ?? campaign.tableStyleTags ?? []).slice(0, 3);
  const safetyLabels: string[] = [];
  const trimmed = r.safetyTools?.trim();
  if (trimmed) {
    for (const segment of tokenizeSafetyToolsText(trimmed)) {
      if (segment.type === 'term') {
        safetyLabels.push(segment.entry.label);
      }
    }
  }

  const merged: string[] = [];
  const seen = new Set<string>();
  for (const label of [...tableStyles, ...safetyLabels]) {
    const key = label.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(label.trim());
    if (merged.length >= 5) break;
  }
  return merged;
}

export function buildScheduleLine(campaign: PublicDirectoryCampaign): string {
  const r = campaign.recruitment;
  const day = r.scheduleDay?.trim();
  const daySuffix =
    day && !day.endsWith('s') ? `${day}s` : day;
  return `${r.scheduleFrequency ?? 'Schedule TBD'}${
    day ? ` • ${daySuffix}` : ''
  }${r.scheduleTime ? ` at ${r.scheduleTime}` : ''}`;
}

export function buildTableSocialState(campaign: PublicDirectoryCampaign): TableSocialState {
  const r = campaign.recruitment;
  const seatLimits = { maxSeats: r.maxSeats, maxPlayers: r.maxPlayers };
  const capacity = getLobbyTableCapacity(seatLimits);
  const filled = r.filledSeats;
  const open = getOpenRecruitingSlots(filled, seatLimits);
  const isFull = r.isFull;

  const headline = isFull
    ? 'Table full'
    : open > 0 || filled === 0
      ? 'Looking for players'
      : 'Players at the table';

  const ariaLabel = [
    headline,
    capacity > 0 ? `${filled} of ${capacity} players` : `${filled} players`,
    !isFull && open > 0 ? `${open} open` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return { headline, ariaLabel };
}

export function externalToolIcon(tool: string): IconType | null {
  const normalized = tool.trim().toLowerCase();
  if (normalized.includes('discord')) return SiDiscord;
  if (normalized.includes('roll20')) return SiRoll20;
  if (normalized.includes('foundry')) return SiFoundryvirtualtabletop;
  return null;
}
