import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { env } from '../config/env.js';
import { generateHandle, makeUniqueHandle, isValidHandle } from './handleUtils.js';
import { getDefaultSidebarConfig, normalizeSidebarConfig } from './sidebarConfig.js';
import { getDefaultDashboardConfig } from './dashboardConfig.js';
import { generateInviteToken } from './inviteToken.js';
import { seedWikiSkeleton } from './seedWiki.js';
import { CampaignMemberRoles } from '../types/domain.js';
import type { CampaignCloneOptions } from './campaignCloneOptions.js';
import {
  buildCategoryIndexWhereClause,
  readEntityCategoryFromMetadata,
} from './wikiCategoryEntityIndex.js';
import { rebuildWikiLinksForCampaign } from './wikiLinkService.js';
import { uploadFilenameFromUrl } from './campaignMediaSize.js';

const SESSION_NOTE_TEMPLATE = 'SESSION_NOTE';
const LOG_CATEGORY_KEYS = new Set(['events', 'timelines', 'journals']);

export interface DuplicateCampaignInput {
  sourceCampaignId: string;
  ownerUserId: string;
  name: string;
  discoverability: string;
  copy: CampaignCloneOptions;
}

export interface DuplicateCampaignResult {
  campaignId: string;
  handle: string;
  name: string;
}

function isSessionLikePage(page: {
  templateType: string;
  metadata: unknown;
  title: string;
}): boolean {
  if (page.templateType === SESSION_NOTE_TEMPLATE) return true;
  const category = readEntityCategoryFromMetadata(page.metadata);
  if (category && LOG_CATEGORY_KEYS.has(category)) return true;
  const lower = page.title.toLowerCase();
  if (lower.includes('session') && lower.includes('note')) return true;
  return false;
}

function pageMatchesCategory(
  page: { metadata: unknown; templateType: string; parentId: string | null },
  categoryTitle: string,
  categoryRootIds: Set<string>,
): boolean {
  if (page.parentId && categoryRootIds.has(page.parentId)) return true;
  const key = readEntityCategoryFromMetadata(page.metadata);
  if (!key) return false;
  const normalized = categoryTitle.toLowerCase();
  return key === normalized || key === categoryTitle.replace(/\s+/g, '-').toLowerCase();
}

async function resolveUniqueHandle(name: string): Promise<string> {
  const baseHandle = generateHandle(name);

  const existingHandles = new Set(
    (
      await prisma.campaign.findMany({
        where: { handle: { startsWith: baseHandle } },
        select: { handle: true },
      })
    ).map((row) => row.handle),
  );

  return existingHandles.size > 0 ? makeUniqueHandle(baseHandle, existingHandles) : baseHandle;
}

async function copyAssetFile(sourceUrl: string, newAssetId: string): Promise<string> {
  const filename = uploadFilenameFromUrl(sourceUrl);
  if (!filename) return sourceUrl;
  const sourcePath = path.join(env.uploadsDir, filename);
  try {
    await fs.access(sourcePath);
  } catch {
    return sourceUrl;
  }
  const ext = path.extname(filename) || '.bin';
  const nextFilename = `${newAssetId}${ext}`;
  await fs.copyFile(sourcePath, path.join(env.uploadsDir, nextFilename));
  return `/uploads/${nextFilename}`;
}

