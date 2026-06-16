import type { Prisma } from '@prisma/client';
import type { CampaignWorkspace } from '../../../shared/campaignWorkspace.js';
import {
  generatePathKeyFromTitle,
  syncPathKeyOnRename,
} from '../../../shared/pathKeyUtils.js';
import { RESERVED_PATH_KEY_SEGMENTS } from '../../../shared/campaignWorkspaceRoutes.js';
import {
  isRoutableWikiPage,
  resolveWorkspaceForPage,
  type WikiPageWorkspaceInput,
} from '../../../shared/wikiWorkspaceResolve.js';
import { prisma } from './prisma.js';

type Tx = Prisma.TransactionClient;

export type WikiPathKeyRow = WikiPageWorkspaceInput & {
  workspace?: CampaignWorkspace | null;
  pathKey?: string | null;
};

export async function loadCampaignWikiPathKeyRows(
  campaignId: string,
  tx: Tx = prisma,
): Promise<WikiPathKeyRow[]> {
  return tx.wikiPage.findMany({
    where: { campaignId, deletedAt: null },
    select: {
      id: true,
      title: true,
      parentId: true,
      templateType: true,
      metadata: true,
      workspace: true,
      pathKey: true,
    },
  }) as Promise<WikiPathKeyRow[]>;
}

async function takenPathKeysInWorkspace(
  campaignId: string,
  workspace: CampaignWorkspace,
  excludePageId: string | undefined,
  tx: Tx,
): Promise<Set<string>> {
  const rows = await tx.wikiPage.findMany({
    where: {
      campaignId,
      workspace,
      pathKey: { not: null },
      ...(excludePageId ? { id: { not: excludePageId } } : {}),
    },
    select: { pathKey: true },
  });
  return new Set(
    rows.map((r) => r.pathKey).filter((k): k is string => Boolean(k)),
  );
}

export function resolveWikiPageWorkspaceAndPathKey(
  page: WikiPageWorkspaceInput,
  flatPages: readonly WikiPageWorkspaceInput[],
  takenInWorkspace: Set<string>,
): { workspace: CampaignWorkspace | null; pathKey: string | null } {
  if (!isRoutableWikiPage(page)) {
    return { workspace: null, pathKey: null };
  }

  const workspace = resolveWorkspaceForPage(page, flatPages);
  if (!workspace) {
    return { workspace: null, pathKey: null };
  }

  const pathKey = generatePathKeyFromTitle(
    page.title,
    takenInWorkspace,
    RESERVED_PATH_KEY_SEGMENTS,
  );

  return { workspace, pathKey };
}

export async function assignPathKeyForNewPage(
  campaignId: string,
  page: WikiPageWorkspaceInput,
  flatPages: readonly WikiPageWorkspaceInput[],
  tx: Tx = prisma,
): Promise<{ workspace: CampaignWorkspace | null; pathKey: string | null }> {
  const resolved = resolveWorkspaceForPage(page, flatPages);
  if (!resolved) return { workspace: null, pathKey: null };

  const workspace = resolved;
  const taken = await takenPathKeysInWorkspace(campaignId, workspace, undefined, tx);
  const pathKey = generatePathKeyFromTitle(
    page.title,
    taken,
    RESERVED_PATH_KEY_SEGMENTS,
  );
  return { workspace, pathKey };
}

export async function syncPathKeyForTitleChange(
  campaignId: string,
  pageId: string,
  newTitle: string,
  workspace: CampaignWorkspace,
  currentPathKey: string | null,
  tx: Tx = prisma,
): Promise<string | null> {
  const taken = await takenPathKeysInWorkspace(campaignId, workspace, pageId, tx);
  return syncPathKeyOnRename(
    currentPathKey,
    newTitle,
    taken,
    RESERVED_PATH_KEY_SEGMENTS,
  );
}

export async function backfillCampaignPathKeys(
  campaignId: string,
  tx: Tx = prisma,
): Promise<number> {
  const pages = await loadCampaignWikiPathKeyRows(campaignId, tx);
  const takenByWorkspace = new Map<CampaignWorkspace, Set<string>>();
  let updated = 0;

  for (const page of pages) {
    const workspace = resolveWorkspaceForPage(page, pages);
    if (!workspace) {
      if (page.workspace != null || page.pathKey != null) {
        await tx.wikiPage.update({
          where: { id: page.id },
          data: { workspace: null, pathKey: null },
        });
        updated += 1;
      }
      continue;
    }

    const ws = workspace;
    if (!takenByWorkspace.has(ws)) {
      takenByWorkspace.set(ws, new Set());
    }
    const taken = takenByWorkspace.get(ws)!;

    const pathKey =
      page.pathKey && page.workspace === ws && !taken.has(page.pathKey)
        ? page.pathKey
        : generatePathKeyFromTitle(page.title, taken, RESERVED_PATH_KEY_SEGMENTS);

    taken.add(pathKey);

    if (page.workspace !== ws || page.pathKey !== pathKey) {
      await tx.wikiPage.update({
        where: { id: page.id },
        data: { workspace: ws, pathKey },
      });
      updated += 1;
    }
  }

  return updated;
}

export async function resolveWikiPageByPathKey(
  campaignId: string,
  workspace: CampaignWorkspace,
  pathKey: string,
  tx: Tx = prisma,
) {
  const byPathKey = await tx.wikiPage.findFirst({
    where: {
      campaignId,
      workspace,
      pathKey,
      deletedAt: null,
    },
  });
  if (byPathKey) return byPathKey;

  // Transitional: tolerate internal page ids in the public URL segment.
  return tx.wikiPage.findFirst({
    where: {
      id: pathKey,
      campaignId,
      workspace,
      deletedAt: null,
    },
  });
}
