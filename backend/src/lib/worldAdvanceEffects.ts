import type { Prisma } from '@prisma/client';
import type { WorldAdvanceEffect } from '../../../shared/worldAdvance.js';
import type { ConsequenceEffect } from '../../../shared/narrativeConsequence.js';
import {
  appendCharacterLocationEvent,
  parseCharacterLocationHistory,
} from './characterLocationHistory.js';
import {
  appendOrgRelationEvent,
  applyCanonicalWorldEffect,
  suggestTerritoryShiftOnSceneObject,
  type CanonicalWorldEffectContext,
} from './canonicalWorldEffect.js';
import {
  createConflictSignalRecord,
  createEconomicSignalRecord,
  appendWorldSignal,
} from './worldSignalsMetadata.js';
import { mergeCharacterMetadata } from './characterMetadata.js';
import { parseLocationMetadata } from './locationMetadata.js';
import {
  projectMigrationFromDisplacement,
  projectTradeRouteFromEconomicSignal,
  projectTravelRouteFromLocationEvent,
  resolveTradePartnerPageId,
} from './mapOverlayProjectionService.js';
import { emitTradeEventLedgerSuggestion } from './ledgerSuggestionEmitters.js';
import type { ChronologyDateParts } from './entityRelationTypes.js';

export type ApplyWorldAdvanceEffectResult = {
  summary: string;
  warnings: string[];
  pendingConfirmations: string[];
};

