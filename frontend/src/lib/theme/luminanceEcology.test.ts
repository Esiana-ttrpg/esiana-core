import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isReflectiveEcology,
  resolveLuminanceEcology,
  usesGlowMechanics,
  usesWashMechanics,
} from './luminanceEcology.ts';

describe('resolveLuminanceEcology', () => {
  it('maps dark foundation palettes to emissive atmospheric ecology', () => {
    const ecology = resolveLuminanceEcology('dark', 'midnight');
    assert.equal(ecology.lightingModel, 'emissive');
    assert.equal(ecology.contrastModel, 'void_spike');
    assert.equal(ecology.atmosphereModel, 'volumetric');
    assert.equal(ecology.materialModel, 'lacquered');
    assert.equal(ecology.sidebarEcology, 'atmospheric');
  });

  it('maps light foundation palettes to reflective sunlit ecology', () => {
    const ecology = resolveLuminanceEcology('light', 'arctic');
    assert.equal(ecology.lightingModel, 'reflective');
    assert.equal(ecology.contrastModel, 'paper_recession');
    assert.equal(ecology.atmosphereModel, 'diffused');
    assert.equal(ecology.materialModel, 'fibrous');
    assert.equal(ecology.sidebarEcology, 'sunlit');
  });

  it('returns null sidebar ecology for non-foundation palettes', () => {
    const ecology = resolveLuminanceEcology('light', 'pride');
    assert.equal(ecology.sidebarEcology, null);
    assert.equal(ecology.lightingModel, 'reflective');
  });

  it('exposes glow vs wash mechanic helpers', () => {
    const dark = resolveLuminanceEcology('dark', 'ocean');
    const light = resolveLuminanceEcology('light', 'sunset');
    assert.equal(usesGlowMechanics(dark), true);
    assert.equal(usesWashMechanics(dark), false);
    assert.equal(usesGlowMechanics(light), false);
    assert.equal(usesWashMechanics(light), true);
    assert.equal(isReflectiveEcology(light), true);
  });
});
