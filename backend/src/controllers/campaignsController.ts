import type { Response } from 'express';
import { Prisma, type FantasyCalendar } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { toInputJsonValue } from '../lib/inputJsonValue.js';
import { env } from '../config/env.js';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import {
  buildActorFromAclContext,
  canModifyCampaign,
  canModifyCampaignAsGamemaster,
  isCampaignOwner,
  normalizeCampaignMemberRole,
} from '../lib/acl.js';
import { can } from '../../../shared/campaignPolicy/policy.js';
import { CampaignCapabilities } from '../../../shared/campaignPolicy/capabilities.js';
import {
  CampaignDiscoverability,
  discoverabilityWithLfg,
  isValidDiscoverability,
  normalizeDiscoverability,
} from '../../../shared/campaignPolicy/discoverability.js';
import { seedWikiSkeleton } from '../lib/seedWiki.js';
import { deleteCampaignAssetFiles, deleteUploadedFile, deleteUploadedFileSafe } from '../lib/assetFiles.js';
import {
  applyFantasyCalendarImport,
  buildFantasyCalendarImportPreview,
  FantasyCalendarImportError,
  parseFantasyCalendarExport,
} from '../lib/fantasyCalendarImport.js';
import { generateHandle, isValidHandle, makeUniqueHandle } from '../lib/handleUtils.js';
import { getDefaultSidebarConfig, isSidebarConfigBlank, normalizeSidebarConfig } from '../lib/sidebarConfig.js';
import { enrichSidebarConfigWithIconUrls } from '../lib/sidebarIconEnrich.js';
import { getDefaultDashboardConfig } from '../lib/dashboardConfig.js';
import { DEFAULT_GAME_SYSTEM_SLUG } from '../lib/gameSystems.js';
import { validateGameSystemFields, resolveGameSystemLabel } from '../lib/gameSystemValidation.js';
import {
  CampaignMemberRoles,
  type CampaignMemberRole,
} from '../types/domain.js';
import {
  sanitizeRecruitmentInt,
  sanitizeRecruitmentStringArray,
  parseRecruitmentStringArray,
  sanitizeRecruitmentText,
} from '../lib/recruitment.js';
import { extractHeroImageUrl, parseTableStyleTags } from '../lib/recruitmentListing.js';
import { sanitizeGenreThemes } from '../lib/campaignThemeValidation.js';
import { applyUserCampaignDefaults } from '../lib/applyUserCampaignDefaults.js';
import { sanitizeUserDefaultsImportSelection } from '../lib/userCampaignDefaults.js';
import type { UserDefaultsImportSelection } from '../lib/userCampaignDefaults.js';
import { resolveCampaignThemeLabels } from '../lib/campaignThemes.js';
import type {
  CreateCampaignBody,
  UpdateCampaignBody,
} from '../types/api.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import {
  UploadValidationError,
  validateWizardUploadFile,
} from '../lib/uploadValidation.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import {
  buildCalendarStates,
  parseAdvanceTimePayload,
  serializeEpochMinute,
} from '../lib/timeTracking.js';
import { resolveUserDisplayName } from '../lib/userDisplay.js';
import { logCampaignActivity } from '../lib/campaignActivity.js';
import {
  CoreDomainEvents,
  dispatchDomainEvent,
  toCalendarAdvancedDto,
} from '../lib/domainEvents/index.js';
import {
  computeNextEpochMinute,
  NoMasterCalendarError,
} from '../lib/computeTimeAdvance.js';
import {
  buildGlobalTimeAdvanceContext,
  GlobalTimeHookExecutionError,
  isGlobalTimeHooksRunning,
  runGlobalTimeHooks,
} from '../lib/globalTimeHooks/index.js';
import {
  createBackgroundTask,
  updateBackgroundTask,
} from '../lib/taskRegistry.js';
import {
  enqueueCampaignBackupRestore,
  enqueueCampaignBootstrap,
  enqueueCampaignImportZip,
} from '../lib/importQueue.js';
import type { WizardGeneratorSpec } from '../lib/campaignGenerators.js';
import {
  legacyGeneratorToBootstrap,
  parseCampaignBootstrapSpec,
  type CampaignBootstrapSpec,
} from '../lib/campaignBootstrap.js';
import { isSampleDataEnabled } from '../config/env.js';
import { resolveSampleDataSpec } from '../lib/sampleData/sampleDataRegistry.js';
import { validateContentPackRequest } from '../lib/sampleData/contentPackRegistry.js';
import { buildImportStagingAssetData } from '../lib/importStagingRetention.js';
import { generateInviteToken } from '../lib/inviteToken.js';
import { sanitizeThemePreset } from '../lib/themePresets.js';
import {
  appearanceProfileToThemePreset,
  resolveCampaignAppearanceProfile,
  sanitizeAppearanceProfile,
  serializeAppearanceProfileForApi,
} from '../lib/appearanceProfile.js';
import { duplicateCampaign } from '../lib/campaignClone.js';
import { parseDuplicateCampaignBody } from '../lib/campaignCloneSanitize.js';

