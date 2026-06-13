import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Info, Sparkles, SunMoon, TreePine } from 'lucide-react';
import { FieldLabel } from '@/components/admin/AdminSectionCard';
import {
  APPEARANCE_PRESETS,
  DEFAULT_THEME_PROFILE,
  getProfilePreviewPalette,
  GLOBAL_PALETTES,
  normalizeThemeProfile,
  PALETTE_DISPLAY_NAMES,
  themeProfileSignature,
  type FoundationId,
  type FoundationPaletteId,
  type GenreId,
  type IdentityId,
  type ThemeProfile,
} from '@/lib/theme';

type AppearanceTab = 'foundation' | 'genre' | 'identity';

const APPEARANCE_TABS: Array<{
  id: AppearanceTab;
  label: string;
  icon: typeof SunMoon;
}> = [
  { id: 'foundation', label: 'Foundation (Mode)', icon: SunMoon },
  { id: 'genre', label: 'Genre', icon: TreePine },
  { id: 'identity', label: 'Identity / Holiday', icon: Sparkles },
];

function PaletteSwatchPreview({
  profile,
  applyBackgroundTint,
}: {
  profile: ThemeProfile;
  applyBackgroundTint: boolean;
}) {
  const palette = getProfilePreviewPalette(profile);
  return (
    <div className="mt-3 rounded-lg border border-border bg-background p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
        Live preview
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="h-7 w-7 rounded-full border border-border"
          style={{ backgroundColor: palette.primary }}
          title="Primary"
        />
        <span
          className="h-7 w-7 rounded-full border border-border"
          style={{ backgroundColor: palette.primaryHover }}
          title="Primary hover"
        />
        <span
          className="h-7 w-7 rounded-full border border-border"
          style={{ backgroundColor: palette.accent }}
          title="Accent"
        />
        {applyBackgroundTint ? (
          <>
            <span
              className="h-7 w-7 rounded border border-border"
              style={{ backgroundColor: palette.bg }}
              title="Background"
            />
            <span
              className="h-7 w-7 rounded border border-border"
              style={{ backgroundColor: palette.surface }}
              title="Surface"
            />
          </>
        ) : null}
        <button
          type="button"
          className="ml-2 rounded px-3 py-1.5 text-xs font-semibold text-background"
          style={{ backgroundColor: palette.primary }}
        >
          Sample button
        </button>
      </div>
    </div>
  );
}

