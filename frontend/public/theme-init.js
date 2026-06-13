/**
 * Blocking theme bootstrap (runs before React) to reduce FOUC.
 * Keep in sync with frontend/src/lib/theme/themeVariables.ts and globalPalette.ts
 */
(function () {
  var STORAGE_KEY = 'esiana-global-theme-preset';
  var PALETTE_KEY = 'esiana-global-palette';
  var TINT_KEY = 'esiana-apply-background-tint';
  var LEGACY_TINT_KEY = 'esiana-global-palette-apply-tints';
  var presets = {
    light: {
      '--color-primary': '#d97706',
      '--color-primary-hover': '#b45309',
      '--color-bg': '#f8fafc',
      '--color-bg-elevated': '#f1f5f9',
      '--color-surface': '#ffffff',
      '--color-border': '#cbd5e1',
      '--color-text': '#0f172a',
      '--color-text-muted': '#64748b',
      '--color-accent': '#4f46e5',
    },
    dark: {
      '--color-primary': '#f59e0b',
      '--color-primary-hover': '#d97706',
      '--color-bg': '#020617',
      '--color-bg-elevated': '#0f172a',
      '--color-surface': '#1e293b',
      '--color-border': '#334155',
      '--color-text': '#f1f5f9',
      '--color-text-muted': '#94a3b8',
      '--color-accent': '#818cf8',
    },
    fantasy: {
      '--color-primary': '#a78bfa',
      '--color-primary-hover': '#8b5cf6',
      '--color-bg': '#1a1028',
      '--color-bg-elevated': '#261636',
      '--color-surface': '#32204a',
      '--color-border': '#5b3d7a',
      '--color-text': '#f3e8ff',
      '--color-text-muted': '#c4b5fd',
      '--color-accent': '#fbbf24',
    },
    cyberpunk: {
      '--color-primary': '#22d3ee',
      '--color-primary-hover': '#06b6d4',
      '--color-bg': '#050510',
      '--color-bg-elevated': '#0a0a1a',
      '--color-surface': '#12122a',
      '--color-border': '#ec4899',
      '--color-text': '#e0f2fe',
      '--color-text-muted': '#67e8f9',
      '--color-accent': '#f472b6',
    },
    parchment: {
      '--color-primary': '#7c5c2e',
      '--color-primary-hover': '#5c4522',
      '--color-bg': '#f8f0e0',
      '--color-bg-elevated': '#f3e8d4',
      '--color-surface': '#fffef8',
      '--color-border': '#d4c4a8',
      '--color-text': '#2c2416',
      '--color-text-muted': '#5c4f3a',
      '--color-accent': '#8b6914',
    },
  };
  var palettes = {
    ocean: {
      '--color-primary': '#38bdf8',
      '--color-primary-hover': '#0ea5e9',
      '--color-accent': '#67e8f9',
      '--color-bg': '#13171b',
      '--color-surface': '#1b2127',
      '--color-border': '#2a333c',
    },
    midnight: {
      '--color-primary': '#a78bfa',
      '--color-primary-hover': '#8b5cf6',
      '--color-accent': '#c4b5fd',
      '--color-bg': '#141416',
      '--color-surface': '#1c1c21',
      '--color-border': '#2b2b33',
    },
    forest: {
      '--color-primary': '#4ade80',
      '--color-primary-hover': '#22c55e',
      '--color-accent': '#86efac',
      '--color-bg': '#141614',
      '--color-surface': '#1c211c',
      '--color-border': '#2a332b',
    },
    ember: {
      '--color-primary': '#fb923c',
      '--color-primary-hover': '#f97316',
      '--color-accent': '#fdba74',
      '--color-bg': '#171514',
      '--color-surface': '#201d1a',
      '--color-border': '#332e2a',
    },
    sunset: {
      '--color-primary': '#f97316',
      '--color-primary-hover': '#ea580c',
      '--color-accent': '#fb923c',
      '--color-bg': '#faf5f3',
      '--color-surface': '#f5ebe8',
      '--color-border': '#e8d5cf',
    },
    desert: {
      '--color-primary': '#c2956a',
      '--color-primary-hover': '#a67c52',
      '--color-accent': '#e8c49a',
      '--color-bg': '#faf7f2',
      '--color-surface': '#f3efe6',
      '--color-border': '#e0d6c8',
    },
    arctic: {
      '--color-primary': '#38bdf8',
      '--color-primary-hover': '#0ea5e9',
      '--color-accent': '#a5f3fc',
      '--color-bg': '#f4f9fb',
      '--color-surface': '#eaf3f7',
      '--color-border': '#d0e3ed',
    },
    deep_space: {
      '--color-primary': '#a5b4fc',
      '--color-primary-hover': '#818cf8',
      '--color-accent': '#c4b5fd',
      '--color-bg': '#06070c',
      '--color-surface': '#0c0e16',
      '--color-border': '#1a1d2b',
    },
    pride: {
      '--color-primary': '#E40303',
      '--color-primary-hover': '#c70202',
      '--color-accent': '#FF8C00',
      '--color-bg': '#faf8fb',
      '--color-surface': '#f3f0f5',
      '--color-border': '#e4dfe8',
    },
    trans: {
      '--color-primary': '#5BCEFA',
      '--color-primary-hover': '#3bb8e8',
      '--color-accent': '#F7A8B8',
      '--color-bg': '#f2f9fc',
      '--color-surface': '#e8f4fa',
      '--color-border': '#cce4ef',
    },
  };
  var paletteAliases = {
    'progress-pride': 'pride',
    progress_pride: 'pride',
  };

  var preset = 'dark';
  var palette = 'ocean';
  var applyBackgroundTint = false;
  try {
    preset = localStorage.getItem(STORAGE_KEY) || 'dark';
    palette = localStorage.getItem(PALETTE_KEY) || 'ocean';
    var tintStored = localStorage.getItem(TINT_KEY);
    if (tintStored === null) {
      tintStored = localStorage.getItem(LEGACY_TINT_KEY);
    }
    applyBackgroundTint = tintStored === '1';
  } catch (_) {
    /* private mode */
  }

  if (paletteAliases[palette]) {
    palette = paletteAliases[palette];
  }

  if (preset === 'auto' && window.matchMedia) {
    preset = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  var vars = presets[preset] || presets.dark;
  var paletteVars = palettes[palette] || palettes.ocean;
  var root = document.documentElement;
  for (var key in vars) {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      root.style.setProperty(key, vars[key]);
    }
  }
  for (var paletteKey in paletteVars) {
    if (!Object.prototype.hasOwnProperty.call(paletteVars, paletteKey)) continue;
    if (
      !applyBackgroundTint &&
      (paletteKey === '--color-bg' ||
        paletteKey === '--color-surface' ||
        paletteKey === '--color-border')
    ) {
      continue;
    }
    root.style.setProperty(paletteKey, paletteVars[paletteKey]);
    if (applyBackgroundTint && paletteKey === '--color-bg') {
      root.style.setProperty('--color-bg-elevated', paletteVars[paletteKey]);
    }
  }
  if (!applyBackgroundTint) {
    root.style.removeProperty('--color-bg');
    root.style.removeProperty('--color-bg-elevated');
    root.style.removeProperty('--color-surface');
    root.style.removeProperty('--color-border');
    root.style.setProperty('--color-bg', vars['--color-bg']);
    root.style.setProperty('--color-bg-elevated', vars['--color-bg-elevated']);
    root.style.setProperty('--color-surface', vars['--color-surface']);
    root.style.setProperty('--color-border', vars['--color-border']);
  }
  root.style.colorScheme =
    preset === 'light' || preset === 'parchment' ? 'light' : 'dark';
  root.classList.remove(
    'theme-light',
    'theme-dark',
    'theme-fantasy',
    'theme-cyberpunk',
    'theme-parchment',
  );
  root.classList.add('theme-' + preset);
})();
