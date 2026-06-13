import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import {
  buildLedgerHubPayload,
  canContributeToLedger,
  canManageLedgerSettings,
  createLedgerEntry,
  deleteLedgerEntry,
  getCampaignLedgerDetail,
  getLedgerEntry,
  updateLedgerEntry,
  updateLedgerSettings,
  type CreateLedgerEntryInput,
  type UpdateLedgerEntryInput,
} from '../lib/campaignLedgerService.js';
import {
  acceptLedgerSuggestion,
  dismissLedgerSuggestion,
  listPendingLedgerSuggestions,
} from '../lib/ledgerSuggestionService.js';
import { normalizeLedgerEntryKind } from '../lib/ledgerMetadata.js';

function campaignHandleFromRequest(req: CampaignScopedRequest): string {
  return req.campaign!.campaignHandle ?? req.campaign!.campaignId;
}

function handleServiceError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : 'Request failed.';
  if (message === 'Forbidden') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  if (message.includes('not found')) {
    res.status(404).json({ error: message });
    return;
  }
  res.status(400).json({ error: message });
}

export async function getCampaignLedgerHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const campaignHandle = campaignHandleFromRequest(req);

  try {
    const [ledger, entriesPayload] = await Promise.all([
      getCampaignLedgerDetail(
        ctx.campaignId,
        campaignHandle,
        ctx.role,
        req.user?.id ?? null,
      ),
      buildLedgerHubPayload(
        ctx.campaignId,
        campaignHandle,
        ctx.role,
        req.user?.id ?? null,
      ),
    ]);

    res.json({
      ledger,
      feed: entriesPayload.feed,
    });
  } catch (err) {
    handleServiceError(res, err);
  }
}

export async function patchCampaignLedgerHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!req.user?.id) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const body = req.body ?? {};
  const patch: {
    currencyLabel?: string;
    currencySuffix?: string;
    openingBalance?: number;
    sharedTreasuryEnabled?: boolean;
  } = {};

  if (typeof body.currencyLabel === 'string') {
    patch.currencyLabel = body.currencyLabel;
  }
  if (typeof body.currencySuffix === 'string') {
    patch.currencySuffix = body.currencySuffix;
  }
  if (body.openingBalance !== undefined) {
    patch.openingBalance = Number(body.openingBalance);
  }
  if (body.sharedTreasuryEnabled !== undefined) {
    patch.sharedTreasuryEnabled = Boolean(body.sharedTreasuryEnabled);
  }

  try {
    const ledger = await updateLedgerSettings(
      ctx.campaignId,
      campaignHandleFromRequest(req),
      ctx.role,
      req.user.id,
      patch,
    );
    res.json({ ledger });
  } catch (err) {
    handleServiceError(res, err);
  }
}

function parseCreateBody(body: Record<string, unknown>): CreateLedgerEntryInput {
  const entryKind = normalizeLedgerEntryKind(body.entryKind);
  if (!entryKind) {
    throw new Error('Invalid entry kind.');
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount)) {
    throw new Error('Amount must be a positive integer.');
  }

  return {
    entryKind,
    category: typeof body.category === 'string' ? body.category : undefined,
    title: typeof body.title === 'string' ? body.title : '',
    narrative:
      typeof body.narrative === 'string' || body.narrative === null
        ? body.narrative
        : undefined,
    amount,
    occurredAtEpochMinute:
      body.occurredAtEpochMinute != null
        ? String(body.occurredAtEpochMinute)
        : undefined,
    projectId:
      typeof body.projectId === 'string'
        ? body.projectId
        : body.projectId === null
          ? null
          : undefined,
    havenWikiPageId:
      typeof body.havenWikiPageId === 'string'
        ? body.havenWikiPageId
        : body.havenWikiPageId === null
          ? null
          : undefined,
    contributorPageId:
      typeof body.contributorPageId === 'string'
        ? body.contributorPageId
        : body.contributorPageId === null
          ? null
          : undefined,
  };
}

function parseSuggestionEditsBody(
  body: Record<string, unknown>,
): Partial<CreateLedgerEntryInput> {
  const edits: Partial<CreateLedgerEntryInput> = {};
  if (body.entryKind !== undefined) {
    const entryKind = normalizeLedgerEntryKind(body.entryKind);
    if (entryKind) edits.entryKind = entryKind;
  }
  if (typeof body.category === 'string') edits.category = body.category;
  if (typeof body.title === 'string') edits.title = body.title;
  if (body.narrative !== undefined) {
    edits.narrative =
      typeof body.narrative === 'string' || body.narrative === null
        ? body.narrative
        : undefined;
  }
  if (body.amount !== undefined && Number.isFinite(Number(body.amount))) {
    edits.amount = Number(body.amount);
  }
  if (body.occurredAtEpochMinute != null) {
    edits.occurredAtEpochMinute = String(body.occurredAtEpochMinute);
  }
  if (body.projectId !== undefined) {
    edits.projectId = typeof body.projectId === 'string' ? body.projectId : null;
  }
  if (body.havenWikiPageId !== undefined) {
    edits.havenWikiPageId =
      typeof body.havenWikiPageId === 'string' ? body.havenWikiPageId : null;
  }
  if (body.contributorPageId !== undefined) {
    edits.contributorPageId =
      typeof body.contributorPageId === 'string' ? body.contributorPageId : null;
  }
  return edits;
}

