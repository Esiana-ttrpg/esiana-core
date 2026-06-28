import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { CampaignMemberRoles, JoinRequestStatus } from '../types/domain.js';
import {
  countFilledPlayerSeats,
  getLobbyTableCapacity,
  isLobbyTableFull,
  mapPublicTablePlayers,
  parseRecruitmentStringArray,
} from '../lib/recruitment.js';
import { resolveGameSystemLabel } from '../lib/gameSystemValidation.js';
import { isValidGameSystemSlug, normalizeGameSystemSlug } from '../lib/gameSystems.js';
import { resolveCampaignThemeLabels } from '../lib/campaignThemes.js';
import {
  campaignMatchesGenreThemeFilter,
  parseGenreThemeFilterQuery,
} from '../lib/campaignThemeValidation.js';
import { avatarApiUrl } from '../lib/avatarPaths.js';
import { deriveUsername, resolveUserDisplayName } from '../lib/userDisplay.js';
import {
  buildRecruitmentSettingsPayload,
  extractHeroImageUrl,
  parseTableStyleTags,
} from '../lib/recruitmentListing.js';
import {
  parseCampaignIntegrations,
  resolveExternalToolLabels,
} from '../../../shared/campaignIntegrations.js';
import { getGmStyleTagLabel } from '../lib/gmStyleTags.js';
import {
  normalizeRecruitmentDocTitle,
  RECRUITMENT_DOC_ALIASES,
} from '../lib/recruitmentDocAliases.js';
import { CampaignDiscoverability } from '../../../shared/campaignPolicy/discoverability.js';

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function extractMarkdownFromBlocks(blocks: unknown): string {
  const list = Array.isArray(blocks) ? blocks : [];
  const markdown = list
    .filter((block) => block && typeof block === 'object')
    .map((block) => {
      const typed = block as { type?: unknown; content?: { markdown?: unknown } };
      if (typed.type !== 'text-tiptap') return '';
      return typeof typed.content?.markdown === 'string' ? typed.content.markdown : '';
    })
    .filter(Boolean)
    .join('\n\n')
    .trim();
  return markdown;
}

function selectPublicRecruitmentCampaign() {
  return {
    id: true,
    name: true,
    handle: true,
    description: true,
    recruitmentTagline: true,
    recruitmentPremise: true,
    recruitmentBeforeApplyNote: true,
    language: true,
    campaignFormat: true,
    experienceRequired: true,
    ageRestriction: true,
    levelRange: true,
    tableStyleTags: true,
    scheduleTimezone: true,
    createdAt: true,
    updatedAt: true,
    gameSystem: true,
    customGameSystemName: true,
    discoverability: true,
    isLookingForGroup: true,
    scheduleFrequency: true,
    scheduleDay: true,
    scheduleTime: true,
    currentSession: true,
    sessionDuration: true,
    estimatedLength: true,
    maxSeats: true,
    maxPlayers: true,
    genreThemes: true,
    externalTools: true,
    campaignIntegrations: true,
    safetyTools: true,
    contentWarnings: true,
    equipmentNeeded: true,
    includeRules: true,
    includeFAQ: true,
    includeSessionZero: true,
    includeHomebrew: true,
    includeSafetyGuidelines: true,
    includeCharacterCreation: true,
    includeTableExpectations: true,
    dashboardConfig: true,
    followers: true,
    _count: {
      select: {
        members: true,
        joinRequests: {
          where: { status: JoinRequestStatus.ACCEPTED },
        },
      },
    },
    members: {
      select: {
        role: true,
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
            publicBio: true,
            pronouns: true,
          },
        },
      },
    },
  } as const;
}

function resolveTableStyleLabels(tags: string[]): string[] {
  return tags.map((tag) => getGmStyleTagLabel(tag));
}