async function resolveCampaignIdFromParam(param: string): Promise<string | null> {
  const key = param.trim();
  if (!key) return null;

  const byId = await prisma.campaign.findUnique({
    where: { id: key },
    select: { id: true },
  });
  if (byId) return byId.id;

  const bySlug = await prisma.campaign.findUnique({
    where: { handle: key },
    select: { id: true },
  });
  return bySlug?.id ?? null;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function campaignSelect() {
  return {
    id: true,
    name: true,
    handle: true,
    description: true,
    campaignOwnerUserId: true,
    discoverability: true,
    language: true,
    gameSystem: true,
    customGameSystemName: true,
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
    recruitmentTagline: true,
    recruitmentPremise: true,
    recruitmentBeforeApplyNote: true,
    scheduleTimezone: true,
    campaignFormat: true,
    experienceRequired: true,
    ageRestriction: true,
    levelRange: true,
    tableStyleTags: true,
    allowPlayerChronologyManagement: true,
    sidebarConfig: true,
    dashboardConfig: true,
    themePreset: true,
    appearanceProfile: true,
    archivedAt: true,
    createdAt: true,
    updatedAt: true,
  } as const;
}

function serializeCampaignRecruitmentFields<T extends Record<string, unknown>>(campaign: T): T {
  const appearance = resolveCampaignAppearanceProfile({
    appearanceProfile: campaign.appearanceProfile,
    themePreset:
      typeof campaign.themePreset === 'string' ? campaign.themePreset : 'dark',
  });
  const gameSystem =
    typeof campaign.gameSystem === 'string' ? campaign.gameSystem : null;
  const customGameSystemName =
    typeof campaign.customGameSystemName === 'string'
      ? campaign.customGameSystemName
      : null;
  return {
    ...campaign,
    isArchived: campaign.archivedAt != null,
    genreThemes: parseRecruitmentStringArray(campaign.genreThemes),
    genreThemeLabels: resolveCampaignThemeLabels(
      parseRecruitmentStringArray(campaign.genreThemes),
    ),
    externalTools: parseRecruitmentStringArray(campaign.externalTools),
    tableStyleTags: parseTableStyleTags(campaign.tableStyleTags),
    recruitmentSettings: {
      type: (campaign.campaignFormat as string | null | undefined) ?? null,
      campaignFormat: (campaign.campaignFormat as string | null | undefined) ?? null,
      experienceRequired:
        (campaign.experienceRequired as string | null | undefined) ?? null,
      ageRestriction: (campaign.ageRestriction as string | null | undefined) ?? null,
      levelRange: (campaign.levelRange as string | null | undefined) ?? null,
      language: (campaign.language as string | null | undefined) ?? null,
    },
    appearanceProfile: serializeAppearanceProfileForApi(appearance),
    gameSystemLabel: resolveGameSystemLabel(gameSystem, customGameSystemName),
  };
}

export function serializeCampaignForList<T extends Record<string, unknown>>(
  campaign: T,
): T & { heroImageUrl: string | null; isArchived: boolean } {
  const heroImageUrl = extractHeroImageUrl(campaign.dashboardConfig);
  const serialized = serializeCampaignRecruitmentFields(campaign);
  const { dashboardConfig: _dashboardConfig, ...rest } = serialized as T & {
    dashboardConfig?: unknown;
  };
  return { ...rest, heroImageUrl } as T & { heroImageUrl: string | null; isArchived: boolean };
}

export function computePublicHost(
  members: Array<{
    role: CampaignMemberRole | string;
    user: { id: string; email: string; displayName: string | null; avatarUrl: string | null };
  }>,
) {
  const gmMember = members.find((m) => m.role === CampaignMemberRoles.GAMEMASTER);
  const writerMember = members.find((m) => m.role === CampaignMemberRoles.WRITER);
  const chosen = gmMember ?? writerMember;

  if (!chosen) return null;

  return {
    id: chosen.user.id,
    label: resolveUserDisplayName(chosen.user),
    avatarUrl: chosen.user.avatarUrl,
  };
}

export async function listPublicCampaigns(
  _req: unknown,
  res: Response,
): Promise<void> {
  const campaigns = await prisma.campaign.findMany({
    where: { discoverability: CampaignDiscoverability.PUBLIC },
    select: {
      ...campaignSelect(),
      members: {
        select: {
          role: true,
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  res.json({
    campaigns: campaigns.map((c) => {
      const host = computePublicHost(c.members);
      const { members: _members, ...rest } = c as typeof c & { members: unknown };
      return {
        ...serializeCampaignForList(rest as any),
        role: null,
        isMember: false,
        host,
      };
    }),
  });
}

export async function listCampaigns(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const memberships = await prisma.campaignMember.findMany({
    where: {
      userId: req.user!.id,
      campaign: { archivedAt: null },
    },
    include: {
      campaign: { select: campaignSelect() },
    },
    orderBy: { campaign: { name: 'asc' } },
  });

  const memberCampaignIds = memberships.map((m) => m.campaignId);

  const publicCampaigns = await prisma.campaign.findMany({
    where: {
      discoverability: CampaignDiscoverability.PUBLIC,
      archivedAt: null,
      id: { notIn: memberCampaignIds },
    },
    select: {
      ...campaignSelect(),
      members: {
        select: {
          role: true,
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  res.json({
    campaigns: [
      ...memberships.map((m) => ({
        ...serializeCampaignForList(m.campaign as any),
        role: m.role as CampaignMemberRole,
        isMember: true,
        isCampaignOwner:
          m.campaign.campaignOwnerUserId === req.user!.id,
      })),
      ...publicCampaigns.map((c) => ({
        ...(() => {
          const host = computePublicHost(c.members);
          const { members: _members, ...rest } = c as typeof c & { members: unknown };
          return {
            ...serializeCampaignForList(rest as any),
            role: null,
            isMember: false,
            host,
          };
        })(),
      })),
    ],
  });
}

export async function getCampaign(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  let campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: campaignSelect(),
  });

  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  let sidebarConfig = normalizeSidebarConfig(campaign.sidebarConfig);
  if (isSidebarConfigBlank(campaign.sidebarConfig)) {
    sidebarConfig = normalizeSidebarConfig(null);
    campaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: { sidebarConfig: toInputJsonValue(sidebarConfig) },
      select: campaignSelect(),
    });
  }

  sidebarConfig = await enrichSidebarConfigWithIconUrls(sidebarConfig);

  res.json({
    campaign: {
      ...serializeCampaignRecruitmentFields(campaign as any),
      sidebarConfig,
      role: req.campaign!.role,
      isMember: req.campaign!.isMember,
      isCampaignOwner: req.campaign!.isCampaignOwner,
      campaignOwnerUserId: req.campaign!.campaignOwnerUserId,
      chronologyContributor: req.campaign!.chronologyContributor,
      partyId: req.campaign!.partyId,
      allowPlayerChronologyManagement:
        req.campaign!.allowPlayerChronologyManagement,
    },
  });
}

type WizardImportManifest = {
  themes?: string[];
  importFormat?: 'obsidian' | 'kanka-json';
  folderMappings?: Array<{
    sourceFolderName: string;
    targetModule: string;
    isAutoMatched?: boolean;
  }>;
  userDefaults?: UserDefaultsImportSelection;
  generator?: WizardGeneratorSpec;
  bootstrap?: CampaignBootstrapSpec;
};

function parseWizardGenerator(raw: unknown): WizardGeneratorSpec | null {
  if (!raw || typeof raw !== 'object') return null;
  const root = raw as Record<string, unknown>;
  const pluginId = typeof root.pluginId === 'string' ? root.pluginId.trim() : '';
  const presetId = typeof root.presetId === 'string' ? root.presetId.trim() : '';
  if (!pluginId || !presetId) return null;

  const seed = typeof root.seed === 'string' ? root.seed.trim() : undefined;
  const densityRaw = typeof root.density === 'string' ? root.density.trim() : undefined;
  const density =
    densityRaw === 'quiet' || densityRaw === 'active' || densityRaw === 'obsessive'
      ? densityRaw
      : undefined;

  let attachCampaignPlugins: string[] | undefined;
  if (Array.isArray(root.attachCampaignPlugins)) {
    attachCampaignPlugins = root.attachCampaignPlugins
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean);
  }

  return {
    pluginId,
    presetId,
    ...(seed ? { seed } : {}),
    ...(density ? { density } : {}),
    ...(attachCampaignPlugins?.length ? { attachCampaignPlugins } : {}),
  };
}

function parseWizardImport(body: unknown): WizardImportManifest | null {
  const raw =
    body && typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>).wizardImport
      : null;

  if (!raw) return null;

  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const root = parsed as Record<string, unknown>;

  const themesValue = root.genreThemes ?? root.themes;
  const themes = Array.isArray(themesValue)
    ? themesValue.map((entry) =>
        typeof entry === 'string' ? entry.trim() : String(entry ?? ''),
      )
    : [];

  const mappingsValue = root.folderMappings;
  const folderMappings: Array<{
    sourceFolderName: string;
    targetModule: string;
    isAutoMatched: boolean;
  }> = [];
  if (Array.isArray(mappingsValue)) {
    for (const entry of mappingsValue) {
      if (!entry || typeof entry !== 'object') continue;
      const row = entry as Record<string, unknown>;
      const sourceFolderName =
        typeof row.sourceFolderName === 'string'
          ? row.sourceFolderName.trim()
          : '';
      const targetModule =
        typeof row.targetModule === 'string' ? row.targetModule.trim() : '';
      if (!sourceFolderName || !targetModule) continue;
      folderMappings.push({
        sourceFolderName,
        targetModule,
        isAutoMatched: Boolean(row.isAutoMatched),
      });
    }
  }

  const userDefaults = sanitizeUserDefaultsImportSelection(root.userDefaults);
  const hasUserDefaults =
    (userDefaults.docs?.length ?? 0) > 0 || userDefaults.recruitmentPreferences === true;

  const generator = parseWizardGenerator(root.generator);
  const bootstrap = parseCampaignBootstrapSpec(root.bootstrap);
  const importFormatRaw = root.importFormat;
  const importFormat =
    importFormatRaw === 'kanka-json' || importFormatRaw === 'obsidian'
      ? importFormatRaw
      : undefined;

  if (
    themes.length === 0 &&
    folderMappings.length === 0 &&
    !hasUserDefaults &&
    !generator &&
    !bootstrap &&
    !importFormat
  ) {
    return null;
  }

  return {
    ...(themes.length > 0 && { themes }),
    ...(importFormat ? { importFormat } : {}),
    ...(folderMappings.length > 0 && { folderMappings }),
    ...(hasUserDefaults ? { userDefaults } : {}),
    ...(generator ? { generator } : {}),
    ...(bootstrap ? { bootstrap } : {}),
  };
}

function resolveWizardBootstrapSpec(
  wizardImport: WizardImportManifest,
): CampaignBootstrapSpec | null {
  if (wizardImport.bootstrap) return wizardImport.bootstrap;
  if (wizardImport.generator) return legacyGeneratorToBootstrap(wizardImport.generator);
  return null;
}

export async function createCampaign(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const { name, description, discoverability, language, gameSystem, customGameSystemName } =
    req.body as CreateCampaignBody;
  const wizardImport = parseWizardImport(req.body);

  const filesRaw = (req as AuthenticatedRequest & { files?: unknown }).files;
  const files =
    filesRaw && typeof filesRaw === 'object' && !Array.isArray(filesRaw)
      ? (filesRaw as Record<string, Express.Multer.File[] | undefined>)
      : {};
  const coverImageFile = Array.isArray(files.coverImage)
    ? files.coverImage[0]
    : undefined;
  const markdownZipFile = Array.isArray(files.markdownZipFile)
    ? files.markdownZipFile[0]
    : undefined;
  const backupZipFile = Array.isArray(files.backupZipFile)
    ? files.backupZipFile[0]
    : undefined;
  const calendarConfigFile = Array.isArray(files.calendarConfigFile)
    ? files.calendarConfigFile[0]
    : undefined;

  if (!name?.trim()) {
    res.status(400).json({ error: 'Campaign name is required' });
    return;
  }

  const bootstrapSpec = wizardImport ? resolveWizardBootstrapSpec(wizardImport) : null;

  if (bootstrapSpec?.kind === 'sampleData') {
    if (!isSampleDataEnabled()) {
      res.status(403).json({
        error: 'Sample Data is disabled. Set ENABLE_SAMPLE_DATA=true for developer fixtures.',
      });
      return;
    }
    const resolved = resolveSampleDataSpec({
      kind: 'sampleData',
      profileId: bootstrapSpec.profileId ?? '',
      ...(bootstrapSpec.seed ? { seed: bootstrapSpec.seed } : {}),
      ...(bootstrapSpec.density ? { density: bootstrapSpec.density } : {}),
    });
    if (!resolved.ok) {
      res.status(400).json({ error: resolved.error });
      return;
    }
  } else if (bootstrapSpec?.kind === 'contentPack') {
    const validated = await validateContentPackRequest({
      kind: 'contentPack',
      pluginId: bootstrapSpec.pluginId ?? '',
      packId: bootstrapSpec.packId ?? '',
    });
    if (!validated.ok) {
      res.status(400).json({ error: validated.error });
      return;
    }
  } else if (wizardImport?.generator) {
    const legacyBootstrap = legacyGeneratorToBootstrap(wizardImport.generator);
    if (!legacyBootstrap) {
      res.status(400).json({
        error:
          'Campaign generators are retired. Choose a Content Pack or Sample Data profile instead.',
      });
      return;
    }
  }

  let contentPackPrefill: Awaited<ReturnType<typeof validateContentPackRequest>> | null = null;
  if (bootstrapSpec?.kind === 'contentPack') {
    contentPackPrefill = await validateContentPackRequest({
      kind: 'contentPack',
      pluginId: bootstrapSpec.pluginId ?? '',
      packId: bootstrapSpec.packId ?? '',
    });
  }

  const normalizedLanguage = language?.trim() ?? 'English';
  const gameSystemValidation = validateGameSystemFields(
    {
      gameSystem: gameSystem ?? DEFAULT_GAME_SYSTEM_SLUG,
      customGameSystemName,
    },
    { required: true },
  );
  if (!gameSystemValidation.ok) {
    res.status(400).json({ error: gameSystemValidation.error });
    return;
  }
  const { gameSystem: normalizedGameSystem, customGameSystemName: normalizedCustomGameSystemName } =
    gameSystemValidation.value;
  const normalizedDiscoverability = isValidDiscoverability(discoverability)
    ? discoverability
    : CampaignDiscoverability.PRIVATE;

  const wizardFiles = [
    coverImageFile,
    markdownZipFile,
    backupZipFile,
    calendarConfigFile,
  ].filter((f): f is Express.Multer.File => Boolean(f));

  try {
    for (const file of wizardFiles) {
      await validateWizardUploadFile(file);
    }
  } catch (err) {
    for (const file of wizardFiles) {
      deleteUploadedFile(file.filename);
    }
    if (err instanceof UploadValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }

  const importTask = markdownZipFile
    ? createBackgroundTask({
        taskName: 'Obsidian ZIP Ingestion',
        targetCampaign: name?.trim() || null,
        type: 'AD_HOC',
        status: 'PROCESSING',
        progress: 5,
        abortable: false,
        meta: { requestedByUserId: req.user!.id },
      })
    : null;

  const restoreTask = backupZipFile
    ? createBackgroundTask({
        taskName: 'Esiana Backup Restore',
        targetCampaign: name?.trim() || null,
        type: 'AD_HOC',
        status: 'PROCESSING',
        progress: 5,
        abortable: false,
        meta: { requestedByUserId: req.user!.id },
      })
    : null;

  const bootstrapTask = bootstrapSpec
    ? createBackgroundTask({
        taskName:
          bootstrapSpec.kind === 'contentPack'
            ? 'Importing content pack…'
            : 'Generating sample data…',
        targetCampaign: name?.trim() || null,
        type: 'AD_HOC',
        status: 'PROCESSING',
        progress: 5,
        abortable: false,
        meta: {
          requestedByUserId: req.user!.id,
          kind: bootstrapSpec.kind,
          ...(bootstrapSpec.kind === 'sampleData' && bootstrapSpec.profileId
            ? { profileId: bootstrapSpec.profileId }
            : {}),
          ...(bootstrapSpec.kind === 'contentPack' && bootstrapSpec.packId
            ? { packId: bootstrapSpec.packId, pluginId: bootstrapSpec.pluginId }
            : {}),
        },
      })
    : null;

  let parsedCalendarConfig: ReturnType<typeof parseFantasyCalendarExport> | null = null;
  if (calendarConfigFile) {
    try {
      const filePath = path.join(env.uploadsDir, calendarConfigFile.filename);
      const text = await fsPromises.readFile(filePath, 'utf8');
      parsedCalendarConfig = parseFantasyCalendarExport(JSON.parse(text));
    } catch (error) {
      if (error instanceof FantasyCalendarImportError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      if (error instanceof SyntaxError) {
        res.status(400).json({ error: 'Unable to parse calendar config JSON file.' });
        return;
      }
      console.error('Error reading calendar config file:', error);
      res.status(400).json({ error: 'Failed to read calendar config file.' });
      return;
    } finally {
      deleteUploadedFile(calendarConfigFile.filename);
    }
  }

  try {
    // Generate initial slug from campaign name
    let baseHandle = generateHandle(name.trim());

    const campaign = await prisma.$transaction(async (tx) => {
      // Check for slug conflicts and make unique if needed
      const existingCount = await tx.campaign.count({
        where: { handle: { startsWith: baseHandle } },
      });

      let finalHandle = baseHandle;
      if (existingCount > 0) {
        const existingHandles = new Set(
          (
            await tx.campaign.findMany({
              where: { handle: { startsWith: baseHandle } },
              select: { handle: true },
            })
          ).map((c) => c.handle),
        );
        finalHandle = makeUniqueHandle(baseHandle, existingHandles);
      }

      const packPrefill =
        contentPackPrefill?.ok === true ? contentPackPrefill.validated : null;

      const wizardGenreThemes =
        wizardImport?.themes && wizardImport.themes.length > 0
          ? sanitizeGenreThemes(wizardImport.themes)
          : packPrefill?.pack.genreThemes?.length
            ? sanitizeGenreThemes(packPrefill.pack.genreThemes)
            : undefined;

      const campaignGameSystem = packPrefill?.pack.gameSystem ?? normalizedGameSystem;

      const created = await tx.campaign.create({
        data: {
          name: name.trim(),
          handle: finalHandle,
          inviteToken: generateInviteToken(),
          campaignOwnerUserId: req.user!.id,
          description: description?.trim() ?? null,
          discoverability: normalizedDiscoverability,
          language: normalizedLanguage,
          gameSystem: campaignGameSystem,
          customGameSystemName: normalizedCustomGameSystemName,
          ...(packPrefill ? { campaignFormat: packPrefill.recruitmentCampaignFormat } : {}),
          ...(wizardGenreThemes && wizardGenreThemes.length > 0
            ? { genreThemes: wizardGenreThemes as unknown as object }
            : {}),
          sidebarConfig: toInputJsonValue(getDefaultSidebarConfig()),
          dashboardConfig: toInputJsonValue(getDefaultDashboardConfig()),
        },
        select: campaignSelect(),
      });

      const partyId = await (async () => {
        const { ensureDefaultPartyForCampaign, linkCampaignMembersToDefaultParty } =
          await import('../lib/partyService.js');
        const id = await ensureDefaultPartyForCampaign(
          tx,
          created.id,
          created.name,
        );
        await linkCampaignMembersToDefaultParty(tx, created.id, id);
        return id;
      })();

      await tx.campaignMember.create({
        data: {
          userId: req.user!.id,
          campaignId: created.id,
          role: CampaignMemberRoles.GAMEMASTER,
          chronologyContributor: false,
          partyId,
        },
      });

      await seedWikiSkeleton(tx, created.id);

      if (wizardImport?.userDefaults && !backupZipFile) {
        await applyUserCampaignDefaults(
          tx,
          req.user!.id,
          created.id,
          wizardImport.userDefaults,
        );
      }

      if (backupZipFile) {
        await tx.wikiPage.deleteMany({ where: { campaignId: created.id } });
      }

      // Persist uploaded artifacts as assets associated with this campaign.
      let coverImageAssetId: string | null = null;
      let markdownZipAssetId: string | null = null;
      let backupZipAssetId: string | null = null;

      if (coverImageFile) {
        const coverPath = path.join(env.uploadsDir, coverImageFile.filename);
        const coverBuffer = await fsPromises.readFile(coverPath);
        const { ingestImageBuffer } = await import('../lib/assetIngest.js');
        const ingested = await ingestImageBuffer({
          campaignId: created.id,
          buffer: coverBuffer,
          type: 'campaign-cover',
          uploadedByUserId: req.user!.id,
        });
        coverImageAssetId = ingested.asset.id;
        await deleteUploadedFileSafe(coverImageFile.filename);
      }

      if (markdownZipFile) {
        if (importTask) {
          updateBackgroundTask(importTask.id, { progress: 25 });
        }
        // Normalize filename to campaign-[campaignId]-import.zip
        const nextFilename = `campaign-${created.id}-import.zip`;
        const currentPath = path.join(env.uploadsDir, markdownZipFile.filename);
        const nextPath = path.join(env.uploadsDir, nextFilename);
        try {
          await fsPromises.rename(currentPath, nextPath);
        } catch (error) {
          console.error(
            'Error renaming markdown import ZIP for campaign',
            created.id,
            error,
          );
        }

        const asset = await tx.asset.create({
          data: buildImportStagingAssetData({
            campaignId: created.id,
            url: `/uploads/${nextFilename}`,
            type: 'campaign-import-zip',
          }) as any,
        });
        markdownZipAssetId = asset.id;
        if (importTask) {
          updateBackgroundTask(importTask.id, {
            progress: 75,
            metaMerge: { markdownZipAssetId },
          });
        }
      }

      if (backupZipFile) {
        if (restoreTask) {
          updateBackgroundTask(restoreTask.id, { progress: 25 });
        }
        const nextFilename = `campaign-${created.id}-backup.zip`;
        const currentPath = path.join(env.uploadsDir, backupZipFile.filename);
        const nextPath = path.join(env.uploadsDir, nextFilename);
        try {
          await fsPromises.rename(currentPath, nextPath);
        } catch (error) {
          console.error(
            'Error renaming backup ZIP for campaign',
            created.id,
            error,
          );
        }

        const asset = await tx.asset.create({
          data: buildImportStagingAssetData({
            campaignId: created.id,
            url: `/uploads/${nextFilename}`,
            type: 'campaign-backup-zip',
          }) as any,
        });
        backupZipAssetId = asset.id;
        if (restoreTask) {
          updateBackgroundTask(restoreTask.id, {
            progress: 75,
            metaMerge: { backupZipAssetId },
          });
        }
      }

      if (parsedCalendarConfig) {
        await applyFantasyCalendarImport(tx, created.id, parsedCalendarConfig);
      }

      // Optionally, embed import manifest + asset references into dashboardConfig JSON.
      if (
        !wizardImport &&
        !coverImageAssetId &&
        !markdownZipAssetId &&
        !backupZipAssetId
      ) {
        return created;
      }

      const importManifest = {
        ...(wizardImport ?? {}),
        ...(bootstrapSpec ? { bootstrap: bootstrapSpec } : {}),
        assets: {
          ...(coverImageAssetId ? { coverImageAssetId } : {}),
          ...(markdownZipAssetId ? { markdownZipAssetId } : {}),
          ...(backupZipAssetId ? { backupZipAssetId } : {}),
        },
        ...(bootstrapTask
          ? { bootstrapTaskId: bootstrapTask.id, generatorTaskId: bootstrapTask.id }
          : {}),
      };

      const baseDashboardConfig =
        created.dashboardConfig &&
        typeof created.dashboardConfig === 'object' &&
        !Array.isArray(created.dashboardConfig)
          ? created.dashboardConfig
          : getDefaultDashboardConfig();
      const nextDashboardConfig = {
        ...baseDashboardConfig,
        importManifest,
      };

      const updated = await tx.campaign.update({
        where: { id: created.id },
        data: {
          dashboardConfig: toInputJsonValue(nextDashboardConfig),
        },
        select: campaignSelect(),
      });

      return updated;
    });

    if (importTask) {
      updateBackgroundTask(importTask.id, {
        progress: 15,
        metaMerge: { phase: 'queued', requestedByUserId: req.user!.id },
      });
      enqueueCampaignImportZip(campaign.id, importTask.id);
    }

    if (restoreTask) {
      updateBackgroundTask(restoreTask.id, {
        progress: 15,
        metaMerge: { phase: 'queued-restore', requestedByUserId: req.user!.id },
      });
      enqueueCampaignBackupRestore(campaign.id, restoreTask.id);
    }

    if (bootstrapTask && bootstrapSpec) {
      updateBackgroundTask(bootstrapTask.id, {
        progress: 15,
        metaMerge: { phase: 'queued-bootstrap', requestedByUserId: req.user!.id },
      });
      enqueueCampaignBootstrap(
        campaign.id,
        req.user!.id,
        bootstrapTask.id,
        bootstrapSpec,
      );
    }

    dispatchDomainEvent({
      type: CoreDomainEvents.CAMPAIGN_CREATED,
      campaignId: campaign.id,
      payload: {
        campaignId: campaign.id,
        handle: campaign.handle,
        ...(bootstrapSpec ? { bootstrap: bootstrapSpec } : {}),
        ...(wizardImport?.generator ? { generator: wizardImport.generator } : {}),
      },
    });

    res.status(201).json({
      campaign: {
        ...serializeCampaignRecruitmentFields(campaign as any),
        sidebarConfig: normalizeSidebarConfig(campaign.sidebarConfig),
        role: CampaignMemberRoles.GAMEMASTER,
        isMember: true,
      },
    });
  } catch (error) {
    if (importTask) {
      updateBackgroundTask(importTask.id, {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Import task failed',
      });
    }
    if (restoreTask) {
      updateBackgroundTask(restoreTask.id, {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Restore task failed',
      });
    }
    if (bootstrapTask) {
      updateBackgroundTask(bootstrapTask.id, {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Bootstrap task failed',
      });
    }
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
}

export async function updateCampaign(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const campaignKey = String(req.params.id);
  const campaignId = await resolveCampaignIdFromParam(campaignKey);
  if (!campaignId) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const body = req.body as UpdateCampaignBody;

  const membership = await prisma.campaignMember.findUnique({
    where: {
      userId_campaignId: {
        userId: req.user!.id,
        campaignId,
      },
    },
    select: { role: true, chronologyContributor: true },
  });

  const role = normalizeCampaignMemberRole(membership?.role ?? '');
  const campaignRow = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      campaignOwnerUserId: true,
      discoverability: true,
      isLookingForGroup: true,
      allowPlayerChronologyManagement: true,
    },
  });
  if (!campaignRow || !role) {
    res.status(403).json({ error: 'Forbidden: campaign membership required' });
    return;
  }

  const actor = buildActorFromAclContext({
    userId: req.user!.id,
    membershipRole: role,
    campaignOwnerUserId: campaignRow.campaignOwnerUserId,
    discoverability: campaignRow.discoverability,
    allowPlayerChronologyManagement: campaignRow.allowPlayerChronologyManagement,
    chronologyContributor: membership?.chronologyContributor ?? false,
  });

  const touchesVisibility =
    body.discoverability !== undefined || body.isLookingForGroup !== undefined;

  if (touchesVisibility && !can(actor, CampaignCapabilities.CAMPAIGN_VISIBILITY_EDIT)) {
    res.status(403).json({
      error: 'Forbidden: only the campaign owner may change discoverability',
    });
    return;
  }

  if (!canModifyCampaign(actor)) {
    res.status(403).json({
      error: 'Forbidden: gamemaster role required to update campaign settings',
    });
    return;
  }

  let nextGameSystem: string | null | undefined;
  let nextCustomGameSystemName: string | null | undefined;
  if (body.gameSystem !== undefined || body.customGameSystemName !== undefined) {
    const existing = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { gameSystem: true, customGameSystemName: true },
    });
    const gameSystemValidation = validateGameSystemFields({
      gameSystem:
        body.gameSystem !== undefined ? body.gameSystem : existing?.gameSystem,
      customGameSystemName:
        body.customGameSystemName !== undefined
          ? body.customGameSystemName
          : existing?.customGameSystemName,
    });
    if (!gameSystemValidation.ok) {
      res.status(400).json({ error: gameSystemValidation.error });
      return;
    }
    nextGameSystem = gameSystemValidation.value.gameSystem;
    nextCustomGameSystemName = gameSystemValidation.value.customGameSystemName;
  }

  const currentSession = sanitizeRecruitmentInt(body.currentSession);
  if (body.currentSession !== undefined && currentSession === undefined) {
    res.status(400).json({ error: 'currentSession must be a non-negative integer' });
    return;
  }

  const maxSeats = sanitizeRecruitmentInt(body.maxSeats);
  if (body.maxSeats !== undefined && maxSeats === undefined) {
    res.status(400).json({ error: 'maxSeats must be a non-negative integer' });
    return;
  }
  const maxPlayers = sanitizeRecruitmentInt(body.maxPlayers, { min: 1, max: 99 });
  if (body.maxPlayers !== undefined && maxPlayers === undefined) {
    res.status(400).json({ error: 'maxPlayers must be an integer between 1 and 99' });
    return;
  }
  const genreThemes =
    body.genreThemes !== undefined
      ? sanitizeGenreThemes(body.genreThemes)
      : undefined;
  const externalTools =
    body.externalTools !== undefined
      ? sanitizeRecruitmentStringArray(body.externalTools)
      : undefined;

  const nestedSettings =
    body.recruitmentSettings && typeof body.recruitmentSettings === 'object'
      ? body.recruitmentSettings
      : null;

  const tableStyleTags =
    body.tableStyleTags !== undefined
      ? parseTableStyleTags(body.tableStyleTags)
      : undefined;

  const themePreset =
    body.themePreset !== undefined ? sanitizeThemePreset(body.themePreset) : undefined;
  if (body.themePreset !== undefined && themePreset === undefined) {
    res.status(400).json({
      error: 'Invalid theme preset. Valid values are light, dark, auto, fantasy, cyberpunk, parchment.',
    });
    return;
  }

  let appearanceProfile =
    body.appearanceProfile !== undefined
      ? sanitizeAppearanceProfile(body.appearanceProfile)
      : undefined;
  if (body.appearanceProfile !== undefined && appearanceProfile === undefined) {
    res.status(400).json({
      error: 'appearanceProfile must be a valid object or null',
    });
    return;
  }

  let themePresetFromProfile: string | undefined;
  if (appearanceProfile) {
    themePresetFromProfile = appearanceProfileToThemePreset(appearanceProfile);
  }

  const nextIsLookingForGroup =
    body.isLookingForGroup !== undefined
      ? Boolean(body.isLookingForGroup)
      : undefined;

  const currentDiscoverability = normalizeDiscoverability(
    campaignRow.discoverability,
  );
  let nextDiscoverability: string | undefined;
  if (body.discoverability !== undefined) {
    if (!isValidDiscoverability(body.discoverability)) {
      res.status(400).json({
        error: 'discoverability must be private, unlisted, or public',
      });
      return;
    }
    nextDiscoverability = body.discoverability;
  }
  if (nextIsLookingForGroup === true) {
    nextDiscoverability = CampaignDiscoverability.PUBLIC;
  } else if (nextDiscoverability !== undefined) {
    nextDiscoverability = discoverabilityWithLfg(
      normalizeDiscoverability(nextDiscoverability),
      nextIsLookingForGroup ?? campaignRow.isLookingForGroup,
    );
  } else if (
    nextIsLookingForGroup === false &&
    currentDiscoverability === CampaignDiscoverability.PUBLIC &&
    campaignRow.isLookingForGroup
  ) {
    // LFG disabled — keep public discoverability unless owner explicitly changes it
    nextDiscoverability = undefined;
  }

  let nextHandle: string | undefined;
  if (body.name !== undefined) {
    try {
      const baseHandle = generateHandle(body.name.trim());
      const existingHandles = new Set(
        (
          await prisma.campaign.findMany({
            where: {
              handle: { startsWith: baseHandle },
              NOT: { id: campaignId },
            },
            select: { handle: true },
          })
        ).map((row) => row.handle),
      );
      nextHandle =
        existingHandles.size > 0
          ? makeUniqueHandle(baseHandle, existingHandles)
          : baseHandle;
    } catch (error) {
      res.status(400).json({
        error:
          error instanceof Error ? error.message : 'Unable to generate campaign slug',
      });
      return;
    }
  }

  const campaign = await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(nextHandle !== undefined && { handle: nextHandle }),
      ...(body.description !== undefined && {
        description: body.description?.trim() ?? null,
      }),
      ...(nextDiscoverability !== undefined && {
        discoverability: nextDiscoverability,
      }),
      ...(body.language !== undefined && {
        language: body.language?.trim() ?? null,
      }),
      ...(nestedSettings?.language !== undefined &&
        body.language === undefined && {
          language:
            typeof nestedSettings.language === 'string'
              ? nestedSettings.language.trim() || null
              : null,
        }),
      ...(body.recruitmentTagline !== undefined && {
        recruitmentTagline: sanitizeRecruitmentText(body.recruitmentTagline, 280),
      }),
      ...(body.recruitmentPremise !== undefined && {
        recruitmentPremise: sanitizeRecruitmentText(body.recruitmentPremise, 12000),
      }),
      ...(body.recruitmentBeforeApplyNote !== undefined && {
        recruitmentBeforeApplyNote: sanitizeRecruitmentText(
          body.recruitmentBeforeApplyNote,
          500,
        ),
      }),
      ...(body.scheduleTimezone !== undefined && {
        scheduleTimezone: sanitizeRecruitmentText(body.scheduleTimezone, 80),
      }),
      ...(body.campaignFormat !== undefined && {
        campaignFormat: sanitizeRecruitmentText(body.campaignFormat),
      }),
      ...(nestedSettings?.type !== undefined &&
        body.campaignFormat === undefined && {
          campaignFormat:
            typeof nestedSettings.type === 'string'
              ? sanitizeRecruitmentText(nestedSettings.type)
              : null,
        }),
      ...(body.experienceRequired !== undefined && {
        experienceRequired: sanitizeRecruitmentText(body.experienceRequired),
      }),
      ...(nestedSettings?.experienceRequired !== undefined &&
        body.experienceRequired === undefined && {
          experienceRequired:
            typeof nestedSettings.experienceRequired === 'string'
              ? sanitizeRecruitmentText(nestedSettings.experienceRequired)
              : null,
        }),
      ...(body.ageRestriction !== undefined && {
        ageRestriction: sanitizeRecruitmentText(body.ageRestriction),
      }),
      ...(nestedSettings?.ageRestriction !== undefined &&
        body.ageRestriction === undefined && {
          ageRestriction:
            typeof nestedSettings.ageRestriction === 'string'
              ? sanitizeRecruitmentText(nestedSettings.ageRestriction)
              : null,
        }),
      ...(body.levelRange !== undefined && {
        levelRange: sanitizeRecruitmentText(body.levelRange),
      }),
      ...(nestedSettings?.levelRange !== undefined &&
        body.levelRange === undefined && {
          levelRange:
            typeof nestedSettings.levelRange === 'string'
              ? sanitizeRecruitmentText(nestedSettings.levelRange)
              : null,
        }),
      ...(tableStyleTags !== undefined && {
        tableStyleTags: tableStyleTags as unknown as object,
      }),
      ...(nextGameSystem !== undefined && { gameSystem: nextGameSystem }),
      ...(nextCustomGameSystemName !== undefined && {
        customGameSystemName: nextCustomGameSystemName,
      }),
      ...(nextIsLookingForGroup !== undefined && {
        isLookingForGroup: nextIsLookingForGroup,
      }),
      ...(body.scheduleFrequency !== undefined && {
        scheduleFrequency: sanitizeRecruitmentText(body.scheduleFrequency),
      }),
      ...(body.scheduleDay !== undefined && {
        scheduleDay: sanitizeRecruitmentText(body.scheduleDay),
      }),
      ...(body.scheduleTime !== undefined && {
        scheduleTime: sanitizeRecruitmentText(body.scheduleTime),
      }),
      ...(currentSession !== undefined && { currentSession }),
      ...(body.sessionDuration !== undefined && {
        sessionDuration: sanitizeRecruitmentText(body.sessionDuration),
      }),
      ...(body.estimatedLength !== undefined && {
        estimatedLength: sanitizeRecruitmentText(body.estimatedLength),
      }),
      ...(maxSeats !== undefined && { maxSeats }),
      ...(maxPlayers !== undefined && { maxPlayers }),
      ...(genreThemes !== undefined && {
        genreThemes: genreThemes as unknown as object,
      }),
      ...(externalTools !== undefined && {
        externalTools: externalTools as unknown as object,
      }),
      ...(body.safetyTools !== undefined && {
        safetyTools: sanitizeRecruitmentText(body.safetyTools, 4000),
      }),
      ...(body.contentWarnings !== undefined && {
        contentWarnings: sanitizeRecruitmentText(body.contentWarnings, 4000),
      }),
      ...(body.equipmentNeeded !== undefined && {
        equipmentNeeded: sanitizeRecruitmentText(body.equipmentNeeded, 4000),
      }),
      ...(body.includeRules !== undefined && { includeRules: Boolean(body.includeRules) }),
      ...(body.includeFAQ !== undefined && { includeFAQ: Boolean(body.includeFAQ) }),
      ...(body.includeSessionZero !== undefined && {
        includeSessionZero: Boolean(body.includeSessionZero),
      }),
      ...(body.includeHomebrew !== undefined && {
        includeHomebrew: Boolean(body.includeHomebrew),
      }),
      ...(body.includeSafetyGuidelines !== undefined && {
        includeSafetyGuidelines: Boolean(body.includeSafetyGuidelines),
      }),
      ...(body.includeCharacterCreation !== undefined && {
        includeCharacterCreation: Boolean(body.includeCharacterCreation),
      }),
      ...(body.includeTableExpectations !== undefined && {
        includeTableExpectations: Boolean(body.includeTableExpectations),
      }),
      ...(body.allowPlayerChronologyManagement !== undefined && {
        allowPlayerChronologyManagement: Boolean(body.allowPlayerChronologyManagement),
      }),
      ...(themePreset !== undefined && { themePreset }),
      ...(appearanceProfile !== undefined && {
        appearanceProfile:
          appearanceProfile === null
            ? Prisma.JsonNull
            : toInputJsonValue(appearanceProfile),
      }),
      ...(themePresetFromProfile !== undefined && {
        themePreset: themePresetFromProfile,
      }),
      ...(body.archived !== undefined && {
        archivedAt: body.archived ? new Date() : null,
        ...(body.archived
          ? {
              isLookingForGroup: false,
              discoverability: CampaignDiscoverability.PRIVATE,
            }
          : {}),
      }),
    },
    select: campaignSelect(),
  });

  res.json({
    campaign: {
      ...serializeCampaignRecruitmentFields(campaign as any),
      role,
      isMember: true,
    },
  });
}

