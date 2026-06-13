import { useCallback, useEffect, useState } from 'react';
import { ImageIcon, PanelBottom, Palette, RotateCcw } from 'lucide-react';
import { useBranding } from '@/contexts/BrandingContext';
import { AppearanceBuilder } from '@/components/appearance/AppearanceBuilder';
import { AdminSectionCard, FieldLabel } from '@/components/admin/AdminSectionCard';
import {
  controlClasses,
  secondaryButtonClasses,
  textareaClasses,
} from '@/components/admin/adminFormStyles';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Toast } from '@/components/ui/Toast';
import { fetchAdminSettings, updateAdminSettings } from '@/lib/adminSettings';
import {
  DEFAULT_FAVICON,
  faviconConstraintsHelpText,
} from '@/lib/faviconConfig';
import { normalizeFooterConfig } from '@/lib/footerConfig';
import {
  DEFAULT_THEME_PROFILE,
  brandingToThemeProfile,
  normalizeThemeProfile,
  themeProfileToLegacyBranding,
  type ThemeProfile,
} from '@/lib/theme';
import type { FooterAlignment } from '@/types/admin';

const FOOTER_ALIGNMENT_OPTIONS: { value: FooterAlignment; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

export function AdminAppearanceTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [globalTitle, setGlobalTitle] = useState('Esiana');
  const [globalLogoUrl, setGlobalLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [footerCustomText, setFooterCustomText] = useState('');
  const [footerTosUrl, setFooterTosUrl] = useState('');
  const [footerPrivacyPolicyUrl, setFooterPrivacyPolicyUrl] = useState('');
  const [footerDiscordUrl, setFooterDiscordUrl] = useState('');
  const [footerGithubUrl, setFooterGithubUrl] = useState('');
  const [footerAlignment, setFooterAlignment] = useState<FooterAlignment>('center');
  const [themeProfile, setThemeProfile] = useState<ThemeProfile>(DEFAULT_THEME_PROFILE);
  const [showToast, setShowToast] = useState(false);
  const {
    applySystemBrandingSnapshot,
    setPreviewOverlay,
    clearPreviewOverlay,
  } = useBranding();

  const applyPreview = useCallback(
    (profile: ThemeProfile) => {
      setPreviewOverlay(normalizeThemeProfile(profile));
    },
    [setPreviewOverlay],
  );

  useEffect(() => {
    return () => {
      clearPreviewOverlay();
    };
  }, [clearPreviewOverlay]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    fetchAdminSettings()
      .then((row) => {
        if (cancelled) return;
        setGlobalTitle(row.branding.globalTitle || 'Esiana');
        setGlobalLogoUrl(row.branding.globalLogoUrl ?? '');
        setFaviconUrl(row.branding.faviconUrl ?? '');
        const footer = normalizeFooterConfig(row.footer);
        setFooterCustomText(footer.customText);
        setFooterTosUrl(footer.tosUrl);
        setFooterPrivacyPolicyUrl(footer.privacyPolicyUrl);
        setFooterDiscordUrl(footer.discordUrl);
        setFooterGithubUrl(footer.githubUrl);
        setFooterAlignment(footer.alignment);
        const profile = brandingToThemeProfile(row.branding);
        setThemeProfile(profile);
        applySystemBrandingSnapshot(row.branding, footer);
        applyPreview(profile);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Unable to load branding.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applyPreview, applySystemBrandingSnapshot]);

  function handleResetToDefaults() {
    const defaults = { ...DEFAULT_THEME_PROFILE };
    setThemeProfile(defaults);
    applyPreview(defaults);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const normalized = normalizeThemeProfile(themeProfile);
      const legacy = themeProfileToLegacyBranding(normalized);
      const footer = {
        customText: footerCustomText.trim(),
        tosUrl: footerTosUrl.trim(),
        privacyPolicyUrl: footerPrivacyPolicyUrl.trim(),
        discordUrl: footerDiscordUrl.trim(),
        githubUrl: footerGithubUrl.trim(),
        alignment: footerAlignment,
      };

      const settings = await updateAdminSettings({
        branding: {
          globalTitle: globalTitle.trim() || 'Esiana',
          globalLogoUrl: globalLogoUrl.trim() || null,
          faviconUrl: faviconUrl.trim() || null,
          ...legacy,
        },
        footer,
      });

      const savedProfile = brandingToThemeProfile(settings.branding);
      applySystemBrandingSnapshot(settings.branding, normalizeFooterConfig(settings.footer));
      setThemeProfile(savedProfile);
      applyPreview(savedProfile);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unable to save appearance.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading appearance settings…" />;

  if (loadError) {
    return (
      <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
        {loadError}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <AdminSectionCard
        title="Global Appearance"
        description="Platform title, logo, and favicon shown across the site."
        icon={ImageIcon}
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Platform display title</FieldLabel>
              <input
                type="text"
                value={globalTitle}
                onChange={(e) => setGlobalTitle(e.target.value)}
                maxLength={80}
                className={controlClasses}
              />
            </div>
            <div>
              <FieldLabel>Logo image URL</FieldLabel>
              <input
                type="url"
                value={globalLogoUrl}
                onChange={(e) => setGlobalLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className={controlClasses}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Favicon URL</FieldLabel>
            <input
              type="url"
              value={faviconUrl}
              onChange={(e) => setFaviconUrl(e.target.value)}
              placeholder="https://example.com/favicon.png"
              className={controlClasses}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Leave empty to use the default static favicon ({DEFAULT_FAVICON}).
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {faviconConstraintsHelpText()}
            </p>
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="Theme"
        description="Build a theme profile from foundation mode, genre vibe, and identity palettes."
        icon={Palette}
      >
        <AppearanceBuilder
          value={themeProfile}
          onChange={setThemeProfile}
          onPreview={applyPreview}
          isPreview={false}
          previewHint="Changes preview live. Save to persist for all users."
        />
      </AdminSectionCard>

      <AdminSectionCard
        title="Footer"
        description="Configure site-wide footer text and links shown on hub and campaign pages."
        icon={PanelBottom}
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Custom text</FieldLabel>
            <textarea
              value={footerCustomText}
              onChange={(e) => setFooterCustomText(e.target.value)}
              rows={2}
              placeholder="Optional copyright or attribution line"
              className={textareaClasses}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Terms of Service URL</FieldLabel>
              <input
                type="url"
                value={footerTosUrl}
                onChange={(e) => setFooterTosUrl(e.target.value)}
                placeholder="https://example.com/terms"
                className={controlClasses}
              />
            </div>
            <div>
              <FieldLabel>Privacy Policy URL</FieldLabel>
              <input
                type="url"
                value={footerPrivacyPolicyUrl}
                onChange={(e) => setFooterPrivacyPolicyUrl(e.target.value)}
                placeholder="https://example.com/privacy"
                className={controlClasses}
              />
            </div>
            <div>
              <FieldLabel>Discord URL</FieldLabel>
              <input
                type="url"
                value={footerDiscordUrl}
                onChange={(e) => setFooterDiscordUrl(e.target.value)}
                placeholder="https://discord.gg/..."
                className={controlClasses}
              />
            </div>
            <div>
              <FieldLabel>GitHub URL</FieldLabel>
              <input
                type="url"
                value={footerGithubUrl}
                onChange={(e) => setFooterGithubUrl(e.target.value)}
                placeholder="https://github.com/..."
                className={controlClasses}
              />
            </div>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-foreground">Alignment</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {FOOTER_ALIGNMENT_OPTIONS.map(({ value, label }) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface/60 px-3 py-2 text-sm text-foreground hover:border-border"
                >
                  <input
                    type="radio"
                    name="footerAlignment"
                    value={value}
                    checked={footerAlignment === value}
                    onChange={() => setFooterAlignment(value)}
                    className="border-border bg-elevated text-primary0 focus:ring-primary/40"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </AdminSectionCard>

      {saveError && (
        <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {saveError}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
        <button
          type="button"
          onClick={handleResetToDefaults}
          className={`${secondaryButtonClasses} gap-2`}
        >
          <RotateCcw className="size-4" />
          Reset to defaults
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-background hover:bg-primary-hover disabled:opacity-60 transition-colors"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      <Toast message="Global appearance updated successfully" visible={showToast} />
    </div>
  );
}