export async function applyWorldAdvanceEffect(
  effect: WorldAdvanceEffect,
  ctx: CanonicalWorldEffectContext,
  db: Prisma.TransactionClient,
): Promise<ApplyWorldAdvanceEffectResult> {
  const warnings: string[] = [];
  const pendingConfirmations: string[] = [];

  switch (effect.type) {
    case 'append_org_relation_event': {
      await appendOrgRelationEvent(
        ctx.campaignId,
        effect.orgPageId,
        {
          targetOrgId: effect.targetOrgId,
          relationType: effect.relationType,
          stance: effect.stance,
          visibility: effect.visibility,
          note: effect.note,
          effectiveDate: effect.effectiveDate ?? ctx.effectiveDate,
          sourceEventIds: [...(effect.sourceEventIds ?? []), ...(ctx.sourceEventIds ?? [])],
        },
        db,
      );
      return {
        summary: `Faction relation ${effect.stance} toward target org`,
        warnings,
        pendingConfirmations,
      };
    }
    case 'territory_pressure': {
      const pageId = effect.regionPageId ?? effect.orgPageId;
      if (!pageId) {
        warnings.push('territory_pressure requires regionPageId or orgPageId');
        return { summary: 'Skipped territory pressure', warnings, pendingConfirmations };
      }
      const page = await db.wikiPage.findFirst({
        where: { id: pageId, campaignId: ctx.campaignId },
        select: { metadata: true },
      });
      if (!page?.metadata || typeof page.metadata !== 'object') {
        warnings.push('Target page not found for territory_pressure');
        return { summary: 'Skipped territory pressure', warnings, pendingConfirmations };
      }
      const meta = { ...(page.metadata as Record<string, unknown>) };
      const signal = {
        id: effect.id,
        kind: 'territory_pressure' as const,
        pressureLevel: effect.pressureLevel,
        atEpochMinute: ctx.atEpochMinute,
        note: effect.note ?? null,
        sourceEventIds: [effect.id, ...(ctx.sourceEventIds ?? [])],
      };
      await db.wikiPage.update({
        where: { id: pageId },
        data: { metadata: appendWorldSignal(meta, signal) as never },
      });
      return {
        summary: `Territory pressure ${effect.pressureLevel}`,
        warnings,
        pendingConfirmations,
      };
    }
    case 'suggest_border_keyframe': {
      await suggestTerritoryShiftOnSceneObject(
        ctx.campaignId,
        effect.sceneObjectId,
        effect.orgPageId,
        effect.stance,
        ctx.atEpochMinute,
        db,
      );
      pendingConfirmations.push(
        `Border keyframe suggestion on map object ${effect.sceneObjectId} — confirm in map editor`,
      );
      return {
        summary: 'Border keyframe suggestion recorded',
        warnings,
        pendingConfirmations,
      };
    }
    case 'economic_signal': {
      const page = await db.wikiPage.findFirst({
        where: { id: effect.pageId, campaignId: ctx.campaignId },
        select: { metadata: true },
      });
      if (!page?.metadata || typeof page.metadata !== 'object') {
        warnings.push('economic_signal target not found');
        return { summary: 'Skipped economic signal', warnings, pendingConfirmations };
      }
      const meta = { ...(page.metadata as Record<string, unknown>) };
      const signal = createEconomicSignalRecord({
        signal: effect.signal,
        atEpochMinute: ctx.atEpochMinute,
        note: effect.note,
        sourceEventIds: [effect.id],
      });
      await db.wikiPage.update({
        where: { id: effect.pageId },
        data: { metadata: appendWorldSignal(meta, signal) as never },
      });
      const tradePartner = await resolveTradePartnerPageId(
        ctx.campaignId,
        effect.pageId,
        db,
      );
      if (tradePartner) {
        const overlayId = await projectTradeRouteFromEconomicSignal(
          ctx.campaignId,
          { id: effect.id, pageId: effect.pageId, signal: effect.signal },
          ctx.atEpochMinute,
          db,
          tradePartner,
        );
        if (overlayId) {
          pendingConfirmations.push(
            `Trade route overlay ${overlayId} projected (DRAFT) — confirm in map editor`,
          );
        }
      }
      await emitTradeEventLedgerSuggestion(db, {
        campaignId: ctx.campaignId,
        effectId: effect.id,
        signal: effect.signal,
        note: effect.note,
        atEpochMinute: ctx.atEpochMinute,
        pageId: effect.pageId,
      });
      return {
        summary: `Economic signal: ${effect.signal}`,
        warnings,
        pendingConfirmations,
      };
    }
    case 'conflict_front': {
      for (const orgId of effect.orgPageIds ?? []) {
        const page = await db.wikiPage.findFirst({
          where: { id: orgId, campaignId: ctx.campaignId },
          select: { metadata: true },
        });
        if (!page?.metadata || typeof page.metadata !== 'object') continue;
        const meta = { ...(page.metadata as Record<string, unknown>) };
        const signal = createConflictSignalRecord({
          label: effect.label,
          phase: effect.phase,
          atEpochMinute: ctx.atEpochMinute,
          orgPageIds: effect.orgPageIds,
          regionPageIds: effect.regionPageIds,
          displacementNote: effect.displacementNote,
          casualtyNote: effect.casualtyNote,
          sourceEventIds: [effect.id],
        });
        await db.wikiPage.update({
          where: { id: orgId },
          data: { metadata: appendWorldSignal(meta, signal) as never },
        });
      }
      for (const regionId of effect.regionPageIds ?? []) {
        const page = await db.wikiPage.findFirst({
          where: { id: regionId, campaignId: ctx.campaignId },
          select: { metadata: true },
        });
        if (!page?.metadata || typeof page.metadata !== 'object') continue;
        const meta = { ...(page.metadata as Record<string, unknown>) };
        const signal = createConflictSignalRecord({
          label: effect.label,
          phase: effect.phase,
          atEpochMinute: ctx.atEpochMinute,
          orgPageIds: effect.orgPageIds ?? [],
          regionPageIds: effect.regionPageIds ?? [],
          displacementNote: effect.displacementNote,
          casualtyNote: effect.casualtyNote,
          sourceEventIds: [effect.id],
        });
        await db.wikiPage.update({
          where: { id: regionId },
          data: { metadata: appendWorldSignal(meta, signal) as never },
        });
      }
      return {
        summary: `Conflict front: ${effect.label} (${effect.phase})`,
        warnings,
        pendingConfirmations,
      };
    }
    case 'record_season_context':
      return {
        summary: effect.regionPageId
          ? `Season context noted for region`
          : 'Campaign season context recorded at epoch',
        warnings,
        pendingConfirmations,
      };
    case 'append_location_event': {
      const page = await db.wikiPage.findFirst({
        where: { id: effect.characterPageId, campaignId: ctx.campaignId },
        select: { metadata: true },
      });
      if (!page?.metadata || typeof page.metadata !== 'object') {
        warnings.push('Character not found for location event');
        return { summary: 'Skipped location event', warnings, pendingConfirmations };
      }
      const priorHistory = parseCharacterLocationHistory(page.metadata).locationHistory;
      const priorLocation =
        priorHistory.length > 0
          ? priorHistory[priorHistory.length - 1]?.locationPageId ?? null
          : null;
      let meta = appendCharacterLocationEvent(page.metadata as Record<string, unknown>, {
        locationPageId: effect.locationPageId,
        kind: effect.kind,
        effectiveDate: effect.effectiveDate ?? ctx.effectiveDate,
        note: effect.note,
        sourceEventIds: [effect.id, ...(ctx.sourceEventIds ?? [])],
      });
      const history = parseCharacterLocationHistory(meta).locationHistory;
      const present =
        effect.kind === 'residency' || effect.kind === 'displacement'
          ? effect.locationPageId
          : null;
      if (present) {
        meta = mergeCharacterMetadata(meta, {
          currentLocationId: present,
        }) as Record<string, unknown>;
      }
      meta.locationHistory = history;
      await db.wikiPage.update({
        where: { id: effect.characterPageId },
        data: { metadata: meta as never },
      });
      if (effect.kind === 'travel') {
        const overlayId = await projectTravelRouteFromLocationEvent(
          ctx.campaignId,
          {
            id: effect.id,
            characterPageId: effect.characterPageId,
            locationPageId: effect.locationPageId,
          },
          priorLocation,
          ctx.atEpochMinute,
          db,
        );
        if (overlayId) {
          pendingConfirmations.push(
            `Travel route overlay ${overlayId} projected (DRAFT) — confirm in map editor`,
          );
        }
      }
      return {
        summary: `NPC ${effect.kind} at location`,
        warnings,
        pendingConfirmations,
      };
    }
    case 'set_current_location': {
      const page = await db.wikiPage.findFirst({
        where: { id: effect.characterPageId, campaignId: ctx.campaignId },
        select: { metadata: true },
      });
      if (!page) {
        warnings.push('Character not found');
        return { summary: 'Skipped set location', warnings, pendingConfirmations };
      }
      const merged = mergeCharacterMetadata(page.metadata, {
        currentLocationId: effect.locationPageId,
      });
      await db.wikiPage.update({
        where: { id: effect.characterPageId },
        data: { metadata: merged as never },
      });
      return {
        summary: 'Current location updated',
        warnings,
        pendingConfirmations,
      };
    }
    case 'displacement': {
      const locId = effect.toLocationPageId ?? effect.fromLocationPageId;
      if (!locId) {
        warnings.push('displacement requires a location');
        return { summary: 'Skipped displacement', warnings, pendingConfirmations };
      }
      const page = await db.wikiPage.findFirst({
        where: { id: effect.characterPageId, campaignId: ctx.campaignId },
        select: { metadata: true },
      });
      if (!page?.metadata || typeof page.metadata !== 'object') {
        warnings.push('Character not found');
        return { summary: 'Skipped displacement', warnings, pendingConfirmations };
      }
      let meta = appendCharacterLocationEvent(page.metadata as Record<string, unknown>, {
        locationPageId: locId,
        kind: 'displacement',
        effectiveDate: ctx.effectiveDate,
        note: effect.note,
        sourceEventIds: [effect.id],
      });
      meta = mergeCharacterMetadata(meta, {
        currentLocationId: effect.toLocationPageId ?? locId,
      }) as Record<string, unknown>;
      const history = parseCharacterLocationHistory(meta).locationHistory;
      await db.wikiPage.update({
        where: { id: effect.characterPageId },
        data: { metadata: { ...meta, locationHistory: history } as never },
      });
      const overlayId = await projectMigrationFromDisplacement(
        ctx.campaignId,
        effect,
        ctx.atEpochMinute,
        db,
      );
      if (overlayId) {
        pendingConfirmations.push(
          `Migration corridor overlay ${overlayId} projected (DRAFT) — confirm in map editor`,
        );
      }
      return {
        summary: 'NPC displacement recorded',
        warnings,
        pendingConfirmations,
      };
    }
    case 'consequence_bridge':
      await applyCanonicalWorldEffect(effect.consequence, ctx, db);
      return {
        summary: `Consequence bridge: ${effect.consequence.type}`,
        warnings,
        pendingConfirmations,
      };
    default:
      return { summary: 'Unknown effect', warnings, pendingConfirmations };
  }
}

export { effectToConditionDeriveRow } from '../../../shared/worldAdvancePreview.js';

export async function resolveRegionPageIdForLocation(
  campaignId: string,
  locationPageId: string,
  db: Prisma.TransactionClient | typeof import('./prisma.js').prisma,
): Promise<string | null> {
  const page = await db.wikiPage.findFirst({
    where: { id: locationPageId, campaignId },
    select: { metadata: true, id: true },
  });
  if (!page) return null;
  const loc = parseLocationMetadata(page.metadata);
  return loc.regionPageId ?? page.id;
}
