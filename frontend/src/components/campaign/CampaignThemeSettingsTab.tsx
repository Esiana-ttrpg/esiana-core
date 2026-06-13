import { FormEvent, useEffect, useState } from 'react';
import {
  DEFAULT_THEME_PRESET,
  THEME_PRESET_IDS,
  campaignThemeClassName,
  isThemePresetId,
  listThemes,
  type ThemePresetId,
} from '@/lib/theme';

const PRESET_LABELS: Record<ThemePresetId, string> = {
  light: 'Light',
  dark: 'Dark',
  auto: 'Auto (system)',
  fantasy: 'Fantasy',
  cyberpunk: 'Cyberpunk',
  parchment: 'Parchment',
};

interface CampaignThemeSettingsTabProps {
  themePreset: ThemePresetId;
  onThemePresetChange: (preset: ThemePresetId) => void;
  onSave: (preset: ThemePresetId) => Promise<void>;
  saving?: boolean;
  error?: string;
  success?: boolean;
  controlClasses: string;
}

export function CampaignThemeSettingsTab({
  themePreset,
  onThemePresetChange,
  onSave,
  saving = false,
  error,
  success,
  controlClasses,
}: CampaignThemeSettingsTabProps) {
  const [localPreset, setLocalPreset] = useState(themePreset);
  const previewClass = campaignThemeClassName(localPreset);
  const registered = listThemes();

  useEffect(() => {
    setLocalPreset(themePreset);
  }, [themePreset]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onSave(localPreset);
    onThemePresetChange(localPreset);
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h2 className="mb-2 text-lg font-semibold text-white">Theme Settings</h2>
      <p className="mb-6 text-sm text-muted">
        Choose a visual preset for this campaign. Themes apply to the campaign workspace
        and can be extended later via theme plugins.
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        <div>
          <label className="mb-2 block text-sm text-foreground">Theme Preset</label>
          <select
            value={localPreset}
            onChange={(e) => {
              const next = e.target.value;
              if (isThemePresetId(next)) setLocalPreset(next);
            }}
            className={controlClasses}
          >
            {THEME_PRESET_IDS.map((id) => (
              <option key={id} value={id}>
                {PRESET_LABELS[id]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="mb-2 text-sm text-foreground">Preview</p>
          <div
            className={`${previewClass} overflow-hidden rounded-lg border border-[var(--color-border)]`}
          >
            <div className="campaign-theme-shell p-5">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                Campaign header accent
              </p>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-text)' }}>
                Body text on themed background
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Muted supporting text
              </p>
              <button
                type="button"
                className="mt-4 rounded px-3 py-1.5 text-sm font-medium text-background"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Primary action
              </button>
            </div>
          </div>
        </div>

        <div className="rounded border border-border bg-background p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Registered themes
          </p>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {registered.map((theme) => (
              <li key={theme.pluginId}>
                <span className="text-foreground">{theme.name}</span>
                <span className="text-muted"> — {theme.pluginId}</span>
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <div className="rounded border border-red-700 bg-red-950/50 p-3 text-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded border border-emerald-700 bg-emerald-950/50 p-3 text-emerald-200">
            Theme preset saved successfully.
          </div>
        )}

        <button
          type="submit"
          disabled={saving || localPreset === themePreset}
          className="h-10 rounded border border-border bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover disabled:bg-elevated"
        >
          {saving ? 'Saving...' : 'Save Theme'}
        </button>
      </form>
    </div>
  );
}

export { DEFAULT_THEME_PRESET };
