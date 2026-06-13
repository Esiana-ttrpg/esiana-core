import type { NarrativeBeatDramaticGroup } from '@shared/narrativeBeatTypes';
import {
  NARRATIVE_BEAT_DRAMATIC_GROUPS,
  NARRATIVE_BEAT_GROUP_HINTS,
  NARRATIVE_BEAT_GROUP_LABELS,
  NARRATIVE_BEAT_HINTS,
  NARRATIVE_BEAT_LABELS,
  formatNarrativeBeatLabel,
  narrativeBeatDramaticGroup,
} from '@shared/narrativeBeatTypes';
import type { SceneBeatType } from '@/lib/sceneMetadata';

export {
  NARRATIVE_BEAT_DRAMATIC_GROUPS,
  NARRATIVE_BEAT_GROUP_HINTS,
  NARRATIVE_BEAT_GROUP_LABELS,
  NARRATIVE_BEAT_HINTS,
  NARRATIVE_BEAT_LABELS,
  BEATS_BY_DRAMATIC_GROUP,
} from '@shared/narrativeBeatTypes';

export function formatSceneBeatLabel(
  beatType: SceneBeatType | string | null | undefined,
): string | null {
  return formatNarrativeBeatLabel(beatType);
}

export function sceneBeatDramaticGroup(
  beatType: SceneBeatType | string | null | undefined,
): NarrativeBeatDramaticGroup | null {
  return narrativeBeatDramaticGroup(beatType);
}

/** Muted group palettes — structural role only, not emotional valence. */
export const SCENE_BEAT_GROUP_CHIP_CLASS: Record<NarrativeBeatDramaticGroup, string> = {
  setup: 'border-slate-500/35 bg-slate-500/10 text-slate-200',
  escalation: 'border-amber-600/30 bg-amber-950/20 text-amber-100/90',
  pivot: 'border-violet-500/35 bg-violet-950/25 text-violet-100/90',
  resolution: 'border-teal-600/25 bg-teal-950/15 text-teal-100/85',
};

export const SCENE_BEAT_GROUP_BORDER_CLASS: Record<NarrativeBeatDramaticGroup, string> = {
  setup: 'border-slate-500/30',
  escalation: 'border-amber-600/25',
  pivot: 'border-violet-500/30',
  resolution: 'border-teal-600/20',
};

export function sceneBeatGroupChipClass(
  group: NarrativeBeatDramaticGroup | null,
): string {
  if (!group) return 'border-border bg-muted/30 text-muted-foreground';
  return SCENE_BEAT_GROUP_CHIP_CLASS[group];
}

export function sceneBeatChipClass(
  beatType: SceneBeatType | string | null | undefined,
): string {
  return sceneBeatGroupChipClass(sceneBeatDramaticGroup(beatType));
}

export function sceneBeatGroupBorderClass(
  group: NarrativeBeatDramaticGroup | null,
): string {
  if (!group) return 'border-border';
  return SCENE_BEAT_GROUP_BORDER_CLASS[group];
}

export function sceneBeatHint(beatType: SceneBeatType | string | null | undefined): string | null {
  if (typeof beatType !== 'string' || !beatType.trim()) return null;
  const key = beatType.trim().toLowerCase() as SceneBeatType;
  return NARRATIVE_BEAT_HINTS[key] ?? null;
}