export async function duplicateCampaignHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const sourceCampaignId = await resolveCampaignIdFromParam(String(req.params.id));
  if (!sourceCampaignId) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const membership = await prisma.campaignMember.findUnique({
    where: {
      userId_campaignId: {
        userId: req.user!.id,
        campaignId: sourceCampaignId,
      },
    },
  });

  const role = membership?.role as CampaignMemberRole | undefined;
  if (!role || !canModifyCampaignAsGamemaster(role)) {
    res.status(403).json({
      error: 'Forbidden: gamemaster role required to duplicate this campaign',
    });
    return;
  }

  const parsed = parseDuplicateCampaignBody(req.body);
  if (!parsed) {
    res.status(400).json({
      error: 'Invalid duplicate payload. name and copy options are required.',
    });
    return;
  }

  try {
    const result = await duplicateCampaign({
      sourceCampaignId,
      ownerUserId: req.user!.id,
      name: parsed.name,
      discoverability: parsed.discoverability,
      copy: parsed.copy,
    });

    const campaign = await prisma.campaign.findUnique({
      where: { id: result.campaignId },
      select: campaignSelect(),
    });

    if (!campaign) {
      res.status(500).json({ error: 'Duplicate created but campaign could not be loaded' });
      return;
    }

    res.status(201).json({
      campaign: {
        ...serializeCampaignRecruitmentFields(campaign as Record<string, unknown>),
        role: CampaignMemberRoles.GAMEMASTER,
        isMember: true,
      },
      presetUsed: parsed.presetUsed ?? null,
    });
  } catch (error) {
    console.error('Error duplicating campaign:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to duplicate campaign',
    });
  }
}

