import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GLOBAL_PALETTES } from './appearancePresets.ts';
import {
  contrastRatio,
  deriveSurfaceRoleCssVariables,
  focalStyleForPreset,
  hexHue,
  hexSaturation,
  hueDeltaDegrees,
  lightnessDelta,
  relativeLuminance,
  resolveThemeAtmosphereInput,
} from './atmosphericDerivation.ts';
import { THEME_CONFIGS } from './themeVariables.ts';

function varsForPalette(
  paletteId: 'ocean' | 'midnight' | 'forest' | 'ember' | 'deep_space',
  options: { tintBoost?: boolean; preset?: 'dark' | 'fantasy' } = {},
) {
  const preset = options.preset ?? 'dark';
  return deriveSurfaceRoleCssVariables(
    {
      ...THEME_CONFIGS[preset],
      _derivationPreset: preset,
      _paletteId: paletteId,
      _identityStrength: options.tintBoost ? 1.5 : 1,
    },
    preset,
  );
}

describe('atmosphericDerivation', () => {
  it('maps presets to neutral focal styles with genre reading surfaces', () => {
    assert.equal(focalStyleForPreset('dark'), 'smoked_charcoal');
    assert.equal(focalStyleForPreset('fantasy'), 'smoked_charcoal');
    assert.equal(focalStyleForPreset('cyberpunk'), 'smoked_charcoal');
    assert.equal(focalStyleForPreset('parchment'), 'light_page');
  });

  it('derives stable role token keys for all dark presets', () => {
    const presets = ['dark', 'fantasy', 'cyberpunk'] as const;
    const expectedKeys = [
      '--color-canvas',
      '--color-focal',
      '--color-focal-elevated',
      '--color-depth-0',
      '--color-depth-1',
      '--color-depth-2',
      '--color-depth-3',
      '--color-contextual',
      '--color-focal-glow-rgb',
      '--color-border-warm-rgb',
      '--color-atmosphere-haze-rgb',
      '--color-atmosphere-shadow-rgb',
      '--color-atmosphere-glow-rgb',
      '--atmosphere-haze-alpha',
      '--atmosphere-glow-alpha',
      '--atmosphere-glow-alpha-operational',
      '--atmosphere-glow-alpha-focal',
      '--atmosphere-glow-alpha-dramatic',
      '--atmosphere-vignette-strength',
      '--atmosphere-region-fade-strength',
      '--color-edge-light-rgb',
      '--color-atmosphere-material-shadow-rgb',
      '--atmosphere-gradient-behavior',
      '--atmosphere-periphery-strength',
      '--color-display-foreground',
      '--color-prose-muted',
      '--color-void-rgb',
    ];

    for (const preset of presets) {
      const vars = deriveSurfaceRoleCssVariables(
        { ...THEME_CONFIGS[preset], _derivationPreset: preset },
        preset,
      );
      for (const key of expectedKeys) {
        assert.ok(vars[key], `${preset} missing ${key}`);
      }
    }
  });

  it('shifts dark foundation with ocean palette identity without raw bg override', () => {
    const ocean = GLOBAL_PALETTES.ocean;
    const vars = varsForPalette('ocean');

    assert.notEqual(vars['--color-canvas'], ocean.bg);
    assert.match(vars['--color-contextual']!, /rgb\(\d+ \d+ \d+ \/ 0\.5[58]\)/);
    assert.ok(vars['--color-focal']!.startsWith('#'));
    assert.equal(vars['--color-atmosphere-haze-rgb'], '40 90 130');
    assert.ok(Number(vars['--atmosphere-haze-alpha']) >= 0.14);
    assert.ok(Number(vars['--atmosphere-haze-alpha']) <= 0.22);
    assert.ok(Number(vars['--atmosphere-glow-alpha-operational']) <= 0.08);
  });

  it('uses different atmospheric lighting for fantasy and cyberpunk genres', () => {
    const fantasyVars = deriveSurfaceRoleCssVariables(
      { ...THEME_CONFIGS.fantasy, _derivationPreset: 'fantasy' },
      'fantasy',
    );
    const cyberVars = deriveSurfaceRoleCssVariables(
      { ...THEME_CONFIGS.cyberpunk, _derivationPreset: 'cyberpunk' },
      'cyberpunk',
    );

    assert.notEqual(
      fantasyVars['--color-atmosphere-haze-rgb'],
      cyberVars['--color-atmosphere-haze-rgb'],
    );
    assert.notEqual(
      fantasyVars['--color-atmosphere-glow-rgb'],
      cyberVars['--color-atmosphere-glow-rgb'],
    );
    assert.equal(fantasyVars['--color-focal'], cyberVars['--color-focal']);
  });

  it('maintains readable focal contrast ratios on dark surfaces', () => {
    const palettes = ['ocean', 'midnight', 'forest', 'ember', 'deep_space'] as const;
    for (const paletteId of palettes) {
      const vars = varsForPalette(paletteId);
      const ratio = contrastRatio(
        vars['--color-focal-foreground']!,
        vars['--color-focal']!,
      );
      assert.ok(ratio >= 7, `${paletteId} focal contrast ${ratio} below 7:1`);
    }
  });

  it('keeps canvas-to-focal luminance lift within narrative band', () => {
    const palettes = ['ocean', 'midnight', 'forest', 'ember', 'deep_space'] as const;
    for (const paletteId of palettes) {
      const vars = varsForPalette(paletteId);
      const canvasToFocal = lightnessDelta(
        vars['--color-canvas']!,
        vars['--color-focal']!,
      );
      const focalToElevated = lightnessDelta(
        vars['--color-focal']!,
        vars['--color-depth-3']!,
      );

      assert.ok(
        canvasToFocal >= 0.06 && canvasToFocal <= 0.1,
        `${paletteId} canvas→focal lightness delta ${canvasToFocal} outside 6–10% band`,
      );
      assert.ok(
        focalToElevated >= 0.02 && focalToElevated <= 0.04,
        `${paletteId} focal→elevated lightness delta ${focalToElevated} outside 2–4% band`,
      );
    }
  });

  it('uses warm-charcoal contextual veil within alpha band', () => {
    const presets = ['dark', 'fantasy', 'cyberpunk'] as const;
    for (const preset of presets) {
      const vars = deriveSurfaceRoleCssVariables(
        { ...THEME_CONFIGS[preset], _derivationPreset: preset },
        preset,
      );
      assert.match(
        vars['--color-contextual']!,
        /rgb\(\d+ \d+ \d+ \/ 0\.(55|56|57|58|59|6[0-5])\)/,
        `${preset} contextual alpha outside 0.55–0.65 band`,
      );
    }
  });

  it('uses warm paper ladder for light parchment themes', () => {
    const vars = deriveSurfaceRoleCssVariables(
      { ...THEME_CONFIGS.parchment, _derivationPreset: 'parchment' },
      'parchment',
    );
    assert.notEqual(vars['--color-canvas'], '#f8fafc');
    assert.notEqual(vars['--color-canvas'], THEME_CONFIGS.parchment.bg);
    assert.ok(relativeLuminance(vars['--color-canvas']!) > 0.85);
    assert.equal(vars['--type-prose-subdued-opacity'], '1');
    const mutedContrast = contrastRatio(
      vars['--color-prose-muted']!,
      vars['--color-focal']!,
    );
    assert.ok(mutedContrast >= 4.5, `light muted contrast ${mutedContrast} below 4.5:1`);
  });

  it('exports sidebar atmosphere tokens distinct from void', () => {
    const midnight = varsForPalette('midnight');
    assert.ok(midnight['--color-sidebar-base']);
    assert.ok(midnight['--color-sidebar-lifted']);
    assert.ok(midnight['--atmosphere-sidebar-edge-alpha']);
    assert.notEqual(midnight['--color-sidebar-base-rgb'], midnight['--color-void-rgb']);
    assert.notEqual(midnight['--color-sidebar-base'], midnight['--color-depth-0']);
  });

  it('uses composition-bias sidebar edge alpha for midnight', () => {
    const midnight = varsForPalette('midnight');
    assert.equal(midnight['--atmosphere-bias-horizontal'], '-1');
    assert.ok(Number(midnight['--atmosphere-sidebar-edge-alpha']) >= 0.12);
    assert.ok(Number(midnight['--atmosphere-glow-alpha-sidebar']) > Number(midnight['--atmosphere-glow-alpha-rail']));
  });

  it('gives light mode stronger display subtitle isolation than dark', () => {
    const lightVars = deriveSurfaceRoleCssVariables(
      { ...THEME_CONFIGS.parchment, _derivationPreset: 'parchment' },
      'parchment',
    );
    const darkVars = varsForPalette('midnight');
    const lightGap = lightVars['--type-display-subtitle-gap'] ?? '';
    const darkGap = darkVars['--type-display-subtitle-gap'] ?? '';
    assert.match(lightGap, /2\.25/);
    assert.match(darkGap, /1\.75/);
    assert.notEqual(lightGap, darkGap);
  });

  it('differentiates palettes primarily through atmospheric lighting', () => {
    const ocean = varsForPalette('ocean');
    const forest = varsForPalette('forest');
    const midnight = varsForPalette('midnight');
    const deepSpace = varsForPalette('deep_space');

    assert.notEqual(ocean['--color-atmosphere-haze-rgb'], forest['--color-atmosphere-haze-rgb']);
    assert.notEqual(ocean['--color-atmosphere-shadow-rgb'], midnight['--color-atmosphere-shadow-rgb']);
    assert.notEqual(
      forest['--color-atmosphere-haze-rgb'],
      deepSpace['--color-atmosphere-haze-rgb'],
    );
    assert.ok(Number(ocean['--atmosphere-haze-alpha']) >= 0.1);
    assert.ok(Number(ocean['--atmosphere-glow-alpha-operational']) <= 0.08);
    assert.ok(Number(ocean['--atmosphere-glow-alpha-dramatic']) >= 0.16);
  });

  it('steps depth bands with distinct luminance', () => {
    const ocean = varsForPalette('ocean');

    assert.notEqual(ocean['--color-depth-0'], ocean['--color-depth-1']);
    assert.notEqual(ocean['--color-depth-1'], ocean['--color-depth-2']);
    assert.notEqual(ocean['--color-depth-2'], ocean['--color-depth-3']);

    const canvasToDepth1 = lightnessDelta(
      ocean['--color-canvas']!,
      ocean['--color-depth-1']!,
    );
    assert.ok(
      canvasToDepth1 >= 0.01,
      `ocean canvas→depth-1 lightness delta ${canvasToDepth1} below 1%`,
    );
  });

  it('keeps reading surfaces low-saturation navy charcoal', () => {
    for (const paletteId of ['ocean', 'midnight', 'forest', 'ember', 'deep_space'] as const) {
      const vars = varsForPalette(paletteId);
      assert.ok(
        hexSaturation(vars['--color-focal']!) <= 0.12,
        `${paletteId} focal saturation exceeds 12%`,
      );
      const canvasToFocal = lightnessDelta(
        vars['--color-canvas']!,
        vars['--color-focal']!,
      );
      assert.ok(
        canvasToFocal >= 0.06 && canvasToFocal <= 0.12,
        `${paletteId} canvas→focal lightness delta ${canvasToFocal} outside 6–12% band`,
      );
    }
  });

  it('applies ambientContrastBias for perceptual density without changing luminance bands', () => {
    const ember = varsForPalette('ember');
    const deepSpace = varsForPalette('deep_space');

    const emberFade = Number(ember['--atmosphere-region-fade-strength']);
    const deepFade = Number(deepSpace['--atmosphere-region-fade-strength']);
    assert.ok(emberFade < deepFade, 'ember should have softer region fades than deep_space');

    const emberVignette = Number(ember['--atmosphere-vignette-strength']);
    const deepVignette = Number(deepSpace['--atmosphere-vignette-strength']);
    assert.ok(emberVignette < deepVignette, 'ember vignette should be softer than deep_space');
  });

  it('boosts identity strength with background tint without breaking reading surface cap', () => {
    const base = varsForPalette('ocean');
    const boosted = varsForPalette('ocean', { tintBoost: true });

    const baseHaze = Number(base['--atmosphere-haze-alpha']);
    const boostedHaze = Number(boosted['--atmosphere-haze-alpha']);
    assert.ok(boostedHaze > baseHaze, 'tint boost should increase haze alpha');

    const neutralFocal = deriveSurfaceRoleCssVariables(
      {
        ...THEME_CONFIGS.dark,
        _derivationPreset: 'dark',
        _paletteId: 'ocean',
      },
      'dark',
    )['--color-focal']!;
    const boostedDrift = hueDeltaDegrees(neutralFocal, boosted['--color-focal']!);
    assert.ok(boostedDrift <= 8, `tint boost focal drift ${boostedDrift}° exceeds 8° from base ocean`);
  });

  it('stacks fantasy transforms on ocean foundation without replacing canvas or focal', () => {
    const oceanOnly = deriveSurfaceRoleCssVariables(
      {
        ...THEME_CONFIGS.dark,
        _derivationPreset: 'dark',
        _paletteId: 'ocean',
      },
      'dark',
    );
    const vars = deriveSurfaceRoleCssVariables(
      {
        ...THEME_CONFIGS.fantasy,
        _derivationPreset: 'fantasy',
        _paletteId: 'ocean',
        _genre: 'fantasy',
        _identityStrength: 1,
      },
      'fantasy',
    );

    assert.equal(vars['--color-focal'], oceanOnly['--color-focal']);
    assert.equal(vars['--color-canvas'], oceanOnly['--color-canvas']);
    assert.equal(vars['--color-prose-foreground'], oceanOnly['--color-prose-foreground']);
    assert.notEqual(
      vars['--color-atmosphere-haze-rgb'],
      deriveSurfaceRoleCssVariables(
        { ...THEME_CONFIGS.fantasy, _derivationPreset: 'fantasy' },
        'fantasy',
      )['--color-atmosphere-haze-rgb'],
    );
    assert.ok(
      Number(vars['--atmosphere-fog-density']) >=
        Number(oceanOnly['--atmosphere-fog-density']),
    );
  });

  it('maps ocean palette to cool_graphite surface bias on dark foundation', () => {
    const input = resolveThemeAtmosphereInput(
      {
        ...THEME_CONFIGS.dark,
        _derivationPreset: 'dark',
        _paletteId: 'ocean',
      },
      'dark',
    );
    assert.equal(input.focalStyle, 'cool_graphite');
    assert.equal(input.ambientContrastBias, 0.2);
  });

  it('exports hexHue helper for drift checks', () => {
    assert.ok(hexHue('#0b0d10') >= 0);
  });

  it('converges structural canvas hex across dark foundation palettes', () => {
    const midnight = varsForPalette('midnight');
    const ember = varsForPalette('ember');
    assert.equal(midnight['--color-canvas'], ember['--color-canvas']);
    assert.equal(midnight['--color-depth-0'], ember['--color-depth-0']);
  });

  it('diverges atmospheric signatures between midnight and ember', () => {
    const midnight = varsForPalette('midnight');
    const ember = varsForPalette('ember');

    assert.notEqual(midnight['--color-edge-light-rgb'], ember['--color-edge-light-rgb']);
    assert.notEqual(midnight['--atmosphere-gradient-behavior'], ember['--atmosphere-gradient-behavior']);
    assert.notEqual(
      midnight['--color-atmosphere-material-shadow-rgb'],
      ember['--color-atmosphere-material-shadow-rgb'],
    );
    assert.ok(Number(midnight['--atmosphere-focal-intensity']) > Number(ember['--atmosphere-focal-intensity']));
    assert.ok(Number(midnight['--atmosphere-periphery-strength']) > Number(ember['--atmosphere-periphery-strength']));
  });

  it('diverges typography signatures without tinting prose body hex', () => {
    const midnight = varsForPalette('midnight');
    const ember = varsForPalette('ember');
    const ocean = varsForPalette('ocean');

    assert.notEqual(midnight['--color-display-foreground'], ember['--color-display-foreground']);
    assert.equal(midnight['--color-prose-foreground'], ember['--color-prose-foreground']);
    assert.notEqual(midnight['--type-prose-line-height'], ocean['--type-prose-line-height']);
    assert.notEqual(midnight['--type-display-tracking'], ember['--type-display-tracking']);
  });

  it('applies composition bias tokens for asymmetric atmosphere', () => {
    const midnight = varsForPalette('midnight');
    assert.equal(midnight['--atmosphere-bias-horizontal'], '-1');
    assert.equal(midnight['--atmosphere-warm-corner'], 'br');
    assert.equal(midnight['--atmosphere-gradient-behavior'], 'periphery_violet');
  });
});
