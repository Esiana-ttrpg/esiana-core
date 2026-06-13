import {
  batchSessionBacklinksForPages,
  type SessionPageBacklinkRow,
} from './sessionPageBacklinks.js';
import { SYSTEM_CATEGORY_QUESTS } from './wikiSystemCategory.js';

export type QuestHubBacklinkRow = SessionPageBacklinkRow;

/** Used when validating quests category — exported for tests */
export { SYSTEM_CATEGORY_QUESTS };

export async function batchSessionBacklinksForQuests(input: {
  campaignId: string;
  campaignHandle: string;
  targetPageIds: string[];
  role: string | null;
  limitPerTarget?: number;
}): Promise<Map<string, QuestHubBacklinkRow[]>> {
  return batchSessionBacklinksForPages(input);
}

export { batchSessionBacklinksForPages };