export async function deleteCampaign(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const campaignKey = String(req.params.id);
  const campaignId = await resolveCampaignIdFromParam(campaignKey);

  if (!campaignId) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const campaignRow = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { campaignOwnerUserId: true },
  });
  if (!campaignRow || !isCampaignOwner(req.user!.id, campaignRow.campaignOwnerUserId)) {
    res.status(403).json({
      error: 'Forbidden: only the campaign owner may delete this campaign',
    });
    return;
  }

  await deleteCampaignAssetFiles(campaignId);
  await prisma.campaign.delete({ where: { id: campaignId } });

  res.json({ ok: true });
}

export async function advanceCampaignTime(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  if (isGlobalTimeHooksRunning()) {
    res.status(409).json({
      error: 'Cannot advance campaign time while global time hooks are running.',
    });
    return;
  }

  const parsed = parseAdvanceTimePayload(req.body);
  if (!parsed) {
    res.status(400).json({
      error:
        'Invalid advance payload. Expected { amount: positive number, unit: "minutes" | "hours" | "days" | "weeks" | "months" }.',
    });
    return;
  }

  const campaignId = req.campaign!.campaignId;

  let previousEpochMinute = 0n;
  let nextEpochMinute = 0n;
  let actualMinuteDelta = 0n;
  let clampedDay: boolean | undefined;
  let fantasyCalendars: FantasyCalendar[] = [];
  let simulationReceipt: Awaited<ReturnType<typeof runGlobalTimeHooks>> | undefined;
  let updated: {
    currentEpochMinute: bigint;
    fantasyCalendars: typeof fantasyCalendars;
  } | null = null;

  try {
    updated = await prisma.$transaction(async (tx) => {
      const campaign = await tx.campaign.findUnique({
        where: { id: campaignId },
        select: {
          id: true,
          currentEpochMinute: true,
          fantasyCalendars: {
            orderBy: [{ isMasterTime: 'desc' }, { name: 'asc' }],
          },
        },
      });

      if (!campaign) {
        return null;
      }

      previousEpochMinute = campaign.currentEpochMinute;
      const advanceResult = await computeNextEpochMinute({
        campaignId,
        currentEpochMinute: previousEpochMinute,
        amount: parsed.amount,
        unit: parsed.unit,
      });
      nextEpochMinute = advanceResult.nextEpochMinute;
      actualMinuteDelta = advanceResult.actualMinuteDelta;
      if (advanceResult.calendarShift) {
        clampedDay = advanceResult.calendarShift.clampedDay;
      }

      const row = await tx.campaign.update({
        where: { id: campaignId },
        data: { currentEpochMinute: nextEpochMinute },
        select: {
          id: true,
          currentEpochMinute: true,
          fantasyCalendars: {
            orderBy: [{ isMasterTime: 'desc' }, { name: 'asc' }],
          },
        },
      });

      if (nextEpochMinute !== previousEpochMinute) {
        const hookContext = buildGlobalTimeAdvanceContext({
          campaignId,
          previousEpochMinute,
          nextEpochMinute,
          advancedBy: { amount: parsed.amount, unit: parsed.unit as string },
          source: 'time_tracking',
          actorUserId: req.user?.id,
        });
        simulationReceipt = await runGlobalTimeHooks(tx, hookContext);
      }

      return row;
    });

    if (!updated) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    nextEpochMinute = updated.currentEpochMinute;
    fantasyCalendars = updated.fantasyCalendars;
  } catch (error) {
    if (error instanceof NoMasterCalendarError) {
      res.status(400).json({
        error: 'Month advancement requires a master fantasy calendar.',
      });
      return;
    }
    if (error instanceof GlobalTimeHookExecutionError) {
      res.status(500).json({
        error: 'Global time hook execution failed.',
        hookId: error.hookId,
        handlerVersion: error.handlerVersion,
        partialResults: error.partialResults,
      });
      return;
    }
    throw error;
  }

  if (req.user?.id) {
    logCampaignActivity({
      campaignId,
      userId: req.user.id,
      actionType: 'UPDATE',
      entityType: 'TIME_TRACKING',
      entityId: campaignId,
      entityName: `Advanced time by ${String(parsed.amount)} ${parsed.unit}`,
    });
  }

  dispatchDomainEvent({
    type: CoreDomainEvents.CALENDAR_ADVANCED,
    campaignId,
    payload: toCalendarAdvancedDto({
      campaignId,
      previousEpochMinute,
      nextEpochMinute,
      amount: actualMinuteDelta,
      unit: parsed.unit,
    }) as unknown as Record<string, unknown>,
  });

  res.json({
    currentEpochMinute: serializeEpochMinute(nextEpochMinute),
    advancedBy: {
      amount: String(parsed.amount),
      unit: parsed.unit,
    },
    calendars: buildCalendarStates(nextEpochMinute, fantasyCalendars),
    ...(clampedDay != null ? { clampedDay } : {}),
    ...(simulationReceipt ? { simulationReceipt } : {}),
  });
}

