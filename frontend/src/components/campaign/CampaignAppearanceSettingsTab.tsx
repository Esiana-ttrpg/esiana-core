import { useCallback, useEffect, useState } from 'react';
import { AppearanceBuilder } from '@/components/appearance/AppearanceBuilder';
import { useBranding } from '@/contexts/BrandingContext';
import {
  DEFAULT_THEME_PROFILE,
  isAppearanceProfileDefined,
  legacyBrandingToThemeProfile,
  normalizeThemeProfile,
  serializeAppearanceProfile,
  themeProfileToLegacyBranding,
  type ThemeProfile,
} from '@/lib/theme';

interface CampaignAppearanceSettingsTabProps {
  campaignHandle: string;
  token: string | null;
  initialAppearanceProfile: ThemeProfile | null | undefined;
  initialThemePreset: string | undefined;
  onSaved?: () => void | Promise<void>;
}

export function CampaignAppearanceSettingsTab({
  campaignHandle,
  token,
  initialAppearanceProfile,
  initialThemePreset,
  onSaved,
}: CampaignAppearanceSettingsTabProps) {
  const { setCampaignAppearance, setPreviewOverlay, clearPreviewOverlay } = useBranding();
  const [themeProfile, setThemeProfile] = useState<ThemeProfile>(DEFAULT_THEME_PROFILE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isAppearanceProfileDefined(initialAppearanceProfile)) {
      setThemeProfile(normalizeThemeProfile(initialAppearanceProfile));
      return;
    }
    if (initialThemePreset) {
      setThemeProfile(
        legacyBrandingToThemeProfile({ globalThemePreset: initialThemePreset }),
      );
    }
  }, [initialAppearanceProfile, initialThemePreset]);

  useEffect(() => {
    return () => clearPreviewOverlay();
  }, [clearPreviewOverlay]);

  const applyPreview = useCallback(
    (profile: ThemeProfile) => {
      setPreviewOverlay(normalizeThemeProfile(profile));
    },
    [setPreviewOverlay],
  );

  async function handleSave() {
    setError('');
    setSuccess(false);
    setSaving(true);
    try {
      const normalized = normalizeThemeProfile(themeProfile);
      const legacy = themeProfileToLegacyBranding(normalized);
      const response = await fetch(`/api/campaigns/${campaignHandle}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          appearanceProfile: serializeAppearanceProfile(normalized),
          themePreset: legacy.globalThemePreset,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to save campaign appearance');
        return;
      }

      clearPreviewOverlay();
      setCampaignAppearance(normalized);
      await onSaved?.();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Failed to save campaign appearance');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h2 className="mb-2 text-lg font-semibold text-foreground">Campaign Appearance</h2>
      <p className="mb-6 text-sm text-muted">
        Set the default look for this campaign. Members who use campaign/system defaults will
        see this theme.
      </p>

      <AppearanceBuilder
        value={themeProfile}
        onChange={setThemeProfile}
        isPreview
        onPreview={applyPreview}
        previewHint="Preview updates as you edit. Save to apply for this campaign."
      />

      {error ? (
        <div className="mt-4 rounded border border-red-700 bg-red-950/50 p-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mt-4 rounded border border-emerald-700 bg-emerald-950/50 p-3 text-sm text-emerald-200">
          Campaign appearance saved successfully.
        </div>
      ) : null}

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="h-10 rounded-lg bg-primary px-5 text-sm font-medium text-background hover:bg-primary-hover disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save appearance'}
        </button>
      </div>
    </div>
  );
}
