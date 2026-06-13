import type { CreativeDriftActiveBucket } from '@shared/creativeDrift';

export const UNRESOLVED_PAGE_TITLE = 'Unresolved';

export const UNRESOLVED_HEADER_LEAD =
  'Stories naturally leave traces behind.';

export const UNRESOLVED_HEADER_PARAGRAPHS = [
  'Plotlines, characters, promises, mysteries, and emotional beats sometimes drift out of focus during play. Some are waiting for the right moment to return. Others slowly become part of the campaign\u2019s atmosphere, history, or rumor.',
  'Unresolved helps you keep track of story elements that are cooling, dormant, or quietly lingering in the background. Nothing here is broken or required. You can revisit threads later, mark them as intentional, archive them into history, or reconnect them to active storylines whenever it feels right.',
] as const;

export const UNRESOLVED_REASSURANCE =
  'Not every unresolved thread needs to return. Some become atmosphere, history, or rumor.';

export const UNRESOLVED_WIKI_LINK_LABEL = 'Learn more about narrative drift';

export function formatUnresolvedSummary(count: number): string {
  const noun = count === 1 ? 'element' : 'elements';
  return `${count} unresolved story ${noun} across the campaign`;
}

export const UNRESOLVED_LOADING_LABEL = 'Gathering unresolved story elements\u2026';
export const UNRESOLVED_ERROR_MESSAGE = 'Could not load Unresolved.';
export const UNRESOLVED_FORBIDDEN_DESCRIPTION =
  'Unresolved is available to DMs and Co-DMs.';

export const UNRESOLVED_EMPTY_COPY: Record<CreativeDriftActiveBucket, string> = {
  dormant_plotlines: 'No dormant plotlines right now.',
  unused_entities: 'No dormant figures or factions right now.',
  hanging_promises: 'No unresolved promises right now.',
  emotional_residue: 'No emotional beats right now.',
};

export const UNRESOLVED_REAWAKENED_TITLE = 'Back in the story';
export const UNRESOLVED_REAWAKENED_DESCRIPTION =
  'Story elements that recently returned to play.';

export const UNRESOLVED_ACTIONS = {
  markIntentional: 'Mark as intentional',
  revisitLater: 'Revisit later',
  archiveToHistory: 'Archive to history',
  snooze30Days: 'Snooze 30 days',
  snooze90Days: 'Snooze 90 days',
  reconnectToThread: 'Reconnect to thread',
  convertToRumor: 'Convert to rumor\u2026',
} as const;

export function formatSetAsideToggle(showing: boolean, count: number): string {
  const verb = showing ? 'Hide' : 'Show';
  return `${verb} set aside & snoozed (${count})`;
}

export function formatLastActive(isoDate: string): string {
  const formatted = new Date(isoDate).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return `Last active ${formatted}`;
}
