import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildHubAmbientTokens,
  isTransDualToneProfile,
} from './hubAmbientTheme.ts';
import { normalizeThemeProfile, type ThemeProfile } from './theme/themeProfile.ts';

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
}

function colorDistance(a: string, b: string): number {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2);
}

describe('hubAmbientTheme', () => {
  const transProfile = normalizeThemeProfile({
    foundation: 'light',
    foundationPalette: 'arctic',
    genre: 'none',
    identity: 'trans',
  });

  const oceanProfile = normalizeThemeProfile({
    foundation: 'dark',
    foundationPalette: 'ocean',
    genre: 'none',
    identity: 'none',
  });

  it('detects trans dual-tone profile', () => {
    assert.equal(isTransDualToneProfile(transProfile), true);
    assert.equal(isTransDualToneProfile(oceanProfile), false);
  });

  it('emits pink atmospheric channel for trans identity', () => {
    const tokens = buildHubAmbientTokens(transProfile) as Record<string, string>;

    assert.equal(tokens['--hub-atmosphere-rgb'], '247, 168, 184');
    assert.equal(tokens['--hub-atmosphere-glow'], 'rgba(247, 168, 184, 0.14)');
    assert.equal(tokens['--hub-narrative-end'], '#F7A8B8');
    assert.equal(tokens['--hub-section-resume'], '#5BCEFA');
  });

  it('retunes trans section choreography toward pink', () => {
    const tokens = buildHubAmbientTokens(transProfile) as Record<string, string>;
    const primary = '#5BCEFA';
    const accent = '#F7A8B8';

    const recentDistToAccent = colorDistance(tokens['--hub-section-recent'], accent);
    const recentDistToPrimary = colorDistance(tokens['--hub-section-recent'], primary);
    assert.ok(recentDistToAccent < recentDistToPrimary);

    const libraryDistToAccent = colorDistance(tokens['--hub-section-library'], accent);
    const libraryDistToPrimary = colorDistance(tokens['--hub-section-library'], primary);
    assert.ok(Math.abs(libraryDistToAccent - libraryDistToPrimary) < 30);
  });

  it('does not emit atmosphere vars for non-trans profiles', () => {
    const tokens = buildHubAmbientTokens(oceanProfile) as Record<string, string>;

    assert.equal(tokens['--hub-atmosphere-rgb'], undefined);
    assert.equal(tokens['--hub-atmosphere-glow'], undefined);
    assert.equal(tokens['--hub-narrative-end'], undefined);
  });

  it('preserves default section blends for non-trans profiles', () => {
    const tokens = buildHubAmbientTokens(oceanProfile) as Record<string, string>;
    assert.equal(tokens['--hub-section-resume'], tokens['--hub-accent']);
    assert.equal(tokens['--hub-section-library'], tokens['--hub-accent']);
  });
});
