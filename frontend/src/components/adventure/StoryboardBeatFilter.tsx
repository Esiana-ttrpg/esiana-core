import type { SceneBeatType } from '@/lib/sceneMetadata';
import {
  BEATS_BY_DRAMATIC_GROUP,
  NARRATIVE_BEAT_DRAMATIC_GROUPS,
  NARRATIVE_BEAT_GROUP_HINTS,
  NARRATIVE_BEAT_GROUP_LABELS,
} from '@/lib/sceneBeatVisualTokens';
import type { NarrativeBeatDramaticGroup } from '@shared/narrativeBeatTypes';
import { SceneBeatChip } from '@/components/scene/SceneBeatChip';

interface StoryboardBeatFilterProps {
  selectedBeatTypes: SceneBeatType[];
  readOnly?: boolean;
  onChange: (beatTypes: SceneBeatType[]) => void;
}

function toggleBeat(
  selected: SceneBeatType[],
  beat: SceneBeatType,
): SceneBeatType[] {
  if (selected.includes(beat)) {
    return selected.filter((entry) => entry !== beat);
  }
  return [...selected, beat];
}

export function StoryboardBeatFilter({
  selectedBeatTypes,
  readOnly = false,
  onChange,
}: StoryboardBeatFilterProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Beat filter
        </span>
        {!readOnly && selectedBeatTypes.length > 0 ? (
          <button
            type="button"
            className="text-[10px] text-muted-foreground underline hover:text-foreground"
            onClick={() => onChange([])}
          >
            Clear
          </button>
        ) : null}
      </div>
      <p className="text-[10px] text-muted-foreground/80">
        Structural dramatic roles — not emotional tone. Use scene Tone for feeling.
      </p>
      <div className="flex flex-col gap-2">
        {NARRATIVE_BEAT_DRAMATIC_GROUPS.map((group: NarrativeBeatDramaticGroup) => (
          <div key={group} className="space-y-1">
            <div
              className="text-[10px] font-medium text-muted-foreground"
              title={NARRATIVE_BEAT_GROUP_HINTS[group]}
            >
              {NARRATIVE_BEAT_GROUP_LABELS[group]}
            </div>
            <div className="flex flex-wrap gap-1">
              {BEATS_BY_DRAMATIC_GROUP[group].map((beat) => {
                const active = selectedBeatTypes.includes(beat);
                return (
                  <button
                    key={beat}
                    type="button"
                    disabled={readOnly}
                    className={`rounded transition-opacity ${active ? 'ring-1 ring-primary/50' : 'opacity-70 hover:opacity-100'} disabled:cursor-default`}
                    onClick={() => {
                      if (readOnly) return;
                      onChange(toggleBeat(selectedBeatTypes, beat));
                    }}
                  >
                    <SceneBeatChip beatType={beat} emphasis="inline" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function nodeMatchesBeatFilter(
  beatType: string | null | undefined,
  selectedBeatTypes: SceneBeatType[],
): boolean {
  if (selectedBeatTypes.length === 0) return true;
  if (!beatType) return false;
  return selectedBeatTypes.includes(beatType as SceneBeatType);
}
