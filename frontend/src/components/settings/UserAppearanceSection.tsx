import { useCallback, useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { AppearanceBuilder } from '@/components/appearance/AppearanceBuilder';
import { useBranding } from '@/contexts/BrandingContext';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { fetchUserProfile, updateUserProfile } from '@/lib/user';
import {
  getMasterPageWidthPreference,
  setMasterPageWidthPreference,
  type MasterPageWidth,
} from '@/lib/pageWidthPreference';
import {
  DEFAULT_THEME_PROFILE,
  isAppearanceProfileDefined,
  normalizeThemeProfile,
  resolveThemeProfile,
  serializeAppearanceProfile,
  type ThemeProfile,
} from '@/lib/theme';

export function UserAppearanceSection() {
  const { user } = useAuth();
  const {
    systemDefaultProfile,
    campaignPref,
    setPreviewOverlay,
    clearPreviewOverlay,
    refreshBranding,
    hasPreviewOverlay,
  } = useBranding();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [useCampaignDefault, setUseCampaignDefault] = useState(true);
  const [allowOverride, setAllowOverride] = useState(true);
  const [localProfile, setLocalProfile] = useState<ThemeProfile>(DEFAULT_THEME_PROFILE);
  const [isDirty, setIsDirty] = useState(false);
  const [pageWidth, setPageWidth] = useState<MasterPageWidth>(() =>
    getMasterPageWidthPreference(),
  );

  const campaignPrefRef = useRef(campaignPref);
  const systemDefaultRef = useRef(systemDefaultProfile);
  campaignPrefRef.current = campaignPref;
  systemDefaultRef.current = systemDefaultProfile;

  const computeResolvedPreview = useCallback(
    (
      profile: ThemeProfile,
      useDefault: boolean,
      override: boolean,
    ): ThemeProfile => {
      return resolveThemeProfile({
        userPref: useDefault ? null : profile,
        campaignPref: campaignPrefRef.current,
        systemDefault: systemDefaultRef.current,
        allowCampaignSystemOverride: override,
      });
    },
    [],
  );

  const pushPreviewOverlay = useCallback(
    (profile: ThemeProfile, useDefault: boolean, override: boolean) => {
      const resolved = computeResolvedPreview(profile, useDefault, override);
      setPreviewOverlay(resolved);
      setIsDirty(true);
    },
    [computeResolvedPreview, setPreviewOverlay],
  );

  useEffect(() => {
    return () => {
      clearPreviewOverlay();
    };
  }, [clearPreviewOverlay]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchUserProfile()
      .then((userProfile) => {
        if (cancelled) return;
        const hasCustom = isAppearanceProfileDefined(userProfile.appearanceProfile);
        const useDefault = !hasCustom;
        const override = userProfile.allowCampaignSystemOverride ?? true;
        setUseCampaignDefault(useDefault);
        setAllowOverride(override);
        const loaded = hasCustom
          ? normalizeThemeProfile(userProfile.appearanceProfile!)
          : { ...DEFAULT_THEME_PROFILE };
        setLocalProfile(loaded);
        setIsDirty(false);
        clearPreviewOverlay();
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load appearance.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, clearPreviewOverlay]);

  const handleUseCampaignDefaultChange = (checked: boolean) => {
    setUseCampaignDefault(checked);
    pushPreviewOverlay(localProfile, checked, allowOverride);
  };

  const handleAllowOverrideChange = (checked: boolean) => {
    setAllowOverride(checked);
    pushPreviewOverlay(localProfile, useCampaignDefault, checked);
  };

  const handleBuilderPreview = useCallback(
    (profile: ThemeProfile) => {
      pushPreviewOverlay(profile, useCampaignDefault, allowOverride);
    },
    [allowOverride, pushPreviewOverlay, useCampaignDefault],
  );

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const normalized = normalizeThemeProfile(localProfile);
      await updateUserProfile({
        appearanceProfile: useCampaignDefault
          ? null
          : serializeAppearanceProfile(normalized),
        allowCampaignSystemOverride: allowOverride,
      });
      clearPreviewOverlay();
      setLocalProfile(normalized);
      setIsDirty(false);
      refreshBranding();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save appearance.');
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <p className="text-sm text-muted">Sign in to customize your personal appearance.</p>
    );
  }

  if (loading) return <LoadingSpinner label="Loading appearance…" />;

  return (
    <div className="space-y-6">
      {(isDirty || hasPreviewOverlay) && (
        <div
          className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-2.5 text-sm text-foreground"
          role="status"
        >
          You have unsaved appearance changes. Save to apply, or leave this page to revert
          the preview.
        </div>
      )}

      <div className="space-y-3 rounded-lg border border-border bg-elevated/40 p-4">
        <div>
          <span className="block text-sm font-medium text-foreground">Document page width</span>
          <span className="mt-0.5 block text-xs text-muted">
            Affects centered document pages (settings, world tools) and the global hub.
            Codex and campaign workspace routes use full composition width.
          </span>
        </div>
        <div className="rounded-lg border border-border bg-background p-1">
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => {
                setPageWidth('standard');
                setMasterPageWidthPreference('standard');
              }}
              className={`rounded-md px-2 py-2 text-xs font-medium transition-colors ${
                pageWidth === 'standard'
                  ? 'bg-primary text-background'
                  : 'text-foreground hover:bg-elevated'
              }`}
            >
              Standard
            </button>
            <button
              type="button"
              onClick={() => {
                setPageWidth('wide');
                setMasterPageWidthPreference('wide');
              }}
              className={`rounded-md px-2 py-2 text-xs font-medium transition-colors ${
                pageWidth === 'wide'
                  ? 'bg-primary text-background'
                  : 'text-foreground hover:bg-elevated'
              }`}
            >
              Wide
            </button>
          </div>
        </div>
        <p className="text-xs text-muted">
          Standard uses a bounded document layout. Wide relaxes the cap on document-mode
          pages only.
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-elevated/40 p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={useCampaignDefault}
            onChange={(e) => handleUseCampaignDefaultChange(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 rounded border-border bg-background text-primary focus:ring-accent/40"
          />
          <span>
            <span className="block text-sm font-medium text-foreground">
              Use Campaign/System Default
            </span>
            <span className="mt-0.5 block text-xs text-muted">
              Clears your personal appearance so campaign and system settings apply (if
              override is allowed).
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={allowOverride}
            onChange={(e) => handleAllowOverrideChange(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 rounded border-border bg-background text-primary focus:ring-accent/40"
          />
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="block text-sm font-medium text-foreground">
              Allow Campaign/System themes to override my settings
            </span>
            <span className="group relative inline-flex">
              <button
                type="button"
                className="inline-flex rounded p-0.5 text-muted transition-colors hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                aria-describedby="user-override-hint"
              >
                <Info className="size-4 shrink-0" aria-hidden />
                <span className="sr-only">About campaign override</span>
              </button>
              <span
                id="user-override-hint"
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded-md border border-border bg-surface px-2.5 py-2 text-xs font-normal leading-snug text-muted opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
              >
                When enabled, your campaign&apos;s appearance applies whenever you
                haven&apos;t set a personal theme. Turn off to always use your personal
                theme or the system default.
              </span>
            </span>
          </span>
        </label>
      </div>

      <div className={useCampaignDefault ? 'sr-only' : undefined} aria-hidden={useCampaignDefault}>
        <AppearanceBuilder
          value={localProfile}
          onChange={setLocalProfile}
          isPreview
          onPreview={handleBuilderPreview}
          previewHint="Preview updates as you edit. Nothing is saved until you confirm below."
        />
      </div>

      {useCampaignDefault ? (
        <p className="rounded-lg border border-border bg-background/60 px-4 py-3 text-sm text-muted">
          Using{' '}
          {allowOverride && campaignPref ? 'campaign' : 'system'} appearance. Uncheck
          &quot;Use Campaign/System Default&quot; above to customize your personal theme.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg border border-emerald-800/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
          Appearance saved.
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-background hover:bg-primary-hover disabled:opacity-60 transition-colors"
        >
          {saving ? 'Saving…' : 'Save appearance'}
        </button>
      </div>
    </div>
  );
}