function SelectionCard({
  selected,
  title,
  description,
  onClick,
  disabled,
  children,
}: {
  selected: boolean;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? 'border-accent bg-accent/10 ring-1 ring-accent/40'
          : 'border-border bg-surface hover:border-accent/40 hover:bg-elevated'
      }`}
    >
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted">{description}</p>
      {children}
    </button>
  );
}

export interface AppearanceBuilderProps {
  /** Initial / external value (synced into local state when signature changes). */
  value: ThemeProfile;
  onChange?: (profile: ThemeProfile) => void;
  /** Live preview callback — parent applies overlay without persisting. */
  onPreview?: (profile: ThemeProfile) => void;
  disabled?: boolean;
  headerSlot?: ReactNode;
  footerSlot?: ReactNode;
  previewHint?: string;
  showGlobalTinting?: boolean;
  /** When true, only local state + onPreview; shows save banner. */
  isPreview?: boolean;
}

function AppearanceBuilderInner({
  value,
  onChange,
  onPreview,
  disabled = false,
  headerSlot,
  footerSlot,
  previewHint,
  showGlobalTinting = true,
  isPreview = false,
}: AppearanceBuilderProps) {
  const [activeTab, setActiveTab] = useState<AppearanceTab>('foundation');
  const [localProfile, setLocalProfile] = useState<ThemeProfile>(() =>
    normalizeThemeProfile(value ?? DEFAULT_THEME_PROFILE),
  );

  const externalKey = themeProfileSignature(value);

  useEffect(() => {
    setLocalProfile(normalizeThemeProfile(value ?? DEFAULT_THEME_PROFILE));
  }, [externalKey, value]);

  const previewProfile = useMemo(
    () => normalizeThemeProfile(localProfile),
    [localProfile],
  );

  const emitChange = useCallback(
    (next: ThemeProfile) => {
      const normalized = normalizeThemeProfile(next);
      setLocalProfile(normalized);
      if (isPreview) {
        onChange?.(normalized);
        onPreview?.(normalized);
        return;
      }
      onChange?.(normalized);
      onPreview?.(normalized);
    },
    [isPreview, onChange, onPreview],
  );

  const setProfile = useCallback(
    (updater: (prev: ThemeProfile) => ThemeProfile) => {
      emitChange(updater(previewProfile));
    },
    [emitChange, previewProfile],
  );

  const handleGlobalTintingChange = useCallback(
    (applyBackgroundTint: boolean) => {
      setProfile((prev) => ({ ...prev, applyBackgroundTint }));
    },
    [setProfile],
  );

  const foundationPalettes =
    APPEARANCE_PRESETS.foundation[previewProfile.foundation].palettes;

  const hint =
    previewHint ??
    (isPreview
      ? 'Adjust options below, then save to apply permanently.'
      : 'Changes preview live when you adjust options.');

  return (
    <div className="space-y-4">
      {isPreview ? (
        <div
          className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-2.5 text-sm text-foreground"
          role="status"
        >
          Preview mode — changes are visible on the site but not saved until you click{' '}
          <span className="font-semibold">Save appearance</span>.
        </div>
      ) : null}

      {headerSlot}

      {showGlobalTinting ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-elevated/50 px-4 py-3">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={previewProfile.applyBackgroundTint}
              disabled={disabled}
              onChange={(e) => handleGlobalTintingChange(e.target.checked)}
              className="size-4 shrink-0 rounded border-border bg-background text-primary focus:ring-accent/40"
            />
            <span className="text-sm font-medium text-foreground">
              Global Tinting Behavior
            </span>
          </label>
          <span className="group relative inline-flex">
            <button
              type="button"
              className="inline-flex rounded p-0.5 text-muted transition-colors hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              aria-describedby="appearance-global-tinting-hint"
            >
              <Info className="size-4 shrink-0" aria-hidden />
              <span className="sr-only">About global tinting behavior</span>
            </button>
            <span
              id="appearance-global-tinting-hint"
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-md border border-border bg-surface px-2.5 py-2 text-xs font-normal leading-snug text-muted opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
            >
              When enabled, your chosen Genre and Identity palettes will subtly tint
              backgrounds and panels.
            </span>
          </span>
        </div>
      ) : null}

      <nav
        role="tablist"
        aria-label="Appearance preset categories"
        className="flex flex-wrap gap-1 border-b border-border"
      >
        {APPEARANCE_TABS.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={disabled}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 ${
                isActive
                  ? 'border-b-2 border-accent bg-accent/10 text-accent'
                  : 'border-b-2 border-transparent text-muted hover:text-accent'
              }`}
            >
              <TabIcon className="size-3.5 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {activeTab === 'foundation' && (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Choose the base light or dark mode, then pick a foundation accent palette
            compatible with that mode.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(APPEARANCE_PRESETS.foundation) as FoundationId[]).map((id) => {
              const meta = APPEARANCE_PRESETS.foundation[id];
              const selected = previewProfile.foundation === id;
              return (
                <SelectionCard
                  key={id}
                  selected={selected}
                  disabled={disabled}
                  title={meta.label}
                  description={meta.description}
                  onClick={() =>
                    setProfile((prev) => ({
                      ...prev,
                      foundation: id,
                      genre: 'none',
                      foundationPalette: meta.defaultPalette,
                    }))
                  }
                />
              );
            })}
          </div>

          <div>
            <FieldLabel>
              Foundation palette (
              {APPEARANCE_PRESETS.foundation[previewProfile.foundation].label})
            </FieldLabel>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {foundationPalettes.map((paletteId) => {
                const selected = previewProfile.foundationPalette === paletteId;
                const swatch = GLOBAL_PALETTES[paletteId];
                return (
                  <SelectionCard
                    key={paletteId}
                    selected={selected}
                    disabled={disabled}
                    title={PALETTE_DISPLAY_NAMES[paletteId]}
                    description={`Primary ${swatch.primary}`}
                    onClick={() =>
                      setProfile((prev) => ({
                        ...prev,
                        foundationPalette: paletteId as FoundationPaletteId,
                      }))
                    }
                  >
                    <div className="mt-2 flex gap-1">
                      <span
                        className="size-5 rounded-full border border-border"
                        style={{ backgroundColor: swatch.primary }}
                      />
                      <span
                        className="size-5 rounded-full border border-border"
                        style={{ backgroundColor: swatch.accent }}
                      />
                    </div>
                  </SelectionCard>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'genre' && (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Genre layers cinematic language on your foundation palette — edge behavior,
            glow curves, and typography mood. Combine with holiday overlays below.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SelectionCard
              selected={previewProfile.genre === 'none'}
              disabled={disabled}
              title="None"
              description="Use foundation mode only — no genre overlay."
              onClick={() =>
                setProfile((prev) => ({
                  ...prev,
                  genre: 'none',
                }))
              }
            />
            {(Object.keys(APPEARANCE_PRESETS.genre) as Array<
              keyof typeof APPEARANCE_PRESETS.genre
            >).map((genreKey) => {
              const meta = APPEARANCE_PRESETS.genre[genreKey];
              return (
                <SelectionCard
                  key={genreKey}
                  selected={previewProfile.genre === genreKey}
                  disabled={disabled}
                  title={meta.label}
                  description={meta.description}
                  onClick={() =>
                    setProfile((prev) => ({
                      ...prev,
                      genre: genreKey as GenreId,
                      foundation: meta.mode,
                    }))
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'identity' && (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Holiday overlays modulate edge lighting and hero bloom — they never replace your
            foundation palette. Stack with any compatible genre.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SelectionCard
              selected={previewProfile.identity === 'none'}
              disabled={disabled}
              title="None"
              description="Use the foundation palette accents only."
              onClick={() =>
                setProfile((prev) => ({
                  ...prev,
                  identity: 'none',
                }))
              }
            />
            {(Object.keys(APPEARANCE_PRESETS.holiday) as Array<
              keyof typeof APPEARANCE_PRESETS.holiday
            >).map((holidayKey) => {
              const meta = APPEARANCE_PRESETS.holiday[holidayKey];
              const swatch = GLOBAL_PALETTES[meta.palette];
              return (
                <SelectionCard
                  key={holidayKey}
                  selected={previewProfile.identity === holidayKey}
                  disabled={disabled}
                  title={meta.label}
                  description={`${meta.description} (${meta.mode} mode)`}
                  onClick={() => {
                    const holidayFoundationPalettes =
                      APPEARANCE_PRESETS.foundation[meta.mode].palettes;
                    setProfile((prev) => ({
                      ...prev,
                      identity: holidayKey as IdentityId,
                      ...(prev.genre === 'none'
                        ? {
                            foundation: meta.mode,
                            foundationPalette:
                              prev.foundation === meta.mode &&
                              (holidayFoundationPalettes as readonly string[]).includes(
                                prev.foundationPalette,
                              )
                                ? prev.foundationPalette
                                : APPEARANCE_PRESETS.foundation[meta.mode].defaultPalette,
                          }
                        : {}),
                    }));
                  }}
                >
                  <div className="mt-2 flex gap-1">
                    <span
                      className="size-5 rounded-full border border-border"
                      style={{ backgroundColor: swatch.primary }}
                    />
                    <span
                      className="size-5 rounded-full border border-border"
                      style={{ backgroundColor: swatch.accent }}
                    />
                  </div>
                </SelectionCard>
              );
            })}
          </div>
        </div>
      )}

      <PaletteSwatchPreview
        profile={previewProfile}
        applyBackgroundTint={previewProfile.applyBackgroundTint}
      />

      {hint ? <p className="text-xs text-muted">{hint}</p> : null}

      {footerSlot}
    </div>
  );
}

export const AppearanceBuilder = memo(AppearanceBuilderInner);
