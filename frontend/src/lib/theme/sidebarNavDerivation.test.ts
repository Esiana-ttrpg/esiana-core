import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveAtmosphereSignature } from './atmosphereSignature.ts';
import { deriveSidebarNavCssVariables } from './sidebarNavDerivation.ts';
import { resolveTypographySignature } from './typographySignature.ts';
import { resolveSceneComposition } from './sceneComposition.ts';
import { deriveSurfaceRoleCssVariables } from './atmosphericDerivation.ts';
import { THEME_CONFIGS } from './themeVariables.ts';
import {
  DARK_FOUNDATION_PALETTE_IDS,
  LIGHT_FOUNDATION_PALETTE_IDS,
} from './appearancePresets.ts';

describe('deriveSidebarNavCssVariables', () => {
  it('emits distinct edge rgb per dark foundation palette', () => {
    const edges = new Set<string>();

    for (const paletteId of DARK_FOUNDATION_PALETTE_IDS) {
      const signature = resolveAtmosphereSignature(paletteId, 'dark', '30 27 75', 1);
      const typography = resolveTypographySignature(paletteId, 'dark');
      const vars = deriveSidebarNavCssVariables({
        paletteId,
        signature,
        typography,
        mode: 'dark',
      });
      assert.ok(vars);
      edges.add(vars['--sidebar-nav-edge-rgb']);
      assert.equal(vars['--sidebar-nav-edge-rgb'], signature.edgeLightRgb);
    }

    assert.equal(edges.size, DARK_FOUNDATION_PALETTE_IDS.length);
  });

  it('keeps active glow above inactive glow for every dark palette', () => {
    for (const paletteId of DARK_FOUNDATION_PALETTE_IDS) {
      const signature = resolveAtmosphereSignature(paletteId, 'dark', '30 27 75', 1);
      const typography = resolveTypographySignature(paletteId, 'dark');
      const vars = deriveSidebarNavCssVariables({
        paletteId,
        signature,
        typography,
        mode: 'dark',
      });
      assert.ok(vars);
      assert.ok(
        Number(vars['--sidebar-nav-active-glow-alpha']) >
          Number(vars['--sidebar-nav-inactive-glow-alpha']),
      );
    }
  });

  it('uses typography-driven ink that differs between ocean and midnight', () => {
    const midnight = deriveSidebarNavCssVariables({
      paletteId: 'midnight',
      signature: resolveAtmosphereSignature('midnight', 'dark', '30 27 75', 1),
      typography: resolveTypographySignature('midnight', 'dark'),
      mode: 'dark',
    });
    const ocean = deriveSidebarNavCssVariables({
      paletteId: 'ocean',
      signature: resolveAtmosphereSignature('ocean', 'dark', '30 27 75', 1),
      typography: resolveTypographySignature('ocean', 'dark'),
      mode: 'dark',
    });

    assert.ok(midnight && ocean);
    assert.notEqual(midnight['--sidebar-nav-ink'], ocean['--sidebar-nav-ink']);
    assert.notEqual(midnight['--sidebar-nav-ink-active'], ocean['--sidebar-nav-ink-active']);
  });

  it('emits sunlit nav tokens for light foundation palettes', () => {
    for (const paletteId of LIGHT_FOUNDATION_PALETTE_IDS) {
      const signature = resolveAtmosphereSignature(paletteId, 'light', '42 38 32', 1);
      const typography = resolveTypographySignature(paletteId, 'light');
      const vars = deriveSidebarNavCssVariables({
        paletteId,
        signature,
        typography,
        mode: 'light',
      });
      assert.ok(vars);
      assert.equal(vars['--sidebar-nav-edge-rgb'], signature.edgeLightRgb);
      assert.notEqual(vars['--sidebar-nav-active-edge-rgb'], '192 160 96');
      assert.ok(
        Number(vars['--sidebar-nav-active-glow-alpha']) >
          Number(vars['--sidebar-nav-inactive-glow-alpha']),
      );
      assert.ok(Number(vars['--sidebar-nav-active-glow-alpha']) <= 0.08);
    }
  });

  it('returns null for light mode without foundation palette', () => {
    const vars = deriveSidebarNavCssVariables({
      paletteId: 'pride',
      signature: resolveAtmosphereSignature('pride', 'light', '42 38 32', 1),
      typography: resolveTypographySignature(undefined, 'light'),
      mode: 'light',
    });
    assert.equal(vars, null);
  });

  it('scene boost increases active wash alpha over base for light palettes', () => {
    const baseConfig = {
      ...THEME_CONFIGS.light,
      _derivationPreset: 'light' as const,
      _paletteId: 'arctic' as const,
      _identityStrength: 1,
    };
    const baseVars = deriveSurfaceRoleCssVariables(baseConfig, 'light');
    const scene = resolveSceneComposition({
      paletteId: 'arctic',
      workspaceCompositionId: 'dashboard',
    });
    assert.ok(scene);

    const sceneVars = deriveSurfaceRoleCssVariables(baseConfig, 'light', { scene });
    assert.ok(
      Number(sceneVars['--sidebar-nav-active-glow-alpha']) >=
        Number(baseVars['--sidebar-nav-active-glow-alpha']),
    );
    assert.ok(Number(sceneVars['--sidebar-nav-active-glow-alpha']) <= 0.08);
  });

  it('scene boost increases active glow alpha over base for dark midnight', () => {
    const baseConfig = {
      ...THEME_CONFIGS.dark,
      _derivationPreset: 'dark' as const,
      _paletteId: 'midnight' as const,
      _identityStrength: 1,
    };
    const baseVars = deriveSurfaceRoleCssVariables(baseConfig, 'dark');
    const scene = resolveSceneComposition({
      paletteId: 'midnight',
      workspaceCompositionId: 'dashboard',
    });
    assert.ok(scene);

    const sceneVars = deriveSurfaceRoleCssVariables(baseConfig, 'dark', { scene });
    assert.ok(
      Number(sceneVars['--sidebar-nav-active-glow-alpha']) >
        Number(baseVars['--sidebar-nav-active-glow-alpha']),
    );
  });
});
