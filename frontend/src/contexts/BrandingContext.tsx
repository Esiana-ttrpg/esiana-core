import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDocumentBranding } from '@/hooks/useDocumentBranding';
import { DEFAULT_FOOTER_CONFIG, normalizeFooterConfig } from '@/lib/footerConfig';
import { fetchPublicSystemStatus } from '@/lib/publicSystem';
import { fetchUserProfile } from '@/lib/user';
import type { FooterConfig, PublicSystemStatus, SystemBrandingSettings } from '@/types/admin';
import {
  applyThemeProfile,
  cacheGlobalBackgroundTint,
  cacheGlobalPalette,
  cacheGlobalThemePreset,
  cacheThemeProfile,
  DEFAULT_THEME_PROFILE,
  isAppearanceProfileDefined,
  brandingToThemeProfile,
  legacyBrandingToThemeProfile,
  normalizeThemeProfile,
  resolveThemeProfile,
  themeProfileSignature,
  themeProfileToLegacyBranding,
  type ThemeProfile,
} from '@/lib/theme';

const DEFAULT_TITLE = 'Esiana';

export interface BrandingState {
  globalTitle: string;
  globalLogoUrl: string | null;
  faviconUrl: string | null;
  footer: FooterConfig;
  systemDefaultProfile: ThemeProfile;
  userPref: Partial<ThemeProfile> | null;
  allowCampaignSystemOverride: boolean;
  campaignPref: Partial<ThemeProfile> | null;
  resolvedProfile: ThemeProfile;
  /** @deprecated Use resolvedProfile */
  themeProfile: ThemeProfile;
  /** Temporary preview while editing appearance (does not persist user/campaign prefs). */
  hasPreviewOverlay: boolean;
  setPreviewOverlay: (profile: ThemeProfile | null) => void;
  clearPreviewOverlay: () => void;
  setCampaignAppearance: (profile: Partial<ThemeProfile> | null) => void;
  /** Apply system branding snapshot without clearing preview overlay. */
  applySystemBrandingSnapshot: (
    branding: SystemBrandingSettings,
    footer?: FooterConfig,
  ) => void;
  refreshBranding: (options?: { preservePreview?: boolean }) => void;
}

