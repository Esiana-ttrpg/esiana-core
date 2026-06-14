import { docsLinks } from '@/lib/docsLinks';

export const NARRATIVE_SNAPSHOTS_USER_GUIDE_URL = docsLinks.campaignHistorySnapshots;

export const campaignHistoryTitle = 'Campaign History';

export const campaignHistorySubtitle =
  'Compare how the world changed between key moments in the campaign.';

export const compareBlockHeading = 'Compare campaign moments';

export const compareBlockHint =
  'Comparison always runs from an older capture to a newer one.';

export const earlierMomentLabel = 'Earlier moment';

export const laterMomentLabel = 'Later moment';

export const compareButtonLabel = 'Compare';

export const swapOrderHint = 'Swapped to keep earlier → later order.';

export const emptyMomentsMessage =
  'No campaign moments yet. Mark a party visit on a location or capture a milestone snapshot.';

export const archivedMomentHint = 'Archived — not available for compare';

export const createMilestonePrompt = 'Milestone label (optional)';

export const createMilestoneButton = 'Capture milestone';

export const narrativeSnapshotsHelpTrigger = 'What are snapshots?';

export const narrativeSnapshotsHelpSections = [
  {
    title: 'What snapshots capture',
    body:
      'Snapshots are historical captures of projected campaign state—factions, NPC presence, rumors, danger, and location context—derived from your wiki and chronology. They are not save files or alternate timelines.',
  },
  {
    title: 'When to create them manually',
    body:
      'Capture a milestone at arc endings, time skips, wars, major discoveries, or faction shifts so you can look back at how the world looked at that checkpoint.',
  },
  {
    title: 'Automatic party-visit snapshots',
    body:
      'When you mark a location as visited, Esiana records a visit snapshot for that region. These appear alongside manual milestones in Campaign History.',
  },
  {
    title: 'Why compare',
    body:
      'Comparing two moments shows what changed—who moved, which factions shifted, new rumors, danger changes, and location evolution. Use it for continuity checks, session recaps, and planning what the party will notice when they return.',
  },
] as const;

export const learnMoreLabel = 'Learn more';

export function mapCompareError(message: string, code?: string): string {
  if (code === 'archived_compare' || message.includes('archived')) {
    return 'One or both moments are archived and cannot be compared.';
  }
  if (message.includes('region anchor') || message.includes('lack region')) {
    return 'These moments cannot be compared yet. Region-scoped compare needs a location anchor—campaign-wide milestones without a location are not supported in v1.';
  }
  return message;
}
