import type { Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { sanitizeDefaultPitch } from '../lib/userDisplay.js';
import { sanitizeGenreThemes } from '../lib/campaignThemeValidation.js';
import {
  USER_TEMPLATE_RESOURCE_KINDS,
  USER_TEMPLATE_RESOURCE_META,
  USER_TEMPLATE_STARTER_MARKDOWN,
  isUserTemplateResourceKind,
  sanitizeUserCampaignDefaultsPrefs,
  type UserCampaignDefaultsPrefs,
  type UserTemplateResourceKind,
} from '../lib/userCampaignDefaults.js';
import { sanitizeGmStyleTags } from '../lib/gmStyleTags.js';

function serializeTemplateResource(row: {
  kind: string;
  markdown: string;
  updatedAt: Date;
}) {
  const kind = row.kind as UserTemplateResourceKind;
  const meta = USER_TEMPLATE_RESOURCE_META[kind];
  return {
    kind,
    label: meta?.label ?? kind,
    routeSlug: meta?.routeSlug ?? kind,
    markdown: row.markdown,
    updatedAt: row.updatedAt.toISOString(),
    hasContent: row.markdown.trim().length > 0,
  };
}

export async function getUserCampaignDefaultsBundle(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;

  const [user, defaultsRow, resources] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { defaultPitch: true, gmStyleTags: true },
    }),
    prisma.userCampaignDefaults.findUnique({ where: { userId } }),
    prisma.userTemplateResource.findMany({
      where: { userId },
      orderBy: { kind: 'asc' },
    }),
  ]);

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const resourceMap = new Map(resources.map((row) => [row.kind, row]));
  const templateResources = USER_TEMPLATE_RESOURCE_KINDS.map((kind) => {
    const existing = resourceMap.get(kind);
    if (existing) return serializeTemplateResource(existing);
    const meta = USER_TEMPLATE_RESOURCE_META[kind];
    return {
      kind,
      label: meta.label,
      routeSlug: meta.routeSlug,
      markdown: '',
      updatedAt: null as string | null,
      hasContent: false,
    };
  });

  res.json({
    defaults: {
      prefs: sanitizeUserCampaignDefaultsPrefs(defaultsRow?.prefs ?? {}),
      gmStyleTags: sanitizeGmStyleTags(user.gmStyleTags),
      defaultPitch: user.defaultPitch,
      updatedAt: defaultsRow?.updatedAt.toISOString() ?? null,
      templateResources,
    },
  });
}

export async function patchUserCampaignDefaults(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const body = req.body as {
    prefs?: unknown;
    gmStyleTags?: unknown;
    defaultPitch?: unknown;
  };

  const prefs = body.prefs !== undefined ? sanitizeUserCampaignDefaultsPrefs(body.prefs) : undefined;
  const gmStyleTags =
    body.gmStyleTags !== undefined
      ? sanitizeGmStyleTags(body.gmStyleTags)
      : undefined;
  const defaultPitch =
    body.defaultPitch !== undefined
      ? sanitizeDefaultPitch(
          typeof body.defaultPitch === 'string' ? body.defaultPitch : null,
        )
      : undefined;

  if (prefs?.recruitmentPrefs?.genreThemes) {
    prefs.recruitmentPrefs.genreThemes = sanitizeGenreThemes(prefs.recruitmentPrefs.genreThemes);
  }

  await prisma.$transaction(async (tx) => {
    if (prefs !== undefined) {
      await tx.userCampaignDefaults.upsert({
        where: { userId },
        create: { userId, prefs: prefs as object },
        update: { prefs: prefs as object },
      });
    }

    if (gmStyleTags !== undefined || defaultPitch !== undefined) {
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(gmStyleTags !== undefined
            ? { gmStyleTags: gmStyleTags as Prisma.InputJsonValue }
            : {}),
          ...(defaultPitch !== undefined ? { defaultPitch } : {}),
        },
      });
    }
  });

  await getUserCampaignDefaultsBundle(req, res);
}

export async function getUserTemplateResource(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const kindParam = String(req.params.kind ?? '');

  if (!isUserTemplateResourceKind(kindParam)) {
    res.status(400).json({ error: 'Invalid template resource kind.' });
    return;
  }

  const kind = kindParam;
  const meta = USER_TEMPLATE_RESOURCE_META[kind];

  const row = await prisma.userTemplateResource.findUnique({
    where: { userId_kind: { userId, kind } },
  });

  res.json({
    resource: {
      kind,
      label: meta.label,
      editorTitle: meta.editorTitle,
      routeSlug: meta.routeSlug,
      markdown: row?.markdown ?? '',
      updatedAt: row?.updatedAt.toISOString() ?? null,
      starterMarkdown: USER_TEMPLATE_STARTER_MARKDOWN[kind] ?? '',
    },
  });
}

export async function putUserTemplateResource(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const kindParam = String(req.params.kind ?? '');

  if (!isUserTemplateResourceKind(kindParam)) {
    res.status(400).json({ error: 'Invalid template resource kind.' });
    return;
  }

  const kind = kindParam;
  const markdown =
    typeof (req.body as { markdown?: unknown })?.markdown === 'string'
      ? (req.body as { markdown: string }).markdown
      : '';

  if (markdown.length > 100_000) {
    res.status(400).json({ error: 'Template content is too long.' });
    return;
  }

  const row = await prisma.userTemplateResource.upsert({
    where: { userId_kind: { userId, kind } },
    create: { userId, kind, markdown },
    update: { markdown },
  });

  res.json({ resource: serializeTemplateResource(row) });
}

export type { UserCampaignDefaultsPrefs };