const BrandingContext = createContext<BrandingState | null>(null);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [globalTitle, setGlobalTitle] = useState(DEFAULT_TITLE);
  const [globalLogoUrl, setGlobalLogoUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [footer, setFooter] = useState<FooterConfig>(DEFAULT_FOOTER_CONFIG);
  const [systemDefaultProfile, setSystemDefaultProfile] =
    useState<ThemeProfile>(DEFAULT_THEME_PROFILE);
  const [userPref, setUserPref] = useState<Partial<ThemeProfile> | null>(null);
  const [allowCampaignSystemOverride, setAllowCampaignSystemOverride] = useState(true);
  const [campaignPref, setCampaignPref] = useState<Partial<ThemeProfile> | null>(null);
  const [previewOverlay, setPreviewOverlayState] = useState<ThemeProfile | null>(null);

  const userPrefKey = themeProfileSignature(userPref);
  const campaignPrefKey = themeProfileSignature(campaignPref);
  const systemDefaultKey = themeProfileSignature(systemDefaultProfile);

  const committedResolved = useMemo(
    () =>
      resolveThemeProfile({
        userPref,
        campaignPref,
        systemDefault: systemDefaultProfile,
        allowCampaignSystemOverride,
      }),
    [
      userPrefKey,
      campaignPrefKey,
      systemDefaultKey,
      allowCampaignSystemOverride,
      userPref,
      campaignPref,
      systemDefaultProfile,
    ],
  );

  const previewOverlayKey = themeProfileSignature(previewOverlay);

  const resolvedProfile = useMemo(() => {
    if (previewOverlay) {
      return normalizeThemeProfile(previewOverlay);
    }
    return committedResolved;
  }, [previewOverlay, previewOverlayKey, committedResolved]);

  const lastAppliedKey = useRef<string>('');

  useEffect(() => {
    const key = themeProfileSignature(resolvedProfile);
    if (key === lastAppliedKey.current) return;
    lastAppliedKey.current = key;
    applyThemeProfile(resolvedProfile);
    if (!previewOverlay) {
      const legacy = themeProfileToLegacyBranding(resolvedProfile);
      cacheThemeProfile(resolvedProfile);
      cacheGlobalThemePreset(legacy.globalThemePreset);
      cacheGlobalPalette(legacy.globalPalette);
      cacheGlobalBackgroundTint(legacy.applyBackgroundTint);
    }
  }, [resolvedProfile, previewOverlay]);

  const applySystemBrandingSnapshot = useCallback(
    (branding: SystemBrandingSettings, footer?: FooterConfig) => {
      setGlobalTitle(branding.globalTitle || DEFAULT_TITLE);
      setGlobalLogoUrl(branding.globalLogoUrl ?? null);
      setFaviconUrl(branding.faviconUrl ?? null);
      if (footer) {
        setFooter(normalizeFooterConfig(footer));
      }
      setSystemDefaultProfile(brandingToThemeProfile(branding));
    },
    [],
  );

  const ingestPublicSystemStatus = useCallback(
    (status: PublicSystemStatus) => {
      applySystemBrandingSnapshot(
        {
          globalTitle: status.globalTitle,
          globalLogoUrl: status.globalLogoUrl,
          faviconUrl: status.faviconUrl,
          globalThemePreset: status.globalThemePreset,
          globalPalette: status.globalPalette,
          applyBackgroundTint: status.applyBackgroundTint,
          appearanceProfile: status.appearanceProfile,
        },
        status.footer,
      );
    },
    [applySystemBrandingSnapshot],
  );

  const loadSystemBranding = useCallback(async () => {
    const status = await fetchPublicSystemStatus();
    ingestPublicSystemStatus(status);
  }, [ingestPublicSystemStatus]);

  useDocumentBranding(globalTitle, faviconUrl);

  const loadUserAppearance = useCallback(async () => {
    if (!user) {
      setUserPref(null);
      setAllowCampaignSystemOverride(true);
      return;
    }
    try {
      const userProfile = await fetchUserProfile();
      setUserPref(
        isAppearanceProfileDefined(userProfile.appearanceProfile)
          ? userProfile.appearanceProfile
          : null,
      );
      setAllowCampaignSystemOverride(userProfile.allowCampaignSystemOverride ?? true);
    } catch {
      setUserPref(null);
    }
  }, [user]);

  const refreshBranding = useCallback(
    (options?: { preservePreview?: boolean }) => {
      if (!options?.preservePreview) {
        setPreviewOverlayState(null);
        lastAppliedKey.current = '';
      }
      void loadSystemBranding();
      void loadUserAppearance();
    },
    [loadSystemBranding, loadUserAppearance],
  );

  useEffect(() => {
    loadSystemBranding().catch(() => undefined);
  }, [loadSystemBranding]);

  useEffect(() => {
    loadUserAppearance().catch(() => undefined);
  }, [loadUserAppearance]);

  const setPreviewOverlay = useCallback((profile: ThemeProfile | null) => {
    setPreviewOverlayState(profile ? normalizeThemeProfile(profile) : null);
  }, []);

  const clearPreviewOverlay = useCallback(() => {
    setPreviewOverlayState(null);
    lastAppliedKey.current = '';
  }, []);

  const setCampaignAppearance = useCallback((profile: Partial<ThemeProfile> | null) => {
    if (profile == null) {
      setCampaignPref(null);
      return;
    }
    const normalized = normalizeThemeProfile(profile);
    setCampaignPref((prev) => {
      const prevKey = themeProfileSignature(prev);
      const nextKey = themeProfileSignature(normalized);
      return prevKey === nextKey ? prev! : normalized;
    });
  }, []);

  const value = useMemo<BrandingState>(
    () => ({
      globalTitle,
      globalLogoUrl,
      faviconUrl,
      footer,
      systemDefaultProfile,
      userPref,
      allowCampaignSystemOverride,
      campaignPref,
      resolvedProfile,
      themeProfile: resolvedProfile,
      hasPreviewOverlay: previewOverlay != null,
      setPreviewOverlay,
      clearPreviewOverlay,
      setCampaignAppearance,
      applySystemBrandingSnapshot,
      refreshBranding,
    }),
    [
      globalTitle,
      globalLogoUrl,
      faviconUrl,
      footer,
      systemDefaultProfile,
      userPref,
      allowCampaignSystemOverride,
      campaignPref,
      resolvedProfile,
      previewOverlay,
      setPreviewOverlay,
      clearPreviewOverlay,
      setCampaignAppearance,
      applySystemBrandingSnapshot,
      refreshBranding,
    ],
  );

  return (
    <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
  );
}

export function useBranding(): BrandingState {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    throw new Error('useBranding must be used within BrandingProvider');
  }
  return ctx;
}

/** Parse campaign API/wiki appearance into a partial profile for resolution. */
export function campaignAppearanceFromApi(
  appearanceProfile: unknown,
  themePreset?: string | null,
): Partial<ThemeProfile> | null {
  if (isAppearanceProfileDefined(appearanceProfile)) {
    return normalizeThemeProfile(appearanceProfile);
  }
  if (!themePreset?.trim()) return null;
  return legacyBrandingToThemeProfile({ globalThemePreset: themePreset });
}