export async function getCampaignTimeTracking(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      currentEpochMinute: true,
      fantasyCalendars: {
        orderBy: [{ isMasterTime: 'desc' }, { name: 'asc' }],
      },
    },
  });

  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  res.json({
    currentEpochMinute: serializeEpochMinute(campaign.currentEpochMinute),
    calendars: buildCalendarStates(campaign.currentEpochMinute, campaign.fantasyCalendars),
  });
}

export async function previewFantasyCalendarImport(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  try {
    const parsed = parseFantasyCalendarExport(req.body);
    res.json(buildFantasyCalendarImportPreview(parsed));
  } catch (error) {
    if (error instanceof FantasyCalendarImportError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('Error previewing Fantasy-Calendar import:', error);
    res.status(500).json({ error: 'Failed to preview Fantasy-Calendar import.' });
  }
}

export async function previewFantasyCalendarImportForWizard(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const parsed = parseFantasyCalendarExport(req.body);
    res.json(buildFantasyCalendarImportPreview(parsed));
  } catch (error) {
    if (error instanceof FantasyCalendarImportError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('Error previewing Fantasy-Calendar import:', error);
    res.status(500).json({ error: 'Failed to preview Fantasy-Calendar import.' });
  }
}

export async function importCalendarFromJson(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;

  try {
    const parsed = parseFantasyCalendarExport(req.body);
    const applied = await prisma.$transaction(async (tx) =>
      applyFantasyCalendarImport(tx, campaignId, parsed),
    );

    const preview = buildFantasyCalendarImportPreview(parsed);
    res.json({
      ...preview,
      calendarId: applied.calendarId,
      isMasterTime: applied.isMasterTime,
      createdNewTimeline: applied.createdNewTimeline,
      currentEpochMinute: serializeEpochMinute(applied.currentEpochMinute),
    });
  } catch (error) {
    if (error instanceof FantasyCalendarImportError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('Error importing Fantasy-Calendar JSON:', error);
    res.status(500).json({ error: 'Failed to import Fantasy-Calendar JSON.' });
  }
}