function mapRecruitmentCampaign(campaign: any) {
  const filledSeats = countFilledPlayerSeats(campaign.members);
  const seatLimits = {
    maxSeats: campaign.maxSeats,
    maxPlayers: campaign.maxPlayers,
  };
  const tableCapacity = getLobbyTableCapacity(seatLimits);
  const tablePlayers = mapPublicTablePlayers(
    campaign.members,
    (user) => resolveUserDisplayName(user),
    (userId, hasAvatar) => (hasAvatar ? avatarApiUrl(userId) : null),
    tableCapacity,
  );
  const dmRecord = campaign.members.find((m: any) => m.role === CampaignMemberRoles.GAMEMASTER)?.user;
  const tableStyleTags = parseTableStyleTags(campaign.tableStyleTags);
  return {
    id: campaign.id,
    name: campaign.name,
    slug: campaign.handle,
    description: campaign.description,
    recruitmentTagline: campaign.recruitmentTagline ?? null,
    recruitmentPremise: campaign.recruitmentPremise ?? null,
    recruitmentBeforeApplyNote: campaign.recruitmentBeforeApplyNote ?? null,
    heroImageUrl: extractHeroImageUrl(campaign.dashboardConfig),
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
    language: campaign.language ?? null,
    recruitmentSettings: buildRecruitmentSettingsPayload(campaign),
    tableStyleTags,
    tableStyleLabels: resolveTableStyleLabels(tableStyleTags),
    gameSystem: campaign.gameSystem,
    customGameSystemName: campaign.customGameSystemName ?? null,
    gameSystemLabel: resolveGameSystemLabel(
      campaign.gameSystem,
      campaign.customGameSystemName,
    ),
    host: dmRecord
      ? {
          id: dmRecord.id,
          displayName: dmRecord.displayName,
          username: deriveUsername(dmRecord.email),
          label: resolveUserDisplayName(dmRecord),
          avatarUrl: dmRecord.avatarUrl ? avatarApiUrl(dmRecord.id) : null,
          publicBio: dmRecord.publicBio,
          pronouns: dmRecord.pronouns ?? null,
        }
      : null,
    recruitment: {
      scheduleFrequency: campaign.scheduleFrequency,
      scheduleDay: campaign.scheduleDay,
      scheduleTime: campaign.scheduleTime,
      scheduleTimezone: campaign.scheduleTimezone ?? null,
      currentSession: campaign.currentSession,
      sessionDuration: campaign.sessionDuration,
      estimatedLength: campaign.estimatedLength,
      maxSeats: campaign.maxSeats,
      maxPlayers: campaign.maxPlayers,
      filledSeats,
      isFull: isLobbyTableFull(filledSeats, {
        maxSeats: campaign.maxSeats,
        maxPlayers: campaign.maxPlayers,
      }),
      acceptedMemberCount: campaign._count.members,
      acceptedJoinRequestCount: campaign._count.joinRequests,
      followerCount: campaign.followers,
      genreThemes: parseRecruitmentStringArray(campaign.genreThemes),
      genreThemeLabels: resolveCampaignThemeLabels(
        parseRecruitmentStringArray(campaign.genreThemes),
      ),
      externalTools: resolveExternalToolLabels(
        parseCampaignIntegrations(campaign.campaignIntegrations),
        campaign.externalTools,
      ),
      safetyTools: campaign.safetyTools,
      contentWarnings: campaign.contentWarnings,
      equipmentNeeded: campaign.equipmentNeeded,
      includeRules: campaign.includeRules,
      includeFAQ: campaign.includeFAQ,
      includeSessionZero: campaign.includeSessionZero,
      includeHomebrew: campaign.includeHomebrew,
      includeSafetyGuidelines: campaign.includeSafetyGuidelines,
      includeCharacterCreation: campaign.includeCharacterCreation,
      includeTableExpectations: campaign.includeTableExpectations,
      tablePlayers,
    },
  };
}

