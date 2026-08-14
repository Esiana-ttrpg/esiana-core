import {
  parseQuestMetadata,
  QUEST_TYPE_PRESETS,
  QUEST_STATUSES,
  type QuestMetadataFields,
} from '@/lib/questMetadata';
import { questLifecycleDisplayLabel } from '@/lib/questLifecycleDisplay';
import { readCategoryMetadataField } from '@/lib/wikiMetadata';
import { campaignWikiPath } from '@/lib/campaignPaths';
import type { NarrativeLifecycleState } from '@shared/narrativeLifecycle';
import type { WikiTagInput, WikiTreeNode } from '@/types/wiki';

export interface QuestOverviewDisplayValues {
  questType: string;
  narrativeStatus: string;
  summary: string;
  location: string;
  questGiverTitle: string;
  questGiverHref: string | null;
  organizationTitle: string;
  organizationHref: string | null;
  publicRewards: string;
  hiddenRewards: string;
  treasuryAmount: string;
  gmNotes: string;
  boardStatus: string;
}

function pageTitle(flatPages: WikiTreeNode[], id: string | null): string {
  if (!id) return '';
  return flatPages.find((p) => p.id === id)?.title?.trim() ?? '';
}

export function buildQuestOverviewDisplayValues(input: {
  pageMetadata: unknown;
  flatPages: WikiTreeNode[];
  campaignHandle: string;
  lifecycleState: NarrativeLifecycleState | null;
  isDMUser: boolean;
}): QuestOverviewDisplayValues {
  const quest = parseQuestMetadata(input.pageMetadata);
  const location = readCategoryMetadataField(input.pageMetadata, 'Location') ?? '';
  const giverId = quest.questGiverId;
  const orgId = quest.factionId;

  const hidden =
    input.isDMUser && quest.dmRewardsText?.trim()
      ? quest.dmRewardsText.trim()
      : '';
  const gmNotes =
    input.isDMUser && quest.gmNotes?.trim() ? quest.gmNotes.trim() : '';

  const treasury =
    quest.ledgerReward?.amount != null && quest.ledgerReward.amount > 0
      ? String(quest.ledgerReward.amount)
      : '';

  return {
    questType: quest.questType?.trim() ?? '',
    narrativeStatus: input.lifecycleState
      ? questLifecycleDisplayLabel(input.lifecycleState)
      : '',
    summary: quest.summary?.trim() ?? '',
    location: location.trim(),
    questGiverTitle: pageTitle(input.flatPages, giverId),
    questGiverHref: giverId
      ? campaignWikiPath(input.campaignHandle, giverId, input.flatPages)
      : null,
    organizationTitle: pageTitle(input.flatPages, orgId),
    organizationHref: orgId
      ? campaignWikiPath(input.campaignHandle, orgId, input.flatPages)
      : null,
    publicRewards: quest.rewardsText?.trim() ?? '',
    hiddenRewards: hidden,
    treasuryAmount: treasury,
    gmNotes,
    boardStatus: quest.questStatus.replace('_', ' '),
  };
}

export { QUEST_TYPE_PRESETS, QUEST_STATUSES };
export type { QuestMetadataFields };