export async function duplicateCampaign(
  input: DuplicateCampaignInput,
): Promise<DuplicateCampaignResult> {
  const source = await prisma.campaign.findUnique({
    where: { id: input.sourceCampaignId },
    include: {
      fantasyCalendars: {
        include: { events: true },
      },
      calendarEventCategories: true,
      wikiPages: true,
      tags: { include: { pages: { select: { id: true } } } },
      assets: true,
      templates: true,
      pageShortcuts: true,
      playerSandboxNotes: true,
      sessionTimelinePoints: true,
      members: true,
      joinRequests: true,
      activities: true,
      pluginSettings: true,
    },
  });

  if (!source) {
    throw new Error('Source campaign not found');
  }

  const finalHandle = await resolveUniqueHandle(input.name);
  const copy = input.copy;

  const categoryRoots = await prisma.wikiPage.findMany({
    where: {
      campaignId: source.id,
      parentId: null,
      title: { in: ['Characters', 'Maps', 'Game/Session Notes', 'Game/Events', 'Game/Timelines', 'Game/Journals'] },
    },
    select: { id: true, title: true },
  });
  const characterRootIds = new Set(
    categoryRoots.filter((p) => p.title === 'Characters').map((p) => p.id),
  );
  const mapRootIds = new Set(
    categoryRoots.filter((p) => p.title === 'Maps').map((p) => p.id),
  );

  const created = await prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.create({
      data: {
        name: input.name.trim(),
        handle: finalHandle,
        inviteToken: generateInviteToken(),
        campaignOwnerUserId: input.ownerUserId,
        description: copy.structure.wikiPages ? source.description : null,
        discoverability: input.discoverability,
        isLookingForGroup: false,
        language: source.language,
        gameSystem: source.gameSystem,
        customGameSystemName: source.customGameSystemName,
        themePreset: source.themePreset,
        appearanceProfile: copy.structure.sidebarLayout
          ? (source.appearanceProfile as Prisma.InputJsonValue)
          : undefined,
        sidebarConfig: copy.structure.sidebarLayout
          ? ((source.sidebarConfig ?? getDefaultSidebarConfig()) as unknown as Prisma.InputJsonValue)
          : (getDefaultSidebarConfig() as unknown as Prisma.InputJsonValue),
        dashboardConfig: copy.structure.sidebarLayout
          ? ((source.dashboardConfig ?? getDefaultDashboardConfig()) as unknown as Prisma.InputJsonValue)
          : (getDefaultDashboardConfig() as unknown as Prisma.InputJsonValue),
        ensembleConfig: copy.structure.sidebarLayout
          ? (source.ensembleConfig as Prisma.InputJsonValue)
          : undefined,
        currentEpochMinute: copy.scheduling.calendarStructure
          ? source.currentEpochMinute
          : BigInt(0),
      },
    });

    await tx.campaignMember.create({
      data: {
        userId: input.ownerUserId,
        campaignId: campaign.id,
        role: CampaignMemberRoles.GAMEMASTER,
      },
    });

    if (!copy.structure.wikiPages) {
      await seedWikiSkeleton(tx, campaign.id);
    } else {
      await seedWikiSkeleton(tx, campaign.id);
      await tx.wikiPage.deleteMany({ where: { campaignId: campaign.id } });
    }

    if (copy.recruitment.settings) {
      await tx.campaign.update({
        where: { id: campaign.id },
        data: {
          recruitmentTagline: source.recruitmentTagline,
          recruitmentPremise: source.recruitmentPremise,
          recruitmentBeforeApplyNote: source.recruitmentBeforeApplyNote,
          scheduleFrequency: copy.scheduling.sessionCadence
            ? source.scheduleFrequency
            : undefined,
          scheduleDay: copy.scheduling.sessionCadence ? source.scheduleDay : undefined,
          scheduleTime: copy.scheduling.sessionCadence ? source.scheduleTime : undefined,
          scheduleTimezone: copy.scheduling.sessionCadence
            ? source.scheduleTimezone
            : undefined,
          currentSession: copy.scheduling.sessionCadence ? source.currentSession : 0,
          sessionDuration: copy.scheduling.sessionCadence
            ? source.sessionDuration
            : undefined,
          estimatedLength: copy.scheduling.sessionCadence
            ? source.estimatedLength
            : undefined,
          campaignFormat: source.campaignFormat,
          experienceRequired: source.experienceRequired,
          ageRestriction: source.ageRestriction,
          levelRange: source.levelRange,
          maxSeats: source.maxSeats,
          maxPlayers: source.maxPlayers,
          genreThemes: source.genreThemes as Prisma.InputJsonValue,
          campaignIntegrations: source.campaignIntegrations as Prisma.InputJsonValue,
          equipmentNeeded: source.equipmentNeeded,
          allowPlayerChronologyManagement: source.allowPlayerChronologyManagement,
        },
      });
    }

    if (copy.recruitment.tableStyleTags) {
      await tx.campaign.update({
        where: { id: campaign.id },
        data: { tableStyleTags: source.tableStyleTags as Prisma.InputJsonValue },
      });
    }

    if (copy.recruitment.safety) {
      await tx.campaign.update({
        where: { id: campaign.id },
        data: {
          safetyTools: source.safetyTools,
          contentWarnings: source.contentWarnings,
          includeSafetyGuidelines: source.includeSafetyGuidelines,
        },
      });
    }

    if (copy.recruitment.publicDocs) {
      await tx.campaign.update({
        where: { id: campaign.id },
        data: {
          includeRules: source.includeRules,
          includeFAQ: source.includeFAQ,
          includeSessionZero: source.includeSessionZero,
          includeHomebrew: source.includeHomebrew,
          includeCharacterCreation: source.includeCharacterCreation,
          includeTableExpectations: source.includeTableExpectations,
        },
      });
    }

    const calendarIdMap = new Map<string, string>();
    const categoryIdMap = new Map<string, string>();

    if (copy.scheduling.calendarStructure) {
      for (const category of source.calendarEventCategories) {
        const createdCategory = await tx.calendarEventCategory.create({
          data: {
            campaignId: campaign.id,
            name: category.name,
            color: category.color,
          },
        });
        categoryIdMap.set(category.id, createdCategory.id);
      }

      for (const calendar of source.fantasyCalendars) {
        const createdCalendar = await tx.fantasyCalendar.create({
          data: {
            campaignId: campaign.id,
            name: calendar.name,
            isMasterTime: calendar.isMasterTime,
            epochOffset: calendar.epochOffset,
            weekdays: calendar.weekdays as Prisma.InputJsonValue,
            months: calendar.months as Prisma.InputJsonValue,
            seasons: calendar.seasons as Prisma.InputJsonValue,
            moons: calendar.moons as Prisma.InputJsonValue,
            leapDays: calendar.leapDays as Prisma.InputJsonValue,
          },
        });
        calendarIdMap.set(calendar.id, createdCalendar.id);

        if (copy.scheduling.sessionEventsLogs) {
          for (const event of calendar.events) {
            await tx.calendarEvent.create({
              data: {
                calendarId: createdCalendar.id,
                categoryId: event.categoryId
                  ? (categoryIdMap.get(event.categoryId) ?? null)
                  : null,
                visibility: event.visibility,
                title: event.title,
                description: event.description,
                duration: event.duration,
                isRepeating: event.isRepeating,
                repeatInterval: event.repeatInterval,
                repeatUnit: event.repeatUnit,
                limitRepetitions: event.limitRepetitions,
                conditions: event.conditions as Prisma.InputJsonValue,
                moonOverrides: event.moonOverrides as Prisma.InputJsonValue,
                isRecurring: event.isRecurring,
                targetYear: event.targetYear,
                targetMonth: event.targetMonth,
                targetDay: event.targetDay,
                targetEpochMinute: event.targetEpochMinute,
                recurrenceRule: event.recurrenceRule as Prisma.InputJsonValue,
              },
            });
          }
        }
      }
    }

    const pageIdMap = new Map<string, string>();
    const assetIdMap = new Map<string, string>();

    if (copy.gameplay.mapsAssets) {
      for (const asset of source.assets) {
        if (asset.type === 'campaign-backup-zip' || asset.type === 'campaign-import-zip') {
          continue;
        }
        const newId = randomUUID();
        const url = await copyAssetFile(asset.url, newId);
        await tx.asset.create({
          data: {
            id: newId,
            campaignId: campaign.id,
            url,
            type: asset.type,
            expiresAt: asset.expiresAt,
          },
        });
        assetIdMap.set(asset.id, newId);
      }
    }

    if (copy.structure.wikiPages) {
      const pagesToCopy = source.wikiPages.filter((page) => {
        if (!copy.scheduling.sessionEventsLogs && isSessionLikePage(page)) {
          return false;
        }
        const isCharacter = pageMatchesCategory(page, 'characters', characterRootIds);
        const isMap =
          Boolean(page.mapAssetId) ||
          pageMatchesCategory(page, 'maps', mapRootIds);

        if (isCharacter && !copy.gameplay.characters) return false;
        if (isMap && !copy.gameplay.mapsAssets) return false;
        return true;
      });

      const copyIds = new Set(pagesToCopy.map((p) => p.id));

      const sorted = [...pagesToCopy].sort((a, b) => {
        const depth = (id: string, seen = new Set<string>()): number => {
          if (!id || seen.has(id)) return 0;
          seen.add(id);
          const row = source.wikiPages.find((p) => p.id === id);
          if (!row?.parentId || !copyIds.has(row.parentId)) return 0;
          return 1 + depth(row.parentId, seen);
        };
        return depth(a.id) - depth(b.id);
      });

      for (const page of sorted) {
        const newId = randomUUID();
        pageIdMap.set(page.id, newId);

        let parentId: string | null = null;
        if (copy.structure.folderStructure && page.parentId) {
          parentId = pageIdMap.get(page.parentId) ?? null;
        }

        let featuredImageId: string | null = null;
        if (page.featuredImageId && assetIdMap.has(page.featuredImageId)) {
          featuredImageId = assetIdMap.get(page.featuredImageId) ?? null;
        }

        let mapAssetId: string | null = null;
        if (page.mapAssetId && assetIdMap.has(page.mapAssetId)) {
          mapAssetId = assetIdMap.get(page.mapAssetId) ?? null;
        }

        await tx.wikiPage.create({
          data: {
            id: newId,
            campaignId: campaign.id,
            title: page.title,
            parentId,
            blocks: page.blocks as Prisma.InputJsonValue,
            templateType: page.templateType,
            visibility: page.visibility,
            metadata: page.metadata as Prisma.InputJsonValue,
            featuredImageId,
            mapAssetId,
          },
        });
      }

      const sourceLinks = await tx.wikiLink.findMany({
        where: { campaignId: source.id },
      });

      for (const link of sourceLinks) {
        const sourceId = pageIdMap.get(link.sourcePageId);
        const targetId = pageIdMap.get(link.targetPageId);
        if (!sourceId || !targetId) continue;
        await tx.wikiLink.create({
          data: {
            campaignId: campaign.id,
            sourcePageId: sourceId,
            targetPageId: targetId,
          },
        });
      }

      if (copy.structure.wikiPages) {
        for (const tag of source.tags) {
          const newTag = await tx.tag.create({
            data: {
              campaignId: campaign.id,
              name: tag.name,
              label: tag.label,
              icon: tag.icon,
              color: tag.color,
            },
          });
          for (const page of tag.pages) {
            const mapped = pageIdMap.get(page.id);
            if (!mapped) continue;
            await tx.wikiPage.update({
              where: { id: mapped },
              data: { tags: { connect: { id: newTag.id } } },
            });
          }
        }
      }
    }

    if (copy.gameplay.characters && !copy.structure.wikiPages) {
      const characterWhere = buildCategoryIndexWhereClause('Characters');
      const characterPages = source.wikiPages.filter((page) => {
        const matchesRoot =
          page.parentId != null && characterRootIds.has(page.parentId);
        const category = readEntityCategoryFromMetadata(page.metadata);
        return matchesRoot || category === 'characters';
      });

      for (const page of characterPages) {
        if (pageIdMap.has(page.id)) continue;
        const newId = randomUUID();
        pageIdMap.set(page.id, newId);
        await tx.wikiPage.create({
          data: {
            id: newId,
            campaignId: campaign.id,
            title: page.title,
            parentId: null,
            blocks: page.blocks as Prisma.InputJsonValue,
            templateType: page.templateType,
            visibility: page.visibility,
            metadata: page.metadata as Prisma.InputJsonValue,
          },
        });
      }
    }

    if (copy.gameplay.inventoryState) {
      for (const note of source.playerSandboxNotes) {
        await tx.playerSandboxNote.create({
          data: {
            campaignId: campaign.id,
            userId: note.userId,
            title: note.title,
            content: note.content,
          },
        });
      }
    }

    if (copy.scheduling.sessionEventsLogs) {
      for (const point of source.sessionTimelinePoints) {
        const wikiPageId = pageIdMap.get(point.wikiPageId);
        if (!wikiPageId) continue;
        await tx.campaignSessionTimeline.create({
          data: {
            campaignId: campaign.id,
            wikiPageId,
            authorId: point.authorId,
            sequenceOrder: point.sequenceOrder,
          },
        });
      }

      for (const activity of source.activities) {
        await tx.campaignActivity.create({
          data: {
            campaignId: campaign.id,
            userId: activity.userId,
            actionType: activity.actionType,
            entityType: activity.entityType,
            entityId: activity.entityId,
            entityName: activity.entityName,
            parentContext: activity.parentContext,
            pageSizeBytes: activity.pageSizeBytes,
            deltaBytes: activity.deltaBytes,
          },
        });
      }
    }

    if (copy.community.members) {
      for (const member of source.members) {
        if (member.userId === input.ownerUserId) continue;
        await tx.campaignMember.create({
          data: {
            userId: member.userId,
            campaignId: campaign.id,
            role: member.role,
          },
        });
      }
    }

    if (copy.community.joinRequests) {
      for (const request of source.joinRequests) {
        await tx.campaignJoinRequest.create({
          data: {
            campaignId: campaign.id,
            userId: request.userId,
            status: request.status,
            message: request.message,
            declineReasonCode: request.declineReasonCode,
            declineMessage: request.declineMessage,
          },
        });
      }
    }

    if (copy.structure.sidebarLayout) {
      await tx.campaign.update({
        where: { id: campaign.id },
        data: {
          sidebarConfig: normalizeSidebarConfig(source.sidebarConfig) as unknown as Prisma.InputJsonValue,
        },
      });
    }

    return campaign;
  });

  await rebuildWikiLinksForCampaign(created.id);
  const { rebuildEntityRelationsForCampaign } = await import('./entityRelationSyncService.js');
  await rebuildEntityRelationsForCampaign(created.id);
  const { rebuildNarrativeLifecycleForCampaign } = await import('./narrativeLifecycleService.js');
  await rebuildNarrativeLifecycleForCampaign(created.id);

  return {
    campaignId: created.id,
    handle: created.handle,
    name: created.name,
  };
}
