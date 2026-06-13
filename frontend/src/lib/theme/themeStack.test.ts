import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clampChroma, resolveSaturationBudget } from './saturationBudget.ts';
import {
  applyGenreAtmosphereTransforms,
  resolveEcologyForStack,
} from './genreIdentity.ts';
import { modulateEventLightingVars, modulateEventOverlay } from './eventOverlay.ts';
import { resolveSceneComposition } from './sceneComposition.ts';
import { resolveAtmosphereSignature } from './atmosphereSignature.ts';
import { deriveSurfaceRoleCssVariables } from './atmosphericDerivation.ts';
import {
  buildMergedThemeConfigFromProfile,
  normalizeThemeProfile,
  resolvePaletteFromProfile,
  resolveThemePresetFromProfile,
  type ThemeProfile,
} from './themeProfile.ts';
import { THEME_CONFIGS } from './themeVariables.ts';

function stackVars(profile: ThemeProfile) {
  const config = buildMergedThemeConfigFromProfile(profile);
  const preset = resolveThemePresetFromProfile(profile);
  return deriveSurfaceRoleCssVariables(config, preset === 'auto' ? 'dark' : preset);
}

describe('themeStack', () => {
  it('resolvePaletteFromProfile keeps foundation palette when identity is active', () => {
    const profile = normalizeThemeProfile({
      foundation: 'dark',
      foundationPalette: 'midnight',
      genre: 'none',
      identity: 'halloween',
    });
    assert.equal(resolvePaletteFromProfile(profile), 'midnight');
  });

  it('normalizes trans identity on dark foundation to light mode', () => {
    const profile = normalizeThemeProfile({
      foundation: 'dark',
      foundationPalette: 'ocean',
      genre: 'none',
      identity: 'trans',
    });
    assert.equal(profile.foundation, 'light');
    assert.equal(profile.identity, 'trans');
    assert.equal(profile.foundationPalette, 'arctic');
  });

  it('allows genre and event overlay on the same profile', () => {
    const profile = normalizeThemeProfile({
      foundation: 'dark',
      foundationPalette: 'ocean',
      genre: 'fantasy',
      identity: 'halloween',
    });
    assert.equal(profile.genre, 'fantasy');
    assert.equal(profile.identity, 'halloween');
    assert.equal(profile.foundationPalette, 'ocean');
  });

  it('enforces saturation budget caps on event overlay chroma', () => {
    const budget = resolveSaturationBudget('pride');
    assert.equal(budget.proseMax, 0);
    assert.equal(clampChroma('prose', 0.5, budget), 0);
    assert.ok(clampChroma('hero', 0.9, budget) <= budget.heroMax);
    assert.ok(clampChroma('overlay', 0.9, budget) <= budget.overlayMax);
  });

  it('genre transforms mutate behavior without replacing foundation edge rgb', () => {
    const oceanBase = resolveAtmosphereSignature('ocean', 'dark', '8 12 18');
    const fantasy = applyGenreAtmosphereTransforms(oceanBase, 'fantasy');
    const cyber = applyGenreAtmosphereTransforms(oceanBase, 'cyberpunk');

    assert.equal(fantasy.edgeLightRgb, oceanBase.edgeLightRgb);
    assert.equal(cyber.edgeLightRgb, '34 211 238');
    assert.notEqual(fantasy.bloomBehavior, cyber.bloomBehavior);
  });

  it('midnight + fantasy preserves canvas while modulating glow channels', () => {
    const baseProfile = normalizeThemeProfile({
      foundation: 'dark',
      foundationPalette: 'midnight',
      genre: 'none',
      identity: 'none',
    });
    const stackedProfile = normalizeThemeProfile({
      foundation: 'dark',
      foundationPalette: 'midnight',
      genre: 'fantasy',
      identity: 'none',
    });

    const baseVars = stackVars(baseProfile);
    const stackedVars = stackVars(stackedProfile);

    assert.equal(baseVars['--color-canvas'], stackedVars['--color-canvas']);
    assert.equal(baseVars['--color-prose-foreground'], stackedVars['--color-prose-foreground']);
    assert.ok(
      Number(stackedVars['--atmosphere-fog-density']) >=
        Number(baseVars['--atmosphere-fog-density']),
    );
  });

  it('ocean + fantasy + halloween keeps foundation canvas and caps hero glow', () => {
    const profile = normalizeThemeProfile({
      foundation: 'dark',
      foundationPalette: 'ocean',
      genre: 'fantasy',
      identity: 'halloween',
    });
    const foundationOnly = normalizeThemeProfile({
      foundation: 'dark',
      foundationPalette: 'ocean',
      genre: 'none',
      identity: 'none',
    });

    const vars = stackVars(profile);
    const foundationVars = stackVars(foundationOnly);

    assert.equal(vars['--color-canvas'], foundationVars['--color-canvas']);
    assert.equal(vars['--color-depth-0'], foundationVars['--color-depth-0']);
    const heroGlow = Number(vars['--atmosphere-glow-alpha-hero']);
    assert.ok(heroGlow <= resolveSaturationBudget('halloween').heroMax);
    assert.ok(vars['--color-event-edge-rgb']);
  });

  it('parchment genre forces reflective ecology on dark foundation palette', () => {
    const ecology = resolveEcologyForStack('dark', 'midnight', 'parchment');
    assert.equal(ecology.lightingModel, 'reflective');
    assert.equal(ecology.sidebarEcology, 'sunlit');
  });

  it('buildMergedThemeConfigFromProfile wires stack metadata', () => {
    const profile = normalizeThemeProfile({
      foundation: 'dark',
      foundationPalette: 'midnight',
      genre: 'cyberpunk',
      identity: 'halloween',
    });
    const config = buildMergedThemeConfigFromProfile(profile);
    assert.equal(config._paletteId, 'midnight');
    assert.equal(config._genre, 'cyberpunk');
    assert.equal(config._eventOverlay, 'halloween');
    assert.ok(config._eventOverlayStrength! <= 0.25);
  });

  it('event overlay does not alter prose-muted when stacked on midnight + halloween', () => {
    const withoutEvent = stackVars(
      normalizeThemeProfile({
        foundation: 'dark',
        foundationPalette: 'midnight',
        genre: 'none',
        identity: 'none',
      }),
    );
    const withEvent = stackVars(
      normalizeThemeProfile({
        foundation: 'dark',
        foundationPalette: 'midnight',
        genre: 'none',
        identity: 'halloween',
      }),
    );

    assert.equal(withoutEvent['--color-prose-muted'], withEvent['--color-prose-muted']);
    assert.equal(withoutEvent['--color-canvas'], withEvent['--color-canvas']);
  });

  it('modulateEventLightingVars only touches glow channels', () => {
    const base = {
      '--color-canvas': '#101010',
      '--color-prose-muted': '#888880',
      '--atmosphere-glow-alpha-hero': '0.16',
      '--atmosphere-glow-alpha-dramatic': '0.19',
    };
    const budget = resolveSaturationBudget('pride');
    const modulated = modulateEventLightingVars(base, 'pride', 0.22, budget);
    assert.equal(modulated['--color-canvas'], base['--color-canvas']);
    assert.equal(modulated['--color-prose-muted'], base['--color-prose-muted']);
    assert.notEqual(
      modulated['--atmosphere-glow-alpha-hero'],
      base['--atmosphere-glow-alpha-hero'],
    );
  });

  it('modulateEventOverlay applies signature and glow vars together', () => {
    const baseSig = resolveAtmosphereSignature('midnight', 'dark', '12 10 18');
    const budget = resolveSaturationBudget('halloween');
    const result = modulateEventOverlay(
      baseSig,
      { '--atmosphere-glow-alpha-hero': '0.16' },
      'halloween',
      0.22,
      budget,
    );
    assert.equal(result.signature.edgeLightRgb, '160 80 40');
    assert.ok(result.cssVars['--color-event-edge-rgb']);
    assert.notEqual(
      result.cssVars['--atmosphere-glow-alpha-hero'],
      '0.16',
    );
  });

  it('scene orchestration suppresses prose glow with event overlay on quiet_codex', () => {
    const profile = normalizeThemeProfile({
      foundation: 'dark',
      foundationPalette: 'midnight',
      genre: 'none',
      identity: 'halloween',
    });
    const config = buildMergedThemeConfigFromProfile(profile);
    const scene = resolveSceneComposition({
      paletteId: 'midnight',
      workspaceCompositionId: 'codex',
    });
    assert.ok(scene);
    const globalVars = deriveSurfaceRoleCssVariables(config, 'dark');
    const sceneVars = deriveSurfaceRoleCssVariables(config, 'dark', { scene });
    assert.equal(Number(sceneVars['--zone-prose-glow-alpha']), 0);
    assert.equal(
      globalVars['--color-canvas'],
      sceneVars['--color-canvas'],
    );
    assert.ok(globalVars['--color-event-edge-rgb']);
    assert.ok(sceneVars['--zone-hero-glow-alpha']);
  });

  it('standalone genre preset config still derives when no foundation palette id', () => {
    const vars = deriveSurfaceRoleCssVariables(
      { ...THEME_CONFIGS.fantasy, _derivationPreset: 'fantasy' },
      'fantasy',
    );
    assert.ok(vars['--color-canvas']);
    assert.ok(vars['--atmosphere-bloom-behavior']);
  });
});