export async function getFeaturedRecruitmentCampaigns(_req: Request, res: Response): Promise<void> {
  const campaigns = await prisma.campaign.findMany({
    where: {
      discoverability: CampaignDiscoverability.PUBLIC,
      isLookingForGroup: true,
    },
    select: selectPublicRecruitmentCampaign(),
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const eligible = campaigns
    .map(mapRecruitmentCampaign)
    .filter((campaign) => !campaign.recruitment.isFull);

  if (eligible.length === 0) {
    res.json({ campaigns: [] });
    return;
  }
  const first = eligible[0];
  const remainder = shuffle(eligible.slice(1));
  const targetCount = Math.min(5, Math.max(3, eligible.length));
  res.json({
    campaigns: [first, ...remainder.slice(0, Math.max(0, targetCount - 1))],
  });
}

function parsePositiveInt(raw: unknown, fallback: number, max: number): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(max, parsed);
}

export async function getAllRecruitmentCampaigns(req: Request, res: Response): Promise<void> {
  const page = parsePositiveInt(req.query.page, 1, 1000);
  const limit = parsePositiveInt(req.query.limit, 12, 48);
  const skip = (page - 1) * limit;
  const gameSystemRaw = typeof req.query.gameSystem === 'string' ? req.query.gameSystem : undefined;
  const gameSystem = gameSystemRaw ? normalizeGameSystemSlug(gameSystemRaw) : undefined;
  if (gameSystem && !isValidGameSystemSlug(gameSystem)) {
    res.status(400).json({ error: 'Invalid game system filter.' });
    return;
  }
  const tool = typeof req.query.externalTool === 'string' ? req.query.externalTool : undefined;
  const genreThemeFilters = parseGenreThemeFilterQuery(req.query.genreThemes);

  const where = {
    discoverability: CampaignDiscoverability.PUBLIC,
    isLookingForGroup: true,
    ...(gameSystem ? { gameSystem } : {}),
  };

  const select = selectPublicRecruitmentCampaign();
  const orderBy = { createdAt: 'desc' as const };

  function applyPostFilters(mapped: ReturnType<typeof mapRecruitmentCampaign>[]) {
    let campaigns = mapped.filter((entry) => !entry.recruitment.isFull);
    if (genreThemeFilters.length > 0) {
      campaigns = campaigns.filter((entry) =>
        campaignMatchesGenreThemeFilter(entry.recruitment.genreThemes, genreThemeFilters),
      );
    }
    if (tool) {
      const normalized = tool.trim().toLowerCase();
      campaigns = campaigns.filter((entry) =>
        entry.recruitment.externalTools.some((value: string) => value.toLowerCase() === normalized),
      );
    }
    return campaigns;
  }

  if (genreThemeFilters.length > 0) {
    const rows = await prisma.campaign.findMany({ where, select, orderBy });
    const filtered = applyPostFilters(rows.map(mapRecruitmentCampaign));
    const total = filtered.length;
    const campaigns = filtered.slice(skip, skip + limit);
    res.json({
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
    return;
  }

  const [rows, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      select,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.campaign.count({ where }),
  ]);
  const campaigns = applyPostFilters(rows.map(mapRecruitmentCampaign));

  res.json({
    campaigns,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}

export async function getRecruitmentLobbyBySlug(req: Request, res: Response): Promise<void> {
  const slug = String(req.params.handle ?? '').trim();
  const campaign = await prisma.campaign.findFirst({
    where: {
      handle: slug,
      discoverability: CampaignDiscoverability.PUBLIC,
      isLookingForGroup: true,
    },
    select: {
      ...selectPublicRecruitmentCampaign(),
    },
  });
  if (!campaign) {
    res.status(404).json({ error: 'Recruitment lobby not found' });
    return;
  }
  const mapped = mapRecruitmentCampaign(campaign);
  const enabledDocs = {
    tableExpectations: mapped.recruitment.includeTableExpectations,
    rules: mapped.recruitment.includeRules,
    faq: mapped.recruitment.includeFAQ,
    sessionZero: mapped.recruitment.includeSessionZero,
    homebrew: mapped.recruitment.includeHomebrew,
    safetyGuidelines: mapped.recruitment.includeSafetyGuidelines,
    characterCreation: mapped.recruitment.includeCharacterCreation,
  } as const;
  const aliasesToLoad = new Set<string>();
  for (const [key, isEnabled] of Object.entries(enabledDocs)) {
    if (!isEnabled) continue;
    for (const alias of RECRUITMENT_DOC_ALIASES[key as keyof typeof RECRUITMENT_DOC_ALIASES]) {
      aliasesToLoad.add(alias);
    }
  }

  // SQLite does not support Prisma `mode: 'insensitive'` — match normalized titles in memory.
  const normalizedAliasSet = new Set(
    Array.from(aliasesToLoad).map((alias) => normalizeRecruitmentDocTitle(alias)),
  );
  const pages =
    aliasesToLoad.size > 0
      ? await prisma.wikiPage.findMany({
          where: { campaignId: campaign.id },
          select: { title: true, blocks: true },
        })
      : [];
  const docsByTitle = new Map<string, string>();
  for (const page of pages) {
    const key = normalizeRecruitmentDocTitle(page.title);
    if (!normalizedAliasSet.has(key) || docsByTitle.has(key)) continue;
    docsByTitle.set(key, extractMarkdownFromBlocks(page.blocks));
  }
  const resolveDocByAliases = (
    enabled: boolean,
    aliases: readonly string[],
  ): string | null => {
    if (!enabled) return null;
    for (const alias of aliases) {
      const matched = docsByTitle.get(normalizeRecruitmentDocTitle(alias));
      if (matched) return matched;
    }
    return null;
  };
  const docs = {
    tableExpectations: resolveDocByAliases(
      mapped.recruitment.includeTableExpectations,
      RECRUITMENT_DOC_ALIASES.tableExpectations,
    ),
    rules: resolveDocByAliases(mapped.recruitment.includeRules, RECRUITMENT_DOC_ALIASES.rules),
    faq: resolveDocByAliases(mapped.recruitment.includeFAQ, RECRUITMENT_DOC_ALIASES.faq),
    sessionZero: resolveDocByAliases(
      mapped.recruitment.includeSessionZero,
      RECRUITMENT_DOC_ALIASES.sessionZero,
    ),
    homebrew: resolveDocByAliases(
      mapped.recruitment.includeHomebrew,
      RECRUITMENT_DOC_ALIASES.homebrew,
    ),
    safetyGuidelines: resolveDocByAliases(
      mapped.recruitment.includeSafetyGuidelines,
      RECRUITMENT_DOC_ALIASES.safetyGuidelines,
    ),
    characterCreation: resolveDocByAliases(
      mapped.recruitment.includeCharacterCreation,
      RECRUITMENT_DOC_ALIASES.characterCreation,
    ),
  };

  res.json({
    campaign: mapped,
    documentation: docs,
  });
}
