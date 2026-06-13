import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { temporalFromClock, markdownBlock, wikiLinkSpan } from './seedPlan.js';
import { buildGenericSeedPlan } from './buildGenericSeedPlan.js';
import { appendSkeletonCoverageOps } from './buildSkeletonCoverage.js';

const SCENARIOS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'scenarios');

function loadScenario(presetId) {
  const filePath = path.join(SCENARIOS_DIR, `${presetId}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Unknown generator preset scenario: ${presetId}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function linkifyBody(body, titleToKey) {
  if (typeof body !== 'string') return body;
  return body.replace(/\[\[([^\]]+)\]\]/g, (_match, label) => {
    const trimmed = label.trim();
    const key = titleToKey.get(trimmed);
    if (!key) {
      return wikiLinkSpan(trimmed, `stub:${trimmed.toLowerCase().replace(/\s+/g, '-')}`, false);
    }
    return wikiLinkSpan(trimmed, key, true);
  });
}

function buildScenarioPlan(ctx, scenario) {
  const { clock, dmUserId, presetId } = ctx;
  /** @type {import('./seedPlan.js').SeedOp[]} */
  const ops = [];
  const titleToKey = new Map();

  for (const page of scenario.pages ?? []) {
    if (page.title && page.key) titleToKey.set(page.title, page.key);
  }
  for (const page of scenario.eventPages ?? []) {
    if (page.title && page.key) titleToKey.set(page.title, page.key);
  }

  function pushPage(page, actorUserId = dmUserId) {
    const bodyMd = linkifyBody(page.body ?? '', titleToKey);
    ops.push({
      kind: 'createPage',
      clientKey: page.key,
      parentKey: page.parentKey,
      title: page.title,
      metadata: page.metadata ?? {},
      blocks: [markdownBlock(bodyMd)],
      templateType: page.templateType ?? 'DEFAULT',
      actorUserId,
      temporal: temporalFromClock(clock),
      ...(page.tags?.length ? { tags: page.tags } : {}),
      ...(page.visibility ? { visibility: page.visibility } : {}),
    });
    clock.advanceHours(2);
  }

  clock.advanceDays(3);
  for (const page of scenario.pages ?? []) {
    pushPage(page);
  }
  for (const page of scenario.eventPages ?? []) {
    pushPage(page);
  }

  for (const event of scenario.calendarEvents ?? []) {
    ops.push({
      kind: 'createCalendarEvent',
      title: event.title,
      description: typeof event.description === 'string' ? event.description : null,
      dayOffset: typeof event.dayOffset === 'number' ? event.dayOffset : 0,
      actorUserId: dmUserId,
      temporal: temporalFromClock(clock),
    });
    clock.advanceHours(1);
  }

  appendSkeletonCoverageOps(ctx, ops, { flavor: scenario.coverageFlavor ?? presetId });

  return { ops, seed: ctx.seedString, density: ctx.density, presetId };
}

/**
 * @param {object} ctx
 */
export function buildPresetSeedPlan(ctx) {
  const presetId = ctx.presetId;
  const scenario = loadScenario(presetId);

  if (scenario.mode === 'generic') {
    const plan = buildGenericSeedPlan({
      ...ctx,
      sessionCountOverride: scenario.params?.sessionCount,
      locationCountOverride: scenario.params?.locationCount,
      factionCountOverride: scenario.params?.factionCount,
      npcCountOverride: scenario.params?.npcCount,
      unresolvedRate: scenario.params?.unresolvedRate ?? ctx.unresolvedRate,
    });
    return plan;
  }

  return buildScenarioPlan(ctx, scenario);
}

export { loadScenario };
