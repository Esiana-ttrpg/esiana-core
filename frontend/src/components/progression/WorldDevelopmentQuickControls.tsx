import {
  WORLD_DEVELOPMENT_MODE_HEADLINES,
} from '@shared/worldDevelopmentPresentation';
import {
  WORLD_DEVELOPMENT_MODES,
  type WorldDevelopmentMode,
  type WorldDevelopmentSettings,
} from '@shared/worldDevelopmentMetadata';
import { saveWorldDevelopmentSettings } from '@/lib/worldDevelopmentApi';

interface WorldDevelopmentQuickControlsProps {
  campaignHandle: string;
  mode: WorldDevelopmentMode;
  disabled?: boolean;
  onModeChange: (settings: WorldDevelopmentSettings) => void;
}

export function WorldDevelopmentQuickControls({
  campaignHandle,
  mode,
  disabled = false,
  onModeChange,
}: WorldDevelopmentQuickControlsProps) {
  async function handleModeChange(nextMode: WorldDevelopmentMode) {
    const result = await saveWorldDevelopmentSettings(campaignHandle, { mode: nextMode });
    onModeChange(result.settings);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <label className="flex items-center gap-2 text-muted-foreground">
        Mode
        <select
          className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
          value={mode}
          disabled={disabled}
          onChange={(e) => void handleModeChange(e.target.value as WorldDevelopmentMode)}
        >
          {WORLD_DEVELOPMENT_MODES.map((m) => (
            <option key={m} value={m}>
              {WORLD_DEVELOPMENT_MODE_HEADLINES[m]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
