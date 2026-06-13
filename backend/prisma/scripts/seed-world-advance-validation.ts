/**
 * Tier 1 — seed / inspect canonical world-advance scenarios on a live campaign.
 *
 * Usage:
 *   npx tsx backend/prisma/scripts/seed-world-advance-validation.ts --campaign <slug> --mapping scenarios/world-advance-page-map.example.json
 *   npx tsx backend/prisma/scripts/seed-world-advance-validation.ts --campaign <slug> --mapping page-map.json --apply
 *   npx tsx backend/prisma/scripts/seed-world-advance-validation.ts --campaign <slug> --mapping page-map.json --report validation_report.md
 *   npx tsx backend/prisma/scripts/seed-world-advance-validation.ts --campaign <slug> --mapping page-map.json --apply --density 15
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { prisma } from '../../src/lib/prisma.js';
import { previewWorldAdvance, applyWorldAdvance } from '../../src/lib/worldAdvanceService.js';
import { buildConvergenceOverlay } from '../../src/lib/chronologyConvergenceService.js';
import { ChronologyDomainKind } from '../../../shared/chronologyTypes.js';
import { CONVERGENCE_MAX_ENTRIES } from '../../../shared/chronologyConvergence.js';
import {
  WORLD_ADVANCE_SCENARIOS,
  type WorldAdvanceScenario,
} from '../../../shared/worldAdvanceScenarios.js';
import { resolveScenarioEffects } from '../../../shared/resolveWorldAdvanceScenario.js';
import {
  assertAntiGoals,
  assertPositiveExpectations,
  assertSignalLocality,
  type ValidationViolation,
} from '../../../shared/worldAdvanceValidationAssert.js';
import type { WorldAdvancePreview } from '../../../shared/worldAdvance.js';

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1]?.trim() : undefined;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function loadMapping(path: string): Record<string, string> {
  const raw = readFileSync(resolve(path), 'utf8');
  const parsed = JSON.parse(raw) as Record<string, string>;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Invalid mapping file: ${path}`);
  }
  return parsed;
}

function formatViolations(violations: ValidationViolation[]): string {
  if (!violations.length) return '- [x] All checks passed\n';
  return violations
    .map((v) => `- [ ] FAIL [${v.kind}] ${v.rule}: ${v.detail}`)
    .join('\n');
}

function antiGoalChecklist(
  scenario: WorldAdvanceScenario,
  preview: WorldAdvancePreview,
  pageIdByKey: Record<string, string>,
): string {
  const batchDomains = new Set(scenario.effects.map((e) => e.domain));
  const antiViolations = assertAntiGoals(
    preview,
    scenario.expectations.antiGoals,
    scenario.key,
    batchDomains,
  );
  const lines: string[] = [];
  const axes = scenario.expectations.antiGoals.axesMustNot ?? {};
  for (const [axis, levels] of Object.entries(axes)) {
    const hit = antiViolations.some((v) => v.rule.startsWith(`axis forbidden:${axis}`));
    lines.push(
      `- [${hit ? ' ' : 'x'}] No ${axis}: ${(levels as string[]).join(' / ')}`,
    );
  }
  for (const fragment of scenario.expectations.antiGoals.synthesisMustNotInclude ?? []) {
    const hit = antiViolations.some((v) => v.rule === `synthesis forbidden:${fragment}`);
    lines.push(`- [${hit ? ' ' : 'x'}] No synthesis "${fragment}"`);
  }
  if (!lines.length) lines.push(`- [x] Anti-goals: ${antiViolations.length ? 'see failures' : 'clear'}`);
  if (antiViolations.length) {
    lines.push('', formatViolations(antiViolations));
  }
  return lines.join('\n');
}

async function resolveActorUserId(campaignId: string): Promise<string> {
  const dm = await prisma.campaignMember.findFirst({
    where: { campaignId, role: 'GAMEMASTER' },
    select: { userId: true },
  });
  if (dm?.userId) return dm.userId;
  const any = await prisma.campaignMember.findFirst({
    where: { campaignId },
    select: { userId: true },
  });
  if (!any?.userId) throw new Error('Campaign has no members — cannot apply world advance');
  return any.userId;
}

async function main(): Promise<void> {
  const slug = argValue('--campaign');
  const mappingPath = argValue('--mapping');
  const reportPath = argValue('--report');
  const densityRaw = argValue('--density');
  const density = densityRaw ? Math.max(1, parseInt(densityRaw, 10) || 1) : 0;
  const doApply = hasFlag('--apply');

  if (!slug || !mappingPath) {
    console.error(
      'Required: --campaign <slug> --mapping <json>\nOptional: --apply --report <path> --density <N>',
    );
    process.exit(1);
  }

  const campaign = await prisma.campaign.findFirst({
    where: { slug },
    select: { id: true, name: true, handle: true },
  });
  if (!campaign) {
    console.error(`Campaign not found: ${slug}`);
    process.exit(1);
  }

  const pageIdByKey = loadMapping(mappingPath);
  const actorUserId = doApply ? await resolveActorUserId(campaign.id) : null;
  const reportSections: string[] = [
    `# World advance validation — ${campaign.name}`,
    '',
    `Campaign: \`${campaign.handle}\` · Mode: ${doApply ? 'apply' : 'preview-only'}`,
    '',
  ];

  for (const scenario of WORLD_ADVANCE_SCENARIOS) {
    const request = resolveScenarioEffects(scenario, pageIdByKey);
    let preview: WorldAdvancePreview | null = null;
    let chronologyEventId: string | null = null;

    const runs = density > 0 && doApply ? density : 1;
    for (let i = 0; i < runs; i++) {
      const body = {
        ...request,
        batchIdempotencyKey: `validation-${scenario.key}-${Date.now()}-${i}`,
      };
      if (doApply && actorUserId) {
        const result = await applyWorldAdvance(campaign.id, actorUserId, body);
        if (!result) {
          console.warn(`Apply failed for ${scenario.key} (run ${i + 1})`);
          continue;
        }
        preview = result;
        chronologyEventId = result.chronologyEventId;
      } else {
        preview = await previewWorldAdvance(campaign.id, body);
      }
    }

    if (!preview) {
      reportSections.push(`## ${scenario.key}`, '', '_Preview/apply failed — check page mapping._', '');
      continue;
    }

    const batchDomains = new Set(scenario.effects.map((e) => e.domain));
    const violations = [
      ...assertPositiveExpectations(preview, scenario.expectations.positive, scenario.key),
      ...assertAntiGoals(preview, scenario.expectations.antiGoals, scenario.key, batchDomains),
      ...assertSignalLocality(
        preview,
        scenario.expectations.locality,
        scenario,
        scenario.key,
        { pageIdByKey },
      ),
    ];

    const chips = preview.conditionSurfaces
      .filter((s) => s.scopeKind === 'region')
      .map((s) => `${s.regionLabel ?? 'Region'}: ${s.axis}=${s.level}`)
      .join(', ');

    reportSections.push(
      `## ${scenario.key}`,
      '',
      `| Field | Value |`,
      `|-------|-------|`,
      `| Headline | ${preview.narrativeSynthesis.headline} |`,
      `| Conditions | ${chips || '(none)'} |`,
      `| Effects | ${request.effects.length} |`,
      `| Chronology event | ${chronologyEventId ?? '—'} |`,
      `| Validation | ${violations.length === 0 ? 'PASS' : 'FAIL'} |`,
      '',
      `### ${scenario.key} — anti-goals`,
      antiGoalChecklist(scenario, preview, pageIdByKey),
      '',
      `### ${scenario.key} — locality`,
      formatViolations(
        violations.filter((v) => v.kind === 'locality' || v.kind === 'citation'),
      ),
      '',
    );

    console.log(
      `${scenario.key}: ${violations.length === 0 ? 'PASS' : `FAIL (${violations.length})`}`,
    );
  }

  if (doApply && density > 0) {
    const overlay = await buildConvergenceOverlay({
      campaignId: campaign.id,
      campaignHandle: campaign.handle,
      role: 'GAMEMASTER',
      allowPlayerChronologyManagement: false,
      window: { mode: 'EPOCH_RANGE', from: '0', to: '999999999999999999' },
      domains: [ChronologyDomainKind.WORLD_ADVANCE],
      sessionLinkedOnly: false,
      includeSuppressed: true,
    });
    const worldCount = overlay.entries.filter(
      (e) => e.domain === ChronologyDomainKind.WORLD_ADVANCE,
    ).length;
    reportSections.push(
      '## Chronology density',
      '',
      `- \`totalCollected\`: ${overlay.truncation.totalCollected}`,
      `- \`world_advance\` entries: ${worldCount}`,
      `- \`truncation.capped\`: ${overlay.truncation.capped}`,
      `- \`CONVERGENCE_MAX_ENTRIES\`: ${CONVERGENCE_MAX_ENTRIES}`,
      '',
      overlay.truncation.capped
        ? '> Recommendation: enable WORLD_ADVANCE batch grouping in CampaignFeedView.'
        : '> Feed grouping not required at current density.',
      '',
    );
    console.log(
      `Density: collected=${overlay.truncation.totalCollected} world_advance=${worldCount} capped=${overlay.truncation.capped}`,
    );
  }

  const report = reportSections.join('\n');
  if (reportPath) {
    writeFileSync(resolve(reportPath), report, 'utf8');
    console.log(`Wrote ${reportPath}`);
  } else {
    console.log('\n' + report);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