export async function createLedgerEntryHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!req.user?.id) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (!canContributeToLedger(ctx.role)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    const input = parseCreateBody((req.body ?? {}) as Record<string, unknown>);
    const entry = await createLedgerEntry(
      ctx.campaignId,
      campaignHandleFromRequest(req),
      ctx.role,
      req.user.id,
      input,
    );
    res.status(201).json({ entry });
  } catch (err) {
    handleServiceError(res, err);
  }
}

export async function patchLedgerEntryHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!req.user?.id) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const patch: UpdateLedgerEntryInput = {};

  if (body.entryKind !== undefined) {
    patch.entryKind = normalizeLedgerEntryKind(body.entryKind) ?? undefined;
  }
  if (body.category !== undefined && typeof body.category === 'string') {
    patch.category = body.category;
  }
  if (body.title !== undefined && typeof body.title === 'string') {
    patch.title = body.title;
  }
  if (body.narrative !== undefined) {
    patch.narrative =
      typeof body.narrative === 'string' || body.narrative === null
        ? body.narrative
        : undefined;
  }
  if (body.amount !== undefined) {
    patch.amount = Number(body.amount);
  }
  if (body.occurredAtEpochMinute !== undefined) {
    patch.occurredAtEpochMinute = String(body.occurredAtEpochMinute);
  }
  if (body.projectId !== undefined) {
    patch.projectId =
      typeof body.projectId === 'string' ? body.projectId : null;
  }
  if (body.havenWikiPageId !== undefined) {
    patch.havenWikiPageId =
      typeof body.havenWikiPageId === 'string' ? body.havenWikiPageId : null;
  }
  if (body.contributorPageId !== undefined) {
    patch.contributorPageId =
      typeof body.contributorPageId === 'string' ? body.contributorPageId : null;
  }

  try {
    const entry = await updateLedgerEntry(
      ctx.campaignId,
      campaignHandleFromRequest(req),
      ctx.role,
      req.user.id,
      String(req.params.id),
      patch,
    );
    res.json({ entry });
  } catch (err) {
    handleServiceError(res, err);
  }
}

export async function deleteLedgerEntryHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!req.user?.id) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    await deleteLedgerEntry(
      ctx.campaignId,
      ctx.role,
      req.user.id,
      String(req.params.id),
    );
    res.status(204).send();
  } catch (err) {
    handleServiceError(res, err);
  }
}

export async function getLedgerEntryHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const entry = await getLedgerEntry(
    ctx.campaignId,
    campaignHandleFromRequest(req),
    String(req.params.id),
  );
  if (!entry) {
    res.status(404).json({ error: 'Ledger entry not found.' });
    return;
  }
  res.json({ entry });
}

export async function listLedgerSuggestionsHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!canContributeToLedger(ctx.role)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    const suggestions = await listPendingLedgerSuggestions(
      ctx.campaignId,
      campaignHandleFromRequest(req),
      ctx.role,
    );
    res.json({ suggestions });
  } catch (err) {
    handleServiceError(res, err);
  }
}

export async function acceptLedgerSuggestionHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!req.user?.id) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (!canManageLedgerSettings(ctx.role)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  let edits: Partial<CreateLedgerEntryInput> | undefined;
  if (body.edits && typeof body.edits === 'object') {
    edits = parseSuggestionEditsBody(body.edits as Record<string, unknown>);
  } else if (Object.keys(body).length > 0) {
    edits = parseSuggestionEditsBody(body);
  }

  try {
    const result = await acceptLedgerSuggestion({
      suggestionId: String(req.params.id),
      campaignId: ctx.campaignId,
      campaignHandle: campaignHandleFromRequest(req),
      role: ctx.role,
      userId: req.user.id,
      edits,
    });
    res.json(result);
  } catch (err) {
    handleServiceError(res, err);
  }
}

export async function dismissLedgerSuggestionHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!req.user?.id) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const suggestion = await dismissLedgerSuggestion(
      ctx.campaignId,
      campaignHandleFromRequest(req),
      ctx.role,
      req.user.id,
      String(req.params.id),
    );
    res.json({ suggestion });
  } catch (err) {
    handleServiceError(res, err);
  }
}

export { buildLedgerHubPayload, canContributeToLedger, canManageLedgerSettings };
