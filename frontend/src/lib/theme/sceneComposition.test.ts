import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyEmotionalCurve,
  applyIlluminationCurve,
  tierRank,
} from './emotionalCurves.ts';
import { resolveLuminanceEcology } from './luminanceEcology.ts';
import {
  isSceneCompositionActive,
  resolveSceneComposition,
} from './sceneComposition.ts';
import { deriveZoneCssVariables } from './zoneDerivation.ts';
import { resolveAtmosphereSignature } from './atmosphereSignature.ts';
import { THEME_CONFIGS } from './themeVariables.ts';
import { deriveSurfaceRoleCssVariables } from './atmosphericDerivation.ts';

describe('emotionalCurves', () => {
  it('uses nonlinear threshold steps for restrained_spikes', () => {
    const low = applyEmotionalCurve(1, 'low', 'restrained_spikes');
    const medium = applyEmotionalCurve(1, 'medium', 'restrained_spikes');
    const dramatic = applyEmotionalCurve(1, 'dramatic', 'restrained_spikes');

    assert.equal(low, 0.04);
    assert.equal(medium, 0.08);
    assert.ok(medium > low);
    assert.ok(dramatic > medium * 2);
    assert.equal(applyEmotionalCurve(1, 'zero', 'restrained_spikes'), 0);
  });

  it('ranks glow tiers monotonically', () => {
    assert.ok(tierRank('low') < tierRank('medium'));
    assert.ok(tierRank('high') < tierRank('dramatic'));
  });

  it('caps illumination curve below emissive dramatic ceiling', () => {
    const emissive = applyEmotionalCurve(1, 'dramatic', 'editorial', 'emissive');
    const reflective = applyIlluminationCurve(1, 'dramatic', 'editorial');
    assert.ok(reflective < emissive);
    assert.ok(reflective <= 0.08);
  });
});

describe('resolveSceneComposition', () => {
  it('maps midnight codex to quiet_codex', () => {
    const scene = resolveSceneComposition({
      paletteId: 'midnight',
      workspaceCompositionId: 'codex',
    });
    assert.ok(scene);
    assert.equal(scene?.id, 'quiet_codex');
    assert.equal(scene?.cadence, 'editorial');
    assert.equal(scene?.zones.prose.silence, true);
  });

  it('maps midnight dashboard to moonlit_archive', () => {
    const scene = resolveSceneComposition({
      paletteId: 'midnight',
      workspaceCompositionId: 'dashboard',
    });
    assert.ok(scene);
    assert.equal(scene?.id, 'moonlit_archive');
    assert.equal(scene?.zones.hero.glowTier, 'dramatic');
  });

  it('returns null for non-pilot palettes', () => {
    const scene = resolveSceneComposition({
      paletteId: 'ocean',
      workspaceCompositionId: 'codex',
    });
    assert.equal(scene, null);
  });

  it('maps arctic codex to quiet_reading_room', () => {
    const scene = resolveSceneComposition({
      paletteId: 'arctic',
      workspaceCompositionId: 'codex',
    });
    assert.ok(scene);
    assert.equal(scene?.id, 'quiet_reading_room');
    assert.equal(scene?.cadence, 'editorial');
    assert.equal(scene?.authored?.sidebarAtmosphere, 'skylight_folio_wall');
  });

  it('maps sunset dashboard to sunlit_archive', () => {
    const scene = resolveSceneComposition({
      paletteId: 'sunset',
      workspaceCompositionId: 'dashboard',
    });
    assert.ok(scene);
    assert.equal(scene?.id, 'sunlit_archive');
    assert.equal(scene?.zones.hero.glowTier, 'high');
    assert.notEqual(scene?.zones.hero.glowTier, 'dramatic');
  });

  it('returns null for non-pilot routes', () => {
    assert.equal(
      isSceneCompositionActive('midnight', 'hub'),
      false,
    );
    const scene = resolveSceneComposition({
      paletteId: 'midnight',
      workspaceCompositionId: 'hub',
    });
    assert.equal(scene, null);
  });
});

describe('deriveZoneCssVariables', () => {
  it('keeps prose silent with zero glow and dramatic hero above sidebar', () => {
    const globalVars = deriveSurfaceRoleCssVariables(
      {
        ...THEME_CONFIGS.dark,
        _derivationPreset: 'dark',
        _paletteId: 'midnight',
        _identityStrength: 1,
      },
      'dark',
    );
    const scene = resolveSceneComposition({
      paletteId: 'midnight',
      workspaceCompositionId: 'dashboard',
    });
    assert.ok(scene);

    const signature = resolveAtmosphereSignature('midnight', 'dark', '30 27 75', 1);
    const zoneVars = deriveZoneCssVariables(globalVars, scene!, signature);

    assert.equal(zoneVars['--zone-prose-glow-alpha'], '0.000');
    assert.equal(zoneVars['--zone-prose-silence'], '1');
    assert.ok(
      Number(zoneVars['--zone-hero-glow-alpha']) >
        Number(zoneVars['--zone-sidebar-glow-alpha']),
    );
  });

  it('does not duplicate sidebar nav tokens in zone derivation', () => {
    const globalVars = deriveSurfaceRoleCssVariables(
      {
        ...THEME_CONFIGS.dark,
        _derivationPreset: 'dark',
        _paletteId: 'midnight',
        _identityStrength: 1,
      },
      'dark',
    );
    const scene = resolveSceneComposition({
      paletteId: 'midnight',
      workspaceCompositionId: 'codex',
    });
    assert.ok(scene);

    const signature = resolveAtmosphereSignature('midnight', 'dark', '30 27 75', 1);
    const zoneVars = deriveZoneCssVariables(globalVars, scene!, signature);

    assert.equal(zoneVars['--sidebar-nav-ink-active'], undefined);
    assert.equal(zoneVars['--sidebar-nav-edge-rgb'], undefined);
  });

  it('emits global sidebar nav tokens for ocean without scene', () => {
    const vars = deriveSurfaceRoleCssVariables(
      {
        ...THEME_CONFIGS.dark,
        _derivationPreset: 'dark',
        _paletteId: 'ocean',
        _identityStrength: 1,
      },
      'dark',
    );

    assert.equal(vars['--sidebar-nav-edge-rgb'], '56 120 160');
    assert.equal(vars['--sidebar-nav-ink'], '200 210 220');
    assert.ok(
      Number(vars['--sidebar-nav-active-glow-alpha']) >
        Number(vars['--sidebar-nav-inactive-glow-alpha']),
    );
  });

  it('uses reflective zone glow and light material for arctic scenes', () => {
    const globalVars = deriveSurfaceRoleCssVariables(
      {
        ...THEME_CONFIGS.light,
        _derivationPreset: 'light',
        _paletteId: 'arctic',
        _identityStrength: 1,
      },
      'light',
    );
    const scene = resolveSceneComposition({
      paletteId: 'arctic',
      workspaceCompositionId: 'dashboard',
    });
    assert.ok(scene);

    const signature = resolveAtmosphereSignature('arctic', 'light', '42 38 32', 1);
    const zoneVars = deriveZoneCssVariables(globalVars, scene!, signature, {
      mode: 'light',
      paletteId: 'arctic',
      ecology: resolveLuminanceEcology('light', 'arctic'),
    });

    assert.ok(Number(zoneVars['--zone-hero-glow-alpha']) < 0.12);
    assert.ok(Number(zoneVars['--material-specular-sidebar']) < 0.025);
    assert.ok(Number(zoneVars['--zone-void-luminance-offset']) > 0);
  });
});
