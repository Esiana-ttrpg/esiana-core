import type { HubAttentionItem } from './buildHubAttentionQueue.js';
import { truncateTensionLine } from './truncateNarrativeText.js';

export type HubArcIdentity = {
  currentArc: string | null;
  tensionLine: string | null;
  continuityBullets: string[];
};

export type ArcResolutionInput = {
  heroCurrentArc?: string | null;
  heroSummary?: string | null;
  topThreadTitle?: string | null;
  topQuestTitle?: string | null;
  recruitmentTagline?: string | null;
  description?: string | null;
  lastSessionSnippet?: string | null;
  attentionItems: HubAttentionItem[];
  recentEditTitles?: string[];
};

export function resolveCurrentArc(input: ArcResolutionInput): string | null {
  if (input.heroCurrentArc?.trim()) return input.heroCurrentArc.trim();
  if (input.topThreadTitle?.trim()) return input.topThreadTitle.trim();
  if (input.topQuestTitle?.trim()) return input.topQuestTitle.trim();
  const summary = input.heroSummary?.trim();
  if (summary) {
    const first = summary.split(/[.!?\n]/)[0]?.trim();
    if (first && first.length >= 4) return first;
  }
  if (input.recruitmentTagline?.trim()) return input.recruitmentTagline.trim();
  if (input.description?.trim()) {
    const first = input.description.trim().split(/[.!?\n]/)[0]?.trim();
    if (first && first.length >= 4) return first.slice(0, 80);
  }
  return null;
}

export function resolveTensionLine(input: ArcResolutionInput): string | null {
  if (input.lastSessionSnippet?.trim()) {
    return truncateTensionLine(input.lastSessionSnippet);
  }
  if (input.heroSummary?.trim()) {
    return truncateTensionLine(input.heroSummary);
  }
  if (input.topThreadTitle?.trim()) {
    return truncateTensionLine(`The ${input.topThreadTitle.trim()} thread remains open.`);
  }
  return null;
}

export function buildContinuityBullets(input: ArcResolutionInput, max = 3): string[] {
  const bullets: string[] = [];
  const seen = new Set<string>();

  const pushUnique = (label: string) => {
    if (bullets.length >= max || seen.has(label)) return;
    seen.add(label);
    bullets.push(label);
  };

  for (const item of input.attentionItems) {
    if (item.severity === 'whisper') continue;
    pushUnique(item.label);
  }
  for (const title of input.recentEditTitles ?? []) {
    pushUnique(`${title} edited recently`);
  }
  return bullets.slice(0, max);
}

export function buildArcIdentity(input: ArcResolutionInput): HubArcIdentity {
  return {
    currentArc: resolveCurrentArc(input),
    tensionLine: resolveTensionLine(input),
    continuityBullets: buildContinuityBullets(input),
  };
}
