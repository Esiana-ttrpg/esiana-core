import { prisma } from './prisma.js';
import type { ExtractedSocialMention } from './wikiLinkExtract.js';
import { notifyUsersFromTemplateAsync } from './notifications/notificationService.js';
import { NotificationType } from './notifications/types.js';
import { buildWikiPageHref } from './wikiLinkService.js';
import { wikiPageHrefSelect } from './wikiPageHrefSelect.js';

export async function dispatchSocialMentionNotifications(input: {
  campaignId: string;
  sourcePageId: string;
  mentions: ExtractedSocialMention[];
  actorUserId?: string | null;
}): Promise<void> {
  if (input.mentions.length === 0) return;

  const sourcePage = await prisma.wikiPage.findUnique({
    where: { id: input.sourcePageId },
    select: {
      ...wikiPageHrefSelect,
      campaign: { select: { handle: true } },
    },
  });
  if (!sourcePage) return;

  const linkUrl = buildWikiPageHref(sourcePage.campaign.handle, sourcePage);
  const notified = new Set<string>();

  for (const mention of input.mentions) {
    let targetUserId = mention.targetUserId;

    if (mention.mentionType === 'CHARACTER' && mention.identityPageId) {
      const member = await prisma.campaignMember.findFirst({
        where: {
          campaignId: input.campaignId,
          identityPageId: mention.identityPageId,
        },
        select: { userId: true },
      });
      targetUserId = member?.userId;
    }

    if (!targetUserId || targetUserId === input.actorUserId) continue;
    if (notified.has(targetUserId)) continue;
    notified.add(targetUserId);

    const type =
      mention.mentionType === 'CHARACTER'
        ? NotificationType.CHARACTER_REFERENCED_IN_PAGE
        : NotificationType.MENTION_IN_PAGE;

    notifyUsersFromTemplateAsync({
      userIds: [targetUserId],
      campaignId: input.campaignId,
      type,
      vars:
        mention.mentionType === 'CHARACTER'
          ? {
              characterLabel: mention.label,
              sourcePageTitle: sourcePage.title,
            }
          : {
              sourcePageTitle: sourcePage.title,
            },
      linkUrl,
      metadata: {
        sourcePageId: input.sourcePageId,
        mentionLabel: mention.label,
      },
    });
  }
}
