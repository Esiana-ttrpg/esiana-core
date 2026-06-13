import {
  STORYBOARD_MODE_LABELS,
  type StoryboardActiveMode,
} from '@shared/storyboardProjection';

const MODES: StoryboardActiveMode[] = [
  'arc_flow',
  'investigation',
  'session_prep',
  'continuity',
];

interface StoryboardModeToolbarProps {
  activeMode: StoryboardActiveMode;
  modeLegend: string;
  readOnly?: boolean;
  onChange: (mode: StoryboardActiveMode) => void;
}

export function StoryboardModeToolbar({
  activeMode,
  modeLegend,
  readOnly = false,
  onChange,
}: StoryboardModeToolbarProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1">
        {MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            disabled={readOnly}
            onClick={() => onChange(mode)}
            className={`rounded px-2 py-1 text-xs ${
              activeMode === mode
                ? 'bg-primary/15 font-medium text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {STORYBOARD_MODE_LABELS[mode]}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground/80">{modeLegend}</p>
    </div>
  );
}
